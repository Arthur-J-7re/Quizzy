import type { Server } from "socket.io";
import {
    TIMER_EVENTS,
    type TimerHostVerdict,
    type TimerPhase,
    type TimerPlayerState,
    type TimerRanking,
    type TimerState,
} from "../../../shared-types/timer";
import { filterQuestionsByForcedType, resolveDccMode, shuffledChoiceOrder, shuffledPairOrder, verify } from "../../GameFunction/threadHelper";
import logger from "../../utils/logger";
import { ForcedQuestionType, TimerScoringConfig } from "../../../shared-types/scoring";

/** Thème minimal nécessaire à la construction d'un tour. */
export interface TimerThemeInput {
    theme_id: number;
    title: string;
    questions: number[];
}

/** Duo formé en amont (étape TEAM_FORMATION) : les 2 usernames qui le composent. */
export interface TimerTeamInput {
    id: string;
    members: [string, string];
}

/**
 * Configuration résolue d'une partie. `themes` est optionnel : c'est le cas
 * classique (issu du quizz Timer) qui l'utilise. EmissionTimerGame source ses
 * thèmes autrement (cf. `resolvePlayerThemes`) et n'a pas à le fournir ici.
 *
 * `hosted` : quizz "avec présentateur" — `presentatorName` reçoit alors la
 * question complète (avec la bonne réponse) et juge lui-même chaque réponse
 * via `hostJudge`, au lieu d'une vérification automatique côté serveur.
 *
 * `teams` : mode duo (après une étape TEAM_FORMATION) — chaque membre garde
 * son propre thème perso, mais les points de ses 2 tours (un par manche, cf.
 * `buildTeamTurnOrder`) sont crédités à son équipe plutôt qu'à lui.
 */
export interface TimerConfig {
    turnDurationMs: number;
    themes?: TimerThemeInput[];
    hosted?: boolean;
    presentatorName?: string;
    teams?: TimerTeamInput[];
    scoring?: TimerScoringConfig;
    forcedType?: ForcedQuestionType;
}

interface TimerPlayer {
    name: string;
    themeId: number;
    themeTitle: string;
    questions: number[];
    score: number;
    done: boolean;
    teamId?: string;
}

export type QuestionLoader = (ids: number[]) => Promise<any[]>;

export const DEFAULT_SCORING: TimerScoringConfig = {
    correctPoints: 1,
    wrongPoints: 0,
    streakBonus: { everyN: 2, bonusPoints: 1 },
};

function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Moteur du mode Timer : chacun son tour, un décompte personnel (par défaut
 * 100s, configurable sur le quizz) tourne pendant le passage d'un joueur, qui
 * répond aux questions de son thème en enchaînant le plus vite possible.
 *
 * Une mauvaise réponse ne coûte rien d'autre qu'un point manqué : la question
 * est remise à la fin de la file plutôt que d'être écartée, donc un joueur
 * qui épuise son thème avant la fin du temps reboucle sur ses erreurs jusqu'à
 * ce qu'il les trouve, ou que le temps soit écoulé.
 */
export default class TimerGame {
    private phase: TimerPhase = "waiting";
    private players: TimerPlayer[] = [];
    private turnOrder: string[] = [];
    private currentTurnIndex = -1;
    private questionsById = new Map<number, any>();

    /** File de questions du tour en cours (id), consommée par l'avant. */
    private queue: number[] = [];
    private currentQuestionId: number | null = null;
    private currentTurnCorrectCount = 0;
    private currentTurnAnswered = 0;
    private currentTurnPoints = 0;

    private phaseTimer?: NodeJS.Timeout;
    private phaseEndsAt = 0;
    private socketIdResolver: ((name: string) => string | undefined) | null = null;
    private onFinishedCallback: ((ranking: TimerRanking[]) => void) | null = null;

