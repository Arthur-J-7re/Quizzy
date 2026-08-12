import type { Server } from "socket.io";
import {
    POINTS_EVENTS,
    type PointsPhase,
    type PointsPlayerState,
    type PointsQuestionResult,
    type PointsRanking,
    type PointsState,
} from "../../../shared-types/points";
import { resolveDccMode, shuffledChoiceOrder, shuffledPairOrder, verify } from "../../GameFunction/threadHelper";
import logger from "../../utils/logger";
import { BaseScoringConfig, DEFAULT_DCC_POINTS, ForcedQuestionType, pointsForLevel } from "../../../shared-types/scoring";

/**
 * Tire une question au hasard respectant les tags/type forcé du salon, en
 * excluant les ids déjà tirés dans la partie en cours. Renvoie `null` quand
 * le réservoir de questions disponibles pour ces critères est épuisé.
 */
export type QuestionDrawer = (excludedIds: number[]) => Promise<any | null>;

export interface PointsConfig {
    /** Nombre de manches fixe, choisi à la création du salon. */
    roundCount: number;
    answerDurationMs: number;
    scoring?: BaseScoringConfig;
    /** Barème gradué par sous-mode DCC (Cash/Carré/Duo) : actif quand forcedType === "DCC". */
    dccPoints?: { cash: number; carre: number; duo: number };
    /** Barème "par niveau de difficulté" (1-3→1pt, 4-7→2pts, 8-10→3pts) au lieu du barème classique. */
    difficultyScoring?: boolean;
    forcedType?: ForcedQuestionType;
    /** Le créateur du salon est présentateur : c'est lui qui lance la question suivante (pas d'auto-avance). */
    hosted?: boolean;
    presentatorName?: string;
    /** Le créateur du salon est arbitre : peut inverser un verdict de réponse libre pendant la pause "reveal". */
    hasReferee?: boolean;
    refereeName?: string;
}

interface PointsPlayer {
    name: string;
    score: number;
}

export const DEFAULT_SCORING: BaseScoringConfig = { correctPoints: 1, wrongPoints: 0 };
/** Temps d'affichage du corrigé avant d'enchaîner sur la question suivante. */
const REVEAL_DURATION_MS = 4000;

/**
 * Moteur du mode Points : comme LIST, les questions défilent une par une et
 * tous les joueurs répondent en même temps — mais le réservoir n'est pas un
 * quizz pré-construit, chaque question est tirée au hasard par tag au moment
 * où elle est servie (cf. `drawQuestion`, fourni par Thread). Contrairement à
 * LIST, la question suivante n'est donc jamais connue à l'avance : pas de
 * `nextQuestionTitle` pour le présentateur ici.
 */
export default class PointsGame {
    private phase: PointsPhase = "waiting";
    private players: PointsPlayer[] = [];
    private currentIndex = -1;
    private currentQuestion: any = null;
    private drawnQuestionIds: number[] = [];
    private answers = new Map<string, { given: unknown; correct: boolean }>();

    private phaseTimer?: NodeJS.Timeout;
    private phaseEndsAt = 0;
    private socketIdResolver: ((name: string) => string | undefined) | null = null;
    private onFinishedCallback: ((ranking: PointsRanking[]) => void) | null = null;

    constructor(
        private readonly roomId: string,
        private readonly io: Server,
        private readonly config: PointsConfig,
        private readonly drawQuestion: QuestionDrawer
    ) {}

    // ---------------------------------------------------------------- cycle

    public async start(playerNames: string[]): Promise<void> {
        if (this.phase !== "waiting") return;
        if (playerNames.length === 0) {
            this.emitError("Il faut au moins un joueur pour lancer la partie.");
            return;
        }
        if (this.config.roundCount <= 0) {
            this.emitError("Le nombre de manches doit être supérieur à 0.");
            return;
        }

        this.players = playerNames.map((name) => ({ name, score: 0 }));
        this.currentIndex = -1;
        await this.nextQuestion();
    }

