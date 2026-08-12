import type { Server } from "socket.io";
import {
    PICKBAN_EVENTS,
    type PBThemeCell,
    type PickBanDraftAction,
    type PickBanPhase,
    type PickBanPlayerState,
    type PickBanRanking,
    type PickBanState,
} from "../../../shared-types/pickban";
import { filterQuestionsByForcedType, resolveDccMode, shuffledChoiceOrder, shuffledPairOrder, verify } from "../../GameFunction/threadHelper";
import logger from "../../utils/logger";
import { ForcedQuestionType, PickBanScoringConfig } from "../../../shared-types/scoring";

/** Duo formé en amont (étape TEAM_FORMATION) : les 2 usernames qui le composent. */
export interface PickBanTeamInput {
    id: string;
    members: [string, string];
}

/**
 * `teams` : mode duo — n'importe quel membre agit pour son équipe (draft comme
 * réponses) ; le "joueur" vu par le moteur (tour, thèmes possédés, score) est
 * alors l'id d'équipe plutôt qu'un username individuel.
 */
export interface PickBanConfig {
    columns: number;
    draftTurnDurationMs: number;
    answerDurationMs: number;
    themes: { theme_id: number; title: string; img?: string; questions: number[] }[];
    teams?: PickBanTeamInput[];
    /** Le créateur du salon est présentateur : lui seul voit les vrais titres des thèmes. */
    hosted?: boolean;
    presentatorName?: string;
    scoring?: PickBanScoringConfig;
    forcedType?: ForcedQuestionType;
    /** Manche "Ban" présente dans le roulement Pick → Ban → Give. Défaut : true. */
    allowBan?: boolean;
    /**
     * Le créateur du salon est arbitre : insère une courte pause "reveal"
     * après chaque question (au lieu d'enchaîner immédiatement) pour lui
     * laisser le temps d'inverser un verdict de réponse libre. Sans arbitre,
     * la partie garde son rythme actuel (enchaînement immédiat).
     */
    hasReferee?: boolean;
    refereeName?: string;
}

interface ServerTheme {
    theme_id: number;
    title: string;
    img?: string;
    questionIds: number[];
    status: "available" | "owned" | "banned";
    owner: string | null;
    played: boolean;
}

interface PBPlayer {
    name: string;
    score: number;
}

export type QuestionLoader = (ids: number[]) => Promise<any[]>;

export const DEFAULT_SCORING: PickBanScoringConfig = {
    correctPoints: 1,
    wrongPoints: 0,
    dccPoints: { cash: 5, carre: 3, duo: 1 },
};

/** Pause "reveal" après une question, uniquement quand le salon a un arbitre. */
const REVEAL_DURATION_MS = 4000;