    // --------------------------------------------------------- mode équipe
    /** Indices (dans turnOrder) de manche 1 déjà résolus par un claimTurn. */
    private resolvedTeamStarts = new Set<number>();
    /** Points gagnés par équipe sur cette étape (mode équipe uniquement). */
    private teamScoreDeltas = new Map<string, number>();
    /** Série de bonnes réponses consécutives en cours, par joueur (remise à 0 sur une erreur). */
    private playerStreaks = new Map<string, number>();

    constructor(
        private readonly roomId: string,
        private readonly io: Server,
        private readonly config: TimerConfig,
        private readonly loadQuestions: QuestionLoader
    ) {}

    // ---------------------------------------------------------------- cycle

    public async start(playerNames: string[]): Promise<void> {
        if (this.phase !== "waiting") return;
        if (playerNames.length === 0) {
            this.emitError("Il faut au moins un joueur pour lancer la partie.");
            return;
        }

        if (!this.assignThemes(playerNames)) {
            return; // resolvePlayerThemes a déjà émis l'erreur qui explique le refus.
        }
        await this.preloadQuestions();

        const empty = this.players.filter((p) => p.questions.length === 0);
        if (empty.length > 0) {
            this.emitError(
                `Aucune question exploitable pour : ${empty.map((p) => p.name).join(", ")}.`
            );
            return;
        }

        if (this.config.teams) {
            this.turnOrder = this.buildTeamTurnOrder();
            for (const t of this.config.teams) this.teamScoreDeltas.set(t.id, 0);
        } else {
            this.turnOrder = shuffle([...playerNames]);
        }
        this.currentTurnIndex = -1;
        this.broadcastState();
        this.nextTurn();
    }

    /**
     * Manche 1 puis manche 2, un tour par équipe et par manche (donc 2 tours
     * par joueur au total). L'ordre des équipes est mélangé ; au sein d'une
     * équipe, le membre par défaut de chaque manche n'est qu'un choix
     * provisoire — `claimTurn` permute les 2 manches de ce duo si l'autre
     * membre réclame le tour en premier.
     */
    private buildTeamTurnOrder(): string[] {
        const teams = shuffle([...this.config.teams!]);
        const round1 = teams.map((t) => t.members[0]);
        const round2 = teams.map((t) => t.members[1]);
        return [...round1, ...round2];
    }

    /** Résout un thème par joueur puis peuple `players`. Renvoie false si `resolvePlayerThemes` a refusé. */
    private assignThemes(playerNames: string[]): boolean {
        const resolved = this.resolvePlayerThemes(playerNames);
        if (!resolved) return false;

        this.players = resolved.map(({ name, theme }) => ({
            name,
            themeId: theme.theme_id,
            themeTitle: theme.title,
            questions: [...theme.questions],
            score: 0,
            done: false,
            teamId: this.config.teams?.find((t) => t.members.includes(name))?.id,
        }));
        return true;
    }

    /**
     * Détermine quel thème revient à quel joueur. Comportement par défaut :
     * un thème tiré au hasard dans le vivier du quizz, par joueur.
     *
     * Point d'extension : EmissionTimerGame le redéfinit pour attribuer à
     * chaque joueur encore en lice son thème personnel assigné en début
     * d'émission, au lieu d'un tirage dans un vivier partagé.
     */
    protected resolvePlayerThemes(
        playerNames: string[]
    ): { name: string; theme: TimerThemeInput }[] | null {
        const usableThemes = (this.config.themes ?? []).filter((t) => t.questions.length > 0);
        if (usableThemes.length < playerNames.length) {
            this.emitError(
                `Ce quizz ne propose que ${usableThemes.length} thème(s) jouable(s) pour ${playerNames.length} joueur(s).`
            );
            return null;
        }
        const pool = shuffle([...usableThemes]).slice(0, playerNames.length);
        return playerNames.map((name, i) => ({ name, theme: pool[i] }));
    }