    private async nextQuestion(): Promise<void> {
        this.clearPhaseTimer();
        this.currentIndex += 1;
        if (this.currentIndex >= this.config.roundCount) {
            this.finish();
            return;
        }

        const drawn = await this.drawQuestion(this.drawnQuestionIds);
        if (!drawn) {
            // Réservoir de questions épuisé pour ces tags : on arrête proprement
            // plutôt que de planter, avec le classement déjà acquis s'il y en a.
            if (this.currentIndex === 0) {
                this.emitError("Aucune question ne correspond aux tags choisis.");
                return;
            }
            logger.debug(`[points ${this.roomId}] plus de question disponible, arrêt anticipé à la manche ${this.currentIndex}`);
            this.finish();
            return;
        }

        this.drawnQuestionIds.push(Number(drawn.question_id));
        this.currentQuestion = drawn;
        this.answers.clear();
        this.phase = "question";

        this.io.to(this.roomId).emit(POINTS_EVENTS.question, {
            index: this.currentIndex,
            total: this.config.roundCount,
            durationMs: this.config.answerDurationMs,
            question: this.sanitizeQuestion(this.currentQuestion),
            difficultyScoring: this.config.difficultyScoring ?? false,
        });
        this.broadcastState();
        this.startPhaseTimer(this.config.answerDurationMs, () => this.resolveQuestion());
    }

    /** Réponse d'un joueur à la question en cours. */
    public answer(username: string, given: unknown): void {
        if (this.phase !== "question") return;
        if (!this.players.some((p) => p.name === username)) return;
        if (this.answers.has(username)) return; // une seule réponse retenue par question

        let correct = false;
        try {
            correct = Boolean(verify(username, this.currentQuestion, this.enforceDccMode(this.currentQuestion, given)));
        } catch (error) {
            logger.error(`[points ${this.roomId}] vérification de réponse impossible`, error);
        }
        this.answers.set(username, { given, correct });
        this.broadcastState();

        if (this.answers.size >= this.players.length) {
            this.resolveQuestion();
        }
    }

    /**
     * Points gagnés pour une réponse, selon le barème actif (ordre de priorité) :
     * 1. Contrainte "DCC uniquement" avec barème gradué : selon le sous-mode
     *    réellement joué (Cash/Carré/Duo, jamais forcé dans ce mode — cf.
     *    resolveDccMode), même logique que PickBanGame.pointsFor.
     * 2. Barème "par niveau de difficulté" : selon le niveau de la question.
     * 3. Barème classique : correctPoints/wrongPoints fixes.
     */
    private pointsFor(question: any, given: unknown, correct: boolean): number {
        if (!correct) return this.config.difficultyScoring ? 0 : (this.config.scoring ?? DEFAULT_SCORING).wrongPoints;

        if (this.config.forcedType === "DCC" && question?.mode === "DCC") {
            const dccPoints = this.config.dccPoints ?? DEFAULT_DCC_POINTS;
            const mode = given && typeof given === "object" ? (given as any).mode : undefined;
            switch (mode) {
                case "CASH": return dccPoints.cash;
                case "CARRE": return dccPoints.carre;
                case "DUO": return dccPoints.duo;
                default: return 0;
            }
        }

        if (this.config.difficultyScoring) {
            return pointsForLevel(question?.level);
        }

        return (this.config.scoring ?? DEFAULT_SCORING).correctPoints;
    }

    private resolveQuestion(): void {
        if (this.phase !== "question") return;
        this.clearPhaseTimer();
        this.phase = "reveal";

        const answers: PointsQuestionResult["answers"] = this.players.map((player) => {
            const entry = this.answers.get(player.name);
            const correct = entry?.correct ?? false;
            const points = this.pointsFor(this.currentQuestion, entry?.given, correct);
            if (points) player.score += points;
            return { player: player.name, given: entry?.given ?? null, correct, pointsEarned: points };
        });

        this.io.to(this.roomId).emit(POINTS_EVENTS.result, {
            index: this.currentIndex,
            total: this.config.roundCount,
            question: this.currentQuestion,
            answers,
        });
        this.broadcastState();

        // Avec un présentateur, on n'avance jamais tout seul : il lance la
        // question suivante lui-même (cf. hostAdvance).
        if (!(this.config.hosted && this.config.presentatorName)) {
            this.startPhaseTimer(REVEAL_DURATION_MS, () => { void this.nextQuestion(); });
        }
    }