function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Moteur du mode Pick & Ban : draft d'un vivier de thèmes par manches
 * complètes — tout le monde Pick (dans l'ordre de passage), puis tout le
 * monde Ban si activé, puis tout le monde Give (une seule manche, la cible
 * imposée par un roulement équitable) — et on recommence tant qu'il reste des
 * thèmes disponibles. Ensuite, manche de questions où chacun choisit un de
 * ses thèmes et répond à toutes ses questions pour marquer des points.
 */
export default class PickBanGame {
    private phase: PickBanPhase = "waiting";
    private themes: ServerTheme[] = [];
    private players: PBPlayer[] = [];
    private turnOrder: string[] = [];
    private currentTurnIndex = 0;
    private questionsById = new Map<number, any>();

    /** Action imposée pour la manche de draft en cours (cf. classe). */
    private draftAction: PickBanDraftAction = "pick";
    /** Décalage (1..N-1) appliqué au roulement de la manche "give" en cours. */
    private currentGiveOffset = 1;
    /** Nombre de manches "give" déjà passées, pour faire avancer le décalage à chacune. */
    private giveRoundCount = 0;

    /** Thème et index de question en cours de résolution, hors phase "answering". */
    private pendingTheme: ServerTheme | null = null;
    private pendingQuestionIndex = 0;
    private themeCorrectCount = 0;
    private themePoints = 0;
    /** Dernière réponse résolue, le temps de la pause "reveal" (arbitre uniquement) — sert à `overrideAnswer`. */
    private lastResolved: { username: string; given: unknown; correct: boolean; points: number } | null = null;

    private phaseTimer?: NodeJS.Timeout;
    private phaseEndsAt = 0;
    private socketIdResolver: ((name: string) => string | undefined) | null = null;

    constructor(
        private readonly roomId: string,
        private readonly io: Server,
        private readonly config: PickBanConfig,
        private readonly loadQuestions: QuestionLoader
    ) {}

    // ---------------------------------------------------------------- cycle

    public async start(playerNames: string[]): Promise<void> {
        if (this.phase !== "waiting") return;
        if (playerNames.length < 2) {
            this.emitError("Il faut au moins 2 joueurs pour une partie Pick & Ban.");
            return;
        }

        // Mode équipe : le moteur joue avec les ids d'équipe comme "joueurs"
        // (tour, thèmes possédés, score) — n'importe quel membre peut agir
        // pour son équipe (cf. actorIdentity).
        const effectiveNames = this.config.teams
            ? [...new Set(playerNames.map((n) => this.teamOf(n) ?? n))]
            : playerNames;

        const usableThemes = this.config.themes.filter((t) => t.questions.length > 0);
        if (usableThemes.length < effectiveNames.length) {
            this.emitError(
                `Ce quizz ne propose que ${usableThemes.length} thème(s) jouable(s) pour ${effectiveNames.length} joueur(s).`
            );
            return;
        }

        this.players = effectiveNames.map((name) => ({ name, score: 0 }));
        // Disposition des thèmes mélangée une fois pour toute la partie :
        // l'ordre vit dans this.themes (état serveur unique, jamais recalculé),
        // donc tous les joueurs de la room voient la même disposition.
        this.themes = shuffle([...usableThemes]).map((t) => ({
            theme_id: t.theme_id,
            title: t.title,
            img: t.img,
            questionIds: t.questions,
            status: "available",
            owner: null,
            played: false,
        }));

        await this.preloadQuestions();

        this.turnOrder = shuffle([...effectiveNames]);
        this.currentTurnIndex = 0;
        this.draftAction = "pick";
        this.currentGiveOffset = 1;
        this.giveRoundCount = 0;
        this.phase = "draft";
        this.broadcastState();
        this.startDraftTimer();
        logger.debug(`[pickban ${this.roomId}] draft lancée (${this.themes.length} thèmes)`);
    }

    /** Id d'équipe du joueur, si des équipes sont formées (sinon undefined). */
    private teamOf(username: string): string | undefined {
        return this.config.teams?.find((t) => t.members.includes(username))?.id;
    }

    /** "Qui" agit vraiment : l'équipe en mode duo, sinon le joueur lui-même. */
    private actorIdentity(username: string): string {
        return this.teamOf(username) ?? username;
    }

    private async preloadQuestions(): Promise<void> {
        const ids = [...new Set(this.themes.flatMap((t) => t.questionIds))];
        try {
            const questions = await this.loadQuestions(ids);
            for (const q of questions) {
                this.questionsById.set(Number(q.question_id), q);
            }
        } catch (error) {
            logger.error(`[pickban ${this.roomId}] chargement des questions impossible`, error);
        }
        // Un thème dont plus aucune question n'est exploitable (ou dont le type
        // n'est pas autorisé par le type forcé du quizz) est banni d'office
        // plutôt que de bloquer la partie quand il sera choisi.
        const allowedIds = new Set(
            filterQuestionsByForcedType([...this.questionsById.values()], this.config.forcedType).map((q) =>
                Number(q.question_id)
            )
        );
        for (const theme of this.themes) {
            theme.questionIds = theme.questionIds.filter((id) => allowedIds.has(id));
            if (theme.questionIds.length === 0) {
                theme.status = "banned";
            }
        }
    }

    // ---------------------------------------------------------------- draft

    private currentPlayerName(): string | null {
        if (this.turnOrder.length === 0) return null;
        return this.turnOrder[this.currentTurnIndex % this.turnOrder.length];
    }

    private draftableThemes(): ServerTheme[] {
        return this.themes.filter((t) => t.status === "available");
    }

    public draftPick(username: string, theme_id: number): void {
        this.applyDraftAction(username, theme_id, "pick", () => {
            const theme = this.findAvailableTheme(theme_id, username);
            if (!theme) return;
            theme.status = "owned";
            theme.owner = this.actorIdentity(username);
        });
    }

    /** `target` n'est plus fourni par le client : la cible est imposée par le roulement (cf. forcedGiveTarget). */
    public draftGive(username: string, theme_id: number): void {
        const target = this.forcedGiveTarget();
        if (!target) {
            this.emitErrorTo(username, "Aucune cible de don disponible.");
            return;
        }
        this.applyDraftAction(username, theme_id, "give", () => {
            const theme = this.findAvailableTheme(theme_id, username);
            if (!theme) return;
            theme.status = "owned";
            theme.owner = target;
        });
    }

    public draftBan(username: string, theme_id: number): void {
        this.applyDraftAction(username, theme_id, "ban", () => {
            const theme = this.findAvailableTheme(theme_id, username);
            if (!theme) return;
            theme.status = "banned";
            theme.owner = null;
        });
    }

    /**
     * Destinataire imposé de la manche "give" en cours pour le joueur actif :
     * décalage de `currentGiveOffset` positions dans `turnOrder` (jamais 0,
     * donc jamais soi-même) — cf. doc de classe pour le roulement complet.
     */
    private forcedGiveTarget(): string | null {
        if (this.turnOrder.length < 2) return null;
        const currentIndex = this.currentTurnIndex % this.turnOrder.length;
        const targetIndex = (currentIndex + this.currentGiveOffset) % this.turnOrder.length;
        return this.turnOrder[targetIndex];
    }

    private findAvailableTheme(theme_id: number, username: string): ServerTheme | null {
        const theme = this.themes.find((t) => t.theme_id === theme_id);
        if (!theme) {
            this.emitErrorTo(username, "Ce thème n'existe pas.");
            return null;
        }
        if (theme.status !== "available") {
            this.emitErrorTo(username, "Ce thème n'est plus disponible.");
            return null;
        }
        return theme;
    }

    private applyDraftAction(
        username: string,
        theme_id: number,
        expectedAction: PickBanDraftAction,
        action: () => void
    ): void {
        if (this.phase !== "draft") {
            this.emitErrorTo(username, "La draft est terminée.");
            return;
        }
        if (this.actorIdentity(username) !== this.currentPlayerName()) {
            this.emitErrorTo(username, "Ce n'est pas votre tour.");
            return;
        }
        if (this.draftAction !== expectedAction) {
            this.emitErrorTo(username, "Ce n'est pas le moment de faire cette action.");
            return;
        }
        const before = this.draftableThemes().length;
        action();
        const acted = this.draftableThemes().length < before;
        if (!acted) return; // l'action a été refusée par emitErrorTo, rien à faire de plus

        this.advanceDraft();
    }

    /**
     * Une action consomme toujours un thème "available" (pick/ban/give) :
     * s'il n'en reste plus, la draft est définitivement terminée, quelle que
     * soit la manche en cours (rien d'autre à picker/bannir/donner). Sinon on
     * avance d'un joueur ; une fois tout le monde passé pour la manche en
     * cours (tour complet de `turnOrder`), on bascule sur la manche suivante
     * (Pick → Ban si activé → Give → Pick...), en faisant avancer le
     * décalage du roulement à chaque nouvelle manche "give".
     */
    private advanceDraft(): void {
        if (this.draftableThemes().length === 0) {
            this.beginPlaying();
            return;
        }
        this.currentTurnIndex++;
        if (this.currentTurnIndex >= this.turnOrder.length) {
            this.currentTurnIndex = 0;
            this.draftAction = this.nextDraftAction(this.draftAction);
            if (this.draftAction === "give") {
                this.currentGiveOffset = (this.giveRoundCount % Math.max(1, this.turnOrder.length - 1)) + 1;
                this.giveRoundCount++;
            }
        }
        this.broadcastState();
        this.startDraftTimer();
    }

    private nextDraftAction(current: PickBanDraftAction): PickBanDraftAction {
        if (current === "pick") return this.config.allowBan === false ? "give" : "ban";
        if (current === "ban") return "give";
        return "pick";
    }

    private startDraftTimer(): void {
        this.startPhaseTimer(this.config.draftTurnDurationMs, () => {
            // Personne n'agit : on applique l'action imposée de la manche en
            // cours sur le premier thème disponible, pour que la partie ne
            // reste jamais bloquée.
            const theme = this.draftableThemes()[0];
            const actor = this.currentPlayerName();
            if (theme && actor) {
                if (this.draftAction === "pick") {
                    theme.status = "owned";
                    theme.owner = actor;
                } else if (this.draftAction === "ban") {
                    theme.status = "banned";
                    theme.owner = null;
                } else {
                    const target = this.forcedGiveTarget();
                    theme.status = target ? "owned" : "banned";
                    theme.owner = target;
                }
            }
            this.advanceDraft();
        });
    }

    // --------------------------------------------------------------- jeu

    private beginPlaying(): void {
        this.phase = "playing";
        this.currentTurnIndex = 0;
        if (!this.advanceToNextEligiblePlayer()) {
            this.finish();
            return;
        }
        this.broadcastState();
    }

    /** Fait avancer le tour jusqu'à trouver un joueur avec un thème à jouer. */
    private advanceToNextEligiblePlayer(): boolean {
        for (let i = 0; i < this.turnOrder.length; i++) {
            const name = this.turnOrder[this.currentTurnIndex % this.turnOrder.length];
            if (this.ownedUnplayedThemes(name).length > 0) {
                return true;
            }
            this.currentTurnIndex++;
        }
        return false;
    }

    private ownedUnplayedThemes(name: string): ServerTheme[] {
        return this.themes.filter((t) => t.owner === name && t.status === "owned" && !t.played);
    }

    public choose(username: string, theme_id: number): void {
        if (this.phase !== "playing") {
            this.emitErrorTo(username, "Ce n'est pas le moment de choisir un thème.");
            return;
        }
        const identity = this.actorIdentity(username);
        if (identity !== this.currentPlayerName()) {
            this.emitErrorTo(username, "Ce n'est pas votre tour.");
            return;
        }
        const theme = this.themes.find((t) => t.theme_id === theme_id);
        if (!theme || theme.owner !== identity || theme.played) {
            this.emitErrorTo(username, "Vous ne pouvez pas choisir ce thème.");
            return;
        }

        this.pendingTheme = theme;
        this.pendingQuestionIndex = 0;
        this.themeCorrectCount = 0;
        this.themePoints = 0;
        this.phase = "answering";
        this.broadcastState();
        this.sendCurrentQuestion();
    }

    private sendCurrentQuestion(): void {
        const theme = this.pendingTheme;
        if (!theme) return;
        const player = this.currentPlayerName();
        if (!player) return;

        const questionId = theme.questionIds[this.pendingQuestionIndex];
        const question = this.questionsById.get(questionId);
        if (!question) {
            // Question chargée en amont mais introuvable au moment T : on saute
            // plutôt que de bloquer le thème.
            this.advanceQuestionOrFinishTheme(false);
            return;
        }

        const basePayload = {
            theme_id: theme.theme_id,
            player,
            questionIndex: this.pendingQuestionIndex,
            questionsTotal: theme.questionIds.length,
            durationMs: this.config.answerDurationMs,
        };
        this.io.to(this.roomId).emit(PICKBAN_EVENTS.question, basePayload);
        this.emitTo(player, PICKBAN_EVENTS.question, {
            ...basePayload,
            question: this.sanitizeQuestion(question),
        });

        this.startPhaseTimer(this.config.answerDurationMs, () => this.resolveAnswer(player, null, false));
    }

    public answer(username: string, given: unknown): void {
        if (this.phase !== "answering" || !this.pendingTheme) return;
        if (this.actorIdentity(username) !== this.currentPlayerName()) return;

        const questionId = this.pendingTheme.questionIds[this.pendingQuestionIndex];
        const question = this.questionsById.get(questionId);
        const effectiveGiven = this.enforceDccMode(question, given);
        let correct = false;
        try {
            correct = Boolean(verify(username, question, effectiveGiven));
        } catch (error) {
            logger.error(`[pickban ${this.roomId}] vérification de réponse impossible`, error);
        }
        this.resolveAnswer(username, effectiveGiven, correct);
    }

    private resolveAnswer(username: string, given: unknown, correct: boolean): void {
        const theme = this.pendingTheme;
        if (!theme) return;
        this.clearPhaseTimer();

        const scoring = this.config.scoring ?? DEFAULT_SCORING;
        const question = this.questionsById.get(theme.questionIds[this.pendingQuestionIndex]);
        const points = correct ? this.pointsFor(question, given, scoring) : scoring.wrongPoints;
        if (correct) this.themeCorrectCount++;
        this.themePoints += points;

        this.io.to(this.roomId).emit(PICKBAN_EVENTS.result, {
            theme_id: theme.theme_id,
            player: username,
            correct,
            givenAnswer: given,
            pointsEarned: points,
            questionIndex: this.pendingQuestionIndex,
            questionsTotal: theme.questionIds.length,
            question,
        });

        // Sans arbitre : comportement inchangé, on enchaîne aussitôt. Avec un
        // arbitre : courte pause pour lui laisser le temps de corriger une
        // réponse libre (cf. overrideAnswer) avant de reprendre.
        if (this.config.hasReferee) {
            this.lastResolved = { username, given, correct, points };
            this.phase = "reveal";
            this.broadcastState();
            this.startPhaseTimer(REVEAL_DURATION_MS, () => {
                this.phase = "answering";
                this.advanceQuestionOrFinishTheme(true);
            });
        } else {
            this.advanceQuestionOrFinishTheme(true);
        }
    }

    /**
     * Réservé à l'arbitre : inverse le verdict d'un joueur sur une réponse
     * libre (FREE, ou DCC joué en Cash) pendant la pause "reveal" qui suit
     * chaque question.
     */
    public overrideAnswer(username: string, correct: boolean): void {
        if (!this.config.hasReferee || this.phase !== "reveal" || !this.lastResolved) return;
        if (this.lastResolved.username !== username) return;
        if (this.lastResolved.correct === correct) return;

        const theme = this.pendingTheme;
        if (!theme) return;
        const question = this.questionsById.get(theme.questionIds[this.pendingQuestionIndex]);
        if (!question) return;

        const given = this.lastResolved.given;
        const givenMode = given && typeof given === "object" ? (given as any).mode : undefined;
        const isFreeAnswer = question.mode === "FREE" || (question.mode === "DCC" && givenMode === "CASH");
        if (!isFreeAnswer) return;

        const scoring = this.config.scoring ?? DEFAULT_SCORING;
        const newPoints = correct ? this.pointsFor(question, given, scoring) : scoring.wrongPoints;
        this.themePoints += newPoints - this.lastResolved.points;
        this.themeCorrectCount += correct ? 1 : -1;
        this.lastResolved = { ...this.lastResolved, correct, points: newPoints };

        this.io.to(this.roomId).emit(PICKBAN_EVENTS.result, {
            theme_id: theme.theme_id,
            player: username,
            correct,
            givenAnswer: given,
            pointsEarned: newPoints,
            questionIndex: this.pendingQuestionIndex,
            questionsTotal: theme.questionIds.length,
            question,
        });
        this.broadcastState();
    }

    private advanceQuestionOrFinishTheme(alreadyResolved: boolean): void {
        const theme = this.pendingTheme;
        if (!theme) return;

        if (!alreadyResolved) {
            // Question ignorée (introuvable) : ni bonne ni mauvaise, on avance.
        }

        this.pendingQuestionIndex++;
        if (this.pendingQuestionIndex < theme.questionIds.length) {
            this.sendCurrentQuestion();
            return;
        }

        this.finishTheme();
    }

    private finishTheme(): void {
        const theme = this.pendingTheme;
        const player = this.currentPlayerName();
        if (!theme || !player) return;

        theme.played = true;
        const scored = this.players.find((p) => p.name === player);
        if (scored) scored.score += this.themePoints;

        this.io.to(this.roomId).emit(PICKBAN_EVENTS.themeComplete, {
            theme_id: theme.theme_id,
            player,
            correctCount: this.themeCorrectCount,
            totalQuestions: theme.questionIds.length,
            pointsEarned: this.themePoints,
        });

        this.pendingTheme = null;
        this.phase = "playing";
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;

        if (!this.advanceToNextEligiblePlayer()) {
            this.finish();
            return;
        }
        this.broadcastState();
    }

    private finish(): void {
        this.clearPhaseTimer();
        this.phase = "finished";
        const ranking: PickBanRanking[] = [...this.players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
        this.broadcastState();
        this.io.to(this.roomId).emit(PICKBAN_EVENTS.finished, { ranking });
        logger.debug(`[pickban ${this.roomId}] partie terminée`);
        this.onFinishedCallback?.(ranking);
    }

    private onFinishedCallback: ((ranking: PickBanRanking[]) => void) | null = null;

    /** Permet à l'orchestrateur (Thread) de savoir quand passer à l'étape suivante. */
    public onFinished(callback: (ranking: PickBanRanking[]) => void): void {
        this.onFinishedCallback = callback;
    }

    public dispose(): void {
        this.clearPhaseTimer();
    }

    // ------------------------------------------------------------- diffusion

    /**
     * `forPresentator` révèle les vrais titres ; sinon (joueurs, spectateurs)
     * chaque thème n'affiche qu'un placeholder — c'est aussi un jeu de
     * déduction, le nom ne se découvre jamais autrement que par le MJ.
     */
    private buildState(forPresentator: boolean): PickBanState {
        const themes: PBThemeCell[] = this.themes.map((t, index) => ({
            theme_id: t.theme_id,
            title: forPresentator ? t.title : `Thème ${index + 1}`,
            img: t.img,
            questionCount: t.questionIds.length,
            status: t.status,
            owner: t.owner,
            played: t.played,
        }));

        const players: PickBanPlayerState[] = this.players.map((p) => ({
            name: p.name,
            score: p.score,
            ownedThemeIds: this.themes.filter((t) => t.owner === p.name).map((t) => t.theme_id),
        }));

        return {
            phase: this.phase,
            columns: this.config.columns,
            themes,
            players,
            currentPlayer:
                this.phase === "draft" || this.phase === "playing" || this.phase === "answering" || this.phase === "reveal"
                    ? this.currentPlayerName()
                    : null,
            draftAction: this.phase === "draft" ? this.draftAction : undefined,
            forcedGiveTarget: this.phase === "draft" && this.draftAction === "give" ? this.forcedGiveTarget() : undefined,
            remainingMs: this.phaseEndsAt > 0 ? Math.max(0, this.phaseEndsAt - Date.now()) : undefined,
        };
    }

    public broadcastState(): void {
        this.io.to(this.roomId).emit(PICKBAN_EVENTS.state, this.buildState(false));
        if (this.config.hosted && this.config.presentatorName) {
            this.emitTo(this.config.presentatorName, PICKBAN_EVENTS.state, this.buildState(true));
        }
    }

    public sendStateTo(username: string): void {
        const forPresentator = Boolean(this.config.hosted && this.config.presentatorName === username);
        this.emitTo(username, PICKBAN_EVENTS.state, this.buildState(forPresentator));
    }

    /** Renvoie l'état public (jamais celui du présentateur) à un spectateur `/show`. */
    public sendPublicStateTo(socketId: string): void {
        this.io.to(socketId).emit(PICKBAN_EVENTS.state, this.buildState(false));
    }

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

    /** Bonne réponse à une question DCC : la valeur dépend du sous-mode joué (Cash/Carré/Duo). */
    private pointsFor(question: any, given: unknown, scoring: PickBanScoringConfig): number {
        if (question?.mode !== "DCC") return scoring.correctPoints;
        const mode = given && typeof given === "object" ? (given as any).mode : undefined;
        switch (mode) {
            case "CASH":
                return scoring.dccPoints.cash;
            case "CARRE":
                return scoring.dccPoints.carre;
            case "DUO":
                return scoring.dccPoints.duo;
            default:
                return scoring.correctPoints;
        }
    }

    private emitError(message: string): void {
        this.io.to(this.roomId).emit(PICKBAN_EVENTS.error, { message });
    }

    private emitErrorTo(username: string, message: string): void {
        this.emitTo(username, PICKBAN_EVENTS.error, { message });
    }

    /**
     * `identity` est soit un username (mode individuel, ou appelé directement
     * avec un username comme `sendStateTo`), soit un id d'équipe (mode duo,
     * `currentPlayerName()`) — auquel cas les 2 membres reçoivent l'envoi :
     * n'importe lequel des deux doit pouvoir voir la question complète.
     */
    private emitTo(identity: string, event: string, payload: unknown): void {
        const team = this.config.teams?.find((t) => t.id === identity);
        const targets = team ? team.members : [identity];
        for (const name of targets) {
            const socketId = this.socketIdResolver?.(name);
            if (socketId) {
                this.io.to(socketId).emit(event, payload);
            }
        }
    }

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

    public getPhase(): PickBanPhase {
        return this.phase;
    }
}