    private async preloadQuestions(): Promise<void> {
        const ids = [...new Set(this.players.flatMap((p) => p.questions))];
        try {
            const questions = await this.loadQuestions(ids);
            for (const question of questions) {
                this.questionsById.set(Number(question.question_id), question);
            }
        } catch (error) {
            logger.error(`[timer ${this.roomId}] chargement des questions impossible`, error);
        }
        // Une question sans contenu exploitable, ou dont le type n'est pas
        // autorisé par le type forcé du quizz, est retirée plutôt que de
        // bloquer un tour au moment où elle sortirait de la file.
        const allowedIds = new Set(
            filterQuestionsByForcedType([...this.questionsById.values()], this.config.forcedType).map((q) =>
                Number(q.question_id)
            )
        );
        for (const player of this.players) {
            player.questions = player.questions.filter((id) => allowedIds.has(id));
        }
    }

    // ----------------------------------------------------------------- tour

    private nextTurn(): void {
        this.clearPhaseTimer();
        const nextIndex = this.findNextPendingIndex();
        if (nextIndex === -1) {
            this.finish();
            return;
        }
        this.currentTurnIndex = nextIndex;

        if (this.isUnresolvedTeamStart(nextIndex)) {
            this.awaitDuoChoice(nextIndex);
            return;
        }
        this.beginTurn();
    }

    private findNextPendingIndex(): number {
        for (let i = 0; i < this.turnOrder.length; i++) {
            const player = this.playerByName(this.turnOrder[i]);
            if (player && !player.done) return i;
        }
        return -1;
    }

    /** Manche 1 (les `teams.length` premiers créneaux) dont le duo n'a pas encore choisi qui commence. */
    private isUnresolvedTeamStart(index: number): boolean {
        return Boolean(this.config.teams) && index < this.config.teams!.length && !this.resolvedTeamStarts.has(index);
    }

    /** Met la partie en pause : les 2 membres du duo attendu peuvent réclamer ce tour via `claimTurn`. */
    private awaitDuoChoice(index: number): void {
        const player = this.playerByName(this.turnOrder[index]);
        const team = this.config.teams?.find((t) => t.id === player?.teamId);
        if (!team) {
            // Ne devrait pas arriver (turnOrder construit à partir des mêmes
            // équipes) : on tente quand même le tour plutôt que de bloquer.
            this.beginTurn();
            return;
        }
        this.phase = "awaitingDuoChoice";
        this.clearPhaseTimer();
        this.broadcastState();
    }

    /** N'importe quel membre du duo attendu peut réclamer le tour de manche 1. */
    public claimTurn(username: string): void {
        if (this.phase !== "awaitingDuoChoice") return;
        const index = this.currentTurnIndex;
        if (!this.isUnresolvedTeamStart(index)) return;

        const teamSize = this.config.teams!.length;
        const partnerIndex = index + teamSize;
        const a = this.turnOrder[index];
        const b = this.turnOrder[partnerIndex];
        if (username !== a && username !== b) return; // pas un membre de ce duo

        if (username === b) {
            // L'autre membre a réclamé le tour en premier : sa manche 2
            // (déjà positionnée) devient sa manche 1, et vice-versa.
            this.turnOrder[index] = b;
            this.turnOrder[partnerIndex] = a;
        }
        this.resolvedTeamStarts.add(index);
        this.beginTurn();
    }

    private beginTurn(): void {
        const player = this.currentPlayer();
        if (!player) return;

        this.queue = shuffle([...player.questions]);
        this.currentQuestionId = null;
        this.currentTurnCorrectCount = 0;
        this.currentTurnAnswered = 0;
        this.currentTurnPoints = 0;
        this.phase = "turn";

        this.io.to(this.roomId).emit(TIMER_EVENTS.turnStart, {
            player: player.name,
            themeTitle: player.themeTitle,
            durationMs: this.config.turnDurationMs,
        });
        this.startPhaseTimer(this.config.turnDurationMs, () => this.endTurn());
        this.broadcastState();
        this.sendNextQuestion();
    }