    /** Réservé au présentateur : lance la question suivante depuis l'écran de correction. */
    public hostAdvance(username: string): void {
        if (!this.config.hosted || username !== this.config.presentatorName) return;
        if (this.phase !== "reveal") return;
        void this.nextQuestion();
    }

    /**
     * Réservé à l'arbitre : inverse le verdict d'un joueur sur une réponse
     * libre (FREE, ou DCC joué en Cash) pendant la pause "reveal". Réutilise
     * `pointsFor` pour rester cohérent avec les 3 barèmes possibles (classique,
     * gradué DCC, par difficulté).
     */
    public overrideAnswer(username: string, correct: boolean): void {
        if (!this.config.hasReferee || this.phase !== "reveal") return;
        const player = this.players.find((p) => p.name === username);
        if (!player || !this.currentQuestion) return;

        const entry = this.answers.get(username) ?? { given: null, correct: false };
        const givenMode = entry.given && typeof entry.given === "object" ? (entry.given as any).mode : undefined;
        const isFreeAnswer = this.currentQuestion.mode === "FREE" || (this.currentQuestion.mode === "DCC" && givenMode === "CASH");
        if (!isFreeAnswer || entry.correct === correct) return;

        const oldPoints = this.pointsFor(this.currentQuestion, entry.given, entry.correct);
        const newPoints = this.pointsFor(this.currentQuestion, entry.given, correct);
        player.score += newPoints - oldPoints;
        this.answers.set(username, { ...entry, correct });

        const answers: PointsQuestionResult["answers"] = this.players.map((p) => {
            const e = this.answers.get(p.name);
            const c = e?.correct ?? false;
            return { player: p.name, given: e?.given ?? null, correct: c, pointsEarned: this.pointsFor(this.currentQuestion, e?.given, c) };
        });
        this.io.to(this.roomId).emit(POINTS_EVENTS.result, {
            index: this.currentIndex,
            total: this.config.roundCount,
            question: this.currentQuestion,
            answers,
        });
        this.broadcastState();
    }

    private finish(): void {
        this.clearPhaseTimer();
        this.phase = "finished";
        const ranking: PointsRanking[] = [...this.players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
        this.broadcastState();
        this.io.to(this.roomId).emit(POINTS_EVENTS.finished, { ranking });
        logger.debug(`[points ${this.roomId}] partie terminée`);
        this.onFinishedCallback?.(ranking);
    }

    /** Permet à l'orchestrateur (Thread) de savoir quand passer à l'étape suivante. */
    public onFinished(callback: (ranking: PointsRanking[]) => void): void {
        this.onFinishedCallback = callback;
    }

    public dispose(): void {
        this.clearPhaseTimer();
    }

    // ------------------------------------------------------------- diffusion

    private buildState(): PointsState {
        const players: PointsPlayerState[] = this.players.map((p) => ({ name: p.name, score: p.score }));
        return {
            phase: this.phase,
            index: this.currentIndex,
            total: this.config.roundCount,
            players,
            answeredNames: [...this.answers.keys()],
            remainingMs: this.phaseEndsAt > 0 ? Math.max(0, this.phaseEndsAt - Date.now()) : undefined,
        };
    }

    public broadcastState(): void {
        this.io.to(this.roomId).emit(POINTS_EVENTS.state, this.buildState());
    }

    /** Renvoie l'état courant à un seul joueur (reconnexion, arrivée tardive). */
    public sendStateTo(username: string): void {
        this.emitTo(username, POINTS_EVENTS.state, this.buildState());
    }

    /** Renvoie l'état courant à un spectateur `/show` (jamais de joueur inscrit). */
    public sendPublicStateTo(socketId: string): void {
        this.io.to(socketId).emit(POINTS_EVENTS.state, this.buildState());
    }

    /** Retire la bonne réponse avant de diffuser la question à tous. */
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

    private emitError(message: string): void {
        this.io.to(this.roomId).emit(POINTS_EVENTS.error, { message });
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

    public getPhase(): PointsPhase {
        return this.phase;
    }
}