    private sendNextQuestion(): void {
        const player = this.currentPlayer();
        if (!player) return;

        if (this.queue.length === 0) {
            // Plus aucune question à poser (tout a fini par être trouvé) :
            // inutile d'attendre la fin du chrono pour passer au suivant.
            this.endTurn();
            return;
        }

        const questionId = this.queue.shift()!;
        this.currentQuestionId = questionId;
        const question = this.questionsById.get(questionId);

        // Diffusée à toute la room (autres joueurs en attente + /show) :
        // sanitizeQuestion retire déjà la bonne réponse, rien à protéger.
        this.io.to(this.roomId).emit(TIMER_EVENTS.question, {
            player: player.name,
            question: this.sanitizeQuestion(question),
        });

        // Le présentateur voit la question complète (avec la bonne réponse) :
        // c'est lui qui juge, pas le serveur.
        if (this.config.hosted && this.config.presentatorName) {
            this.emitTo(this.config.presentatorName, TIMER_EVENTS.hostQuestion, {
                player: player.name,
                question,
            });
        }
    }

    /**
     * Réponse du joueur actif à la question en cours. En mode hébergé (quizz
     * "avec présentateur"), le joueur répond à voix haute : ce que ce champ
     * contient n'est que transmis au présentateur à titre indicatif, il ne
     * compte jamais comme réponse — seul `hostJudge` tranche.
     */
    public answer(username: string, given: unknown): void {
        if (this.phase !== "turn") return;
        const player = this.currentPlayer();
        if (!player || player.name !== username) return;
        if (this.currentQuestionId === null) return;

        if (this.config.hosted) {
            if (this.config.presentatorName) {
                this.emitTo(this.config.presentatorName, TIMER_EVENTS.hostQuestion, {
                    player: player.name,
                    question: this.questionsById.get(this.currentQuestionId),
                    givenAnswer: given,
                });
            }
            return;
        }

        const questionId = this.currentQuestionId;
        const question = this.questionsById.get(questionId);
        let correct = false;
        try {
            correct = Boolean(verify(username, question, this.enforceDccMode(question, given)));
        } catch (error) {
            logger.error(`[timer ${this.roomId}] vérification de réponse impossible`, error);
        }

        this.resolveAnswer(correct, given);
    }

    /**
     * Verdict manuel du présentateur sur la réponse en cours (quizz hébergé).
     * "passe la question" est traité comme une mauvaise réponse : aucun point,
     * remise en fin de file — seul le libellé diffère côté présentateur.
     */
    public hostJudge(presentatorUsername: string, verdict: TimerHostVerdict): void {
        if (!this.config.hosted || this.config.presentatorName !== presentatorUsername) return;
        if (this.phase !== "turn" || this.currentQuestionId === null) return;

        this.resolveAnswer(verdict === "correct", undefined);
    }

    /** Score, remise en file si besoin, et diffusion du résultat — partagé entre validation auto et jugement présentateur. */
    private resolveAnswer(correct: boolean, givenAnswer: unknown): void {
        const player = this.currentPlayer();
        if (!player || this.currentQuestionId === null) return;

        const questionId = this.currentQuestionId;
        this.currentQuestionId = null;
        this.currentTurnAnswered++;
        const scoring = this.config.scoring ?? DEFAULT_SCORING;
        let points = correct ? scoring.correctPoints : scoring.wrongPoints;
        if (correct) {
            const streak = (this.playerStreaks.get(player.name) ?? 0) + 1;
            this.playerStreaks.set(player.name, streak);
            if (streak % scoring.streakBonus.everyN === 0) {
                points += scoring.streakBonus.bonusPoints;
            }
            // Score individuel gardé à titre informatif même en mode équipe ;
            // c'est le score d'équipe (ci-dessous) qui compte pour la suite.
            player.score += points;
            this.currentTurnCorrectCount++;
            this.currentTurnPoints += points;
            if (player.teamId) {
                this.teamScoreDeltas.set(player.teamId, (this.teamScoreDeltas.get(player.teamId) ?? 0) + points);
            }
        } else {
            this.playerStreaks.set(player.name, 0);
            // Remise en fin de file plutôt qu'écartée : le joueur reboucle
            // sur ses erreurs s'il a épuisé le reste avant la fin du temps.
            this.queue.push(questionId);
        }

        this.io.to(this.roomId).emit(TIMER_EVENTS.result, {
            player: player.name,
            correct,
            pointsEarned: points,
            givenAnswer,
        });
        this.broadcastState();

        this.sendNextQuestion();
    }

    private endTurn(): void {
        if (this.phase !== "turn") return;
        this.clearPhaseTimer();
        const player = this.currentPlayer();
        if (!player) return;

        player.done = true;
        this.phase = "turnEnd";
        this.currentQuestionId = null;

        this.io.to(this.roomId).emit(TIMER_EVENTS.turnEnd, {
            player: player.name,
            correctCount: this.currentTurnCorrectCount,
            questionsAnswered: this.currentTurnAnswered,
            pointsEarned: this.currentTurnPoints,
        });
        this.broadcastState();

        this.nextTurn();
    }

    private finish(): void {
        this.clearPhaseTimer();
        this.phase = "finished";
        // En mode équipe, le classement (et donc ce que Thread.finalizeStep
        // crédite) porte sur les ids d'équipe plutôt que sur les joueurs.
        const ranking: TimerRanking[] = this.config.teams
            ? [...this.teamScoreDeltas.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([id, score], i) => ({ rank: i + 1, name: id, score }))
            : [...this.players]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
        this.broadcastState();
        this.io.to(this.roomId).emit(TIMER_EVENTS.finished, { ranking });
        logger.debug(`[timer ${this.roomId}] partie terminée`);
        this.onFinishedCallback?.(ranking);
    }

    /** Permet à l'orchestrateur (Thread) de savoir quand passer à l'étape suivante. */
    public onFinished(callback: (ranking: TimerRanking[]) => void): void {
        this.onFinishedCallback = callback;
    }

    public dispose(): void {
        this.clearPhaseTimer();
    }

    // ------------------------------------------------------------- diffusion

    private buildState(): TimerState {
        const players: TimerPlayerState[] = this.players.map((p) => ({
            name: p.name,
            themeTitle: p.themeTitle,
            score: p.score,
            done: p.done,
        }));

        let awaitingDuoMembers: [string, string] | undefined;
        if (this.phase === "awaitingDuoChoice") {
            const player = this.playerByName(this.turnOrder[this.currentTurnIndex]);
            const team = this.config.teams?.find((t) => t.id === player?.teamId);
            if (team) awaitingDuoMembers = team.members;
        }

        return {
            phase: this.phase,
            players,
            currentPlayer: this.phase === "turn" ? this.currentPlayer()?.name ?? null : null,
            currentTurnCorrectCount: this.currentTurnCorrectCount,
            remainingMs: this.phaseEndsAt > 0 ? Math.max(0, this.phaseEndsAt - Date.now()) : undefined,
            awaitingDuoMembers,
        };
    }

    public broadcastState(): void {
        this.io.to(this.roomId).emit(TIMER_EVENTS.state, this.buildState());
    }

    /**
     * Renvoie l'état public (+ question en cours, sans la bonne réponse) à un
     * spectateur `/show` qui rejoint après le début du tour : sans ça, il ne
     * voit rien tant qu'aucune diffusion (nouvelle question, réponse...) ne
     * survient.
     */
    public sendPublicStateTo(socketId: string): void {
        this.io.to(socketId).emit(TIMER_EVENTS.state, this.buildState());
        if (this.phase === "turn" && this.currentQuestionId !== null) {
            const player = this.currentPlayer();
            const question = this.questionsById.get(this.currentQuestionId);
            if (player && question) {
                this.io.to(socketId).emit(TIMER_EVENTS.question, {
                    player: player.name,
                    question: this.sanitizeQuestion(question),
                });
            }
        }
    }

    /** Renvoie l'état courant à un seul joueur (reconnexion, arrivée tardive). */
    public sendStateTo(username: string): void {
        this.emitTo(username, TIMER_EVENTS.state, this.buildState());

        // Le présentateur qui se reconnecte en pleine question doit récupérer
        // sa vue (question + bonne réponse) : sans ça, plus personne ne peut
        // faire avancer la partie tant qu'un nouveau tour ne démarre pas.
        if (this.config.hosted && this.config.presentatorName === username
            && this.phase === "turn" && this.currentQuestionId !== null) {
            const player = this.currentPlayer();
            if (player) {
                this.emitTo(username, TIMER_EVENTS.hostQuestion, {
                    player: player.name,
                    question: this.questionsById.get(this.currentQuestionId),
                });
            }
        }
    }

    /** Retire la bonne réponse avant d'envoyer la question au joueur actif. */
    private sanitizeQuestion(question: any): any {
        const { answer, answers, truth, ...safe } = question?.toObject?.() ?? question ?? {};
        if (safe.mode === "DCC") {
            safe.forcedDccMode = resolveDccMode(`${this.roomId}:${safe.question_id}:dccmode`, this.config.forcedType);
        }
        if (safe.mode === "QCM" || safe.mode === "DCC") {
            safe.choiceOrder = shuffledChoiceOrder(`${this.roomId}:${safe.question_id}`);
        }
        if (safe.mode === "DCC") {
            const duoPair = shuffledPairOrder(`${this.roomId}:${safe.question_id}:duo`, answer, safe.duo);
            safe.duoChoices = duoPair.map((id: number) => ({ id, value: safe.carre?.[`ans${id}`] }));
        }
        return safe;
    }

    /** Le serveur impose le sous-mode DCC (Carré/Cash, jamais laissé au choix du joueur). */
    private enforceDccMode(question: any, given: unknown): unknown {
        if (question?.mode !== "DCC" || !given || typeof given !== "object") return given;
        const forcedDccMode = resolveDccMode(`${this.roomId}:${question.question_id}:dccmode`, this.config.forcedType);
        return forcedDccMode ? { ...given, mode: forcedDccMode } : given;
    }

    private currentPlayer(): TimerPlayer | null {
        if (this.currentTurnIndex < 0 || this.currentTurnIndex >= this.turnOrder.length) return null;
        return this.playerByName(this.turnOrder[this.currentTurnIndex]);
    }

    private playerByName(name: string): TimerPlayer | null {
        return this.players.find((p) => p.name === name) ?? null;
    }

    protected emitError(message: string): void {
        this.io.to(this.roomId).emit(TIMER_EVENTS.error, { message });
    }

    private emitTo(username: string, event: string, payload: unknown): void {
        const socketId = this.socketIdResolver?.(username);
        if (socketId) {
            this.io.to(socketId).emit(event, payload);
        }
    }

    /** Injecté par la Room, qui seule connaît la table joueur → socket. */
    public setSocketIdResolver(resolver: (name: string) => string | undefined): void {
        this.socketIdResolver = resolver;
    }

    // --------------------------------------------------------------- timers

    private startPhaseTimer(durationMs: number, onEnd: () => void): void {
        this.clearPhaseTimer();
        this.phaseEndsAt = Date.now() + durationMs;
        this.phaseTimer = setTimeout(() => {
            this.phaseEndsAt = 0;
            onEnd();
        }, durationMs);
    }

    private clearPhaseTimer(): void {
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = undefined;
        }
        this.phaseEndsAt = 0;
    }

    public getPhase(): TimerPhase {
        return this.phase;
    }
}
