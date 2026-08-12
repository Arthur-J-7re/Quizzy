import type { Server } from "socket.io";
import {
    BR_EVENTS,
    type BrPhase,
    type BrPlayerState,
    type BrQuestionResult,
    type BrRanking,
    type BrState,
} from "../../../shared-types/br";
import { resolveDccMode, shuffledChoiceOrder, shuffledPairOrder, verify } from "../../GameFunction/threadHelper";
import logger from "../../utils/logger";
import { ForcedQuestionType } from "../../../shared-types/scoring";

/**
 * Tire une question au hasard respectant les tags/type forcé du salon, en
 * excluant les ids déjà tirés dans la partie en cours. Renvoie `null` quand
 * le réservoir de questions disponibles pour ces critères est épuisé.
 */
export type QuestionDrawer = (excludedIds: number[]) => Promise<any | null>;

export interface BrConfig {
    /** Nombre de vies de départ, choisi à la création du salon. */
    numberOfLife: number;
    answerDurationMs: number;
    forcedType?: ForcedQuestionType;
    /** Le créateur du salon est présentateur : c'est lui qui lance la question suivante (pas d'auto-avance). */
    hosted?: boolean;
    presentatorName?: string;
    /** Le créateur du salon est arbitre : peut inverser un verdict de réponse libre pendant la pause "reveal". */
    hasReferee?: boolean;
    refereeName?: string;
}

interface BrPlayer {
    name: string;
    lives: number;
    alive: boolean;
    /** Manche où ce joueur est tombé à 0 vie ; `null` pour le(s) survivant(s). */
    eliminatedAtRound: number | null;
}

/** Temps d'affichage du corrigé avant d'enchaîner sur la question suivante. */
const REVEAL_DURATION_MS = 4000;

/**
 * Moteur du mode Battle Royale : questions tirées une par une par tag (comme
 * Points, cf. PointsGame), mais élimination par vies au lieu d'un score —
 * une mauvaise réponse (ou une absence de réponse) coûte une vie à un joueur
 * encore en vie ; à 0 vie il est éliminé et ne joue plus les manches
 * suivantes. Fin de partie dès qu'il reste au plus un survivant.
 */
export default class BrGame {
    private phase: BrPhase = "waiting";
    private players: BrPlayer[] = [];
    private currentIndex = -1;
    private currentQuestion: any = null;
    private drawnQuestionIds: number[] = [];
    private answers = new Map<string, { given: unknown; correct: boolean }>();

    private phaseTimer?: NodeJS.Timeout;
    private phaseEndsAt = 0;
    private socketIdResolver: ((name: string) => string | undefined) | null = null;
    private onFinishedCallback: ((ranking: BrRanking[]) => void) | null = null;

    constructor(
        private readonly roomId: string,
        private readonly io: Server,
        private readonly config: BrConfig,
        private readonly drawQuestion: QuestionDrawer
    ) {}

    // ---------------------------------------------------------------- cycle

    public async start(playerNames: string[]): Promise<void> {
        if (this.phase !== "waiting") return;
        if (playerNames.length === 0) {
            this.emitError("Il faut au moins un joueur pour lancer la partie.");
            return;
        }
        if (this.config.numberOfLife <= 0) {
            this.emitError("Le nombre de vies doit être supérieur à 0.");
            return;
        }

        this.players = playerNames.map((name) => ({
            name,
            lives: this.config.numberOfLife,
            alive: true,
            eliminatedAtRound: null,
        }));
        this.currentIndex = -1;
        await this.nextQuestion();
    }

    private alivePlayers(): BrPlayer[] {
        return this.players.filter((p) => p.alive);
    }

    private async nextQuestion(): Promise<void> {
        this.clearPhaseTimer();

        if (this.alivePlayers().length <= 1) {
            this.finish();
            return;
        }

        this.currentIndex += 1;
        const drawn = await this.drawQuestion(this.drawnQuestionIds);
        if (!drawn) {
            if (this.currentIndex === 0) {
                this.emitError("Aucune question ne correspond aux tags choisis.");
                return;
            }
            logger.debug(`[br ${this.roomId}] plus de question disponible, arrêt anticipé à la manche ${this.currentIndex}`);
            this.finish();
            return;
        }

        this.drawnQuestionIds.push(Number(drawn.question_id));
        this.currentQuestion = drawn;
        this.answers.clear();
        this.phase = "question";

        this.io.to(this.roomId).emit(BR_EVENTS.question, {
            index: this.currentIndex,
            durationMs: this.config.answerDurationMs,
            question: this.sanitizeQuestion(this.currentQuestion),
        });
        this.broadcastState();
        this.startPhaseTimer(this.config.answerDurationMs, () => this.resolveQuestion());
    }

    /** Réponse d'un joueur encore en vie à la question en cours. */
    public answer(username: string, given: unknown): void {
        if (this.phase !== "question") return;
        const player = this.players.find((p) => p.name === username);
        if (!player || !player.alive) return;
        if (this.answers.has(username)) return; // une seule réponse retenue par question

        let correct = false;
        try {
            correct = Boolean(verify(username, this.currentQuestion, this.enforceDccMode(this.currentQuestion, given)));
        } catch (error) {
            logger.error(`[br ${this.roomId}] vérification de réponse impossible`, error);
        }
        this.answers.set(username, { given, correct });
        this.broadcastState();

        if (this.answers.size >= this.alivePlayers().length) {
            this.resolveQuestion();
        }
    }

    private resolveQuestion(): void {
        if (this.phase !== "question") return;
        this.clearPhaseTimer();
        this.phase = "reveal";

        const eliminated: string[] = [];
        const answers: BrQuestionResult["answers"] = this.alivePlayers().map((player) => {
            const entry = this.answers.get(player.name);
            const correct = entry?.correct ?? false;
            const livesLost = correct ? 0 : 1;
            if (livesLost) {
                player.lives = Math.max(0, player.lives - 1);
                if (player.lives === 0) {
                    player.alive = false;
                    player.eliminatedAtRound = this.currentIndex;
                    eliminated.push(player.name);
                }
            }
            return { player: player.name, given: entry?.given ?? null, correct, livesLost };
        });

        this.io.to(this.roomId).emit(BR_EVENTS.result, {
            index: this.currentIndex,
            question: this.currentQuestion,
            answers,
            eliminated,
        });
        this.broadcastState();

        if (this.alivePlayers().length <= 1) {
            this.finish();
            return;
        }

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
     * libre (FREE, ou DCC joué en Cash) pendant la pause "reveal". Ici ce
     * n'est pas un score mais des vies qui sont ajustées — une correction
     * faux→juste peut annuler l'élimination de cette manche précise.
     */
    public overrideAnswer(username: string, correct: boolean): void {
        if (!this.config.hasReferee || this.phase !== "reveal") return;
        const player = this.players.find((p) => p.name === username);
        const entry = this.answers.get(username);
        if (!player || !entry || !this.currentQuestion) return;

        const givenMode = entry.given && typeof entry.given === "object" ? (entry.given as any).mode : undefined;
        const isFreeAnswer = this.currentQuestion.mode === "FREE" || (this.currentQuestion.mode === "DCC" && givenMode === "CASH");
        if (!isFreeAnswer || entry.correct === correct) return;

        if (correct) {
            // Faux -> juste : la vie perdue sur cette manche est restituée.
            player.lives += 1;
            if (player.eliminatedAtRound === this.currentIndex) {
                player.alive = true;
                player.eliminatedAtRound = null;
            }
        } else {
            // Juste -> faux : la vie épargnée sur cette manche est reprise.
            player.lives = Math.max(0, player.lives - 1);
            if (player.lives === 0 && player.alive) {
                player.alive = false;
                player.eliminatedAtRound = this.currentIndex;
            }
        }
        this.answers.set(username, { ...entry, correct });

        const eliminated = this.players
            .filter((p) => p.eliminatedAtRound === this.currentIndex)
            .map((p) => p.name);
        const answers: BrQuestionResult["answers"] = [...this.answers.entries()].map(([name, e]) => ({
            player: name,
            given: e.given ?? null,
            correct: e.correct,
            livesLost: e.correct ? 0 : 1,
        }));
        this.io.to(this.roomId).emit(BR_EVENTS.result, {
            index: this.currentIndex,
            question: this.currentQuestion,
            answers,
            eliminated,
        });
        this.broadcastState();
    }

    /**
     * Classement : le(s) survivant(s) d'abord, puis par ordre d'élimination
     * inverse (le dernier éliminé est mieux classé). `score` sert de crédit
     * de victoire cumulable sur plusieurs étapes BR d'une même émission : 1
     * pour le(s) premier(s), 0 pour tous les autres.
     */
    private finish(): void {
        this.clearPhaseTimer();
        this.phase = "finished";
        const ordered = [...this.players].sort((a, b) => {
            const roundA = a.eliminatedAtRound ?? Infinity;
            const roundB = b.eliminatedAtRound ?? Infinity;
            return roundB - roundA;
        });
        const ranking: BrRanking[] = ordered.map((p, i) => ({ rank: i + 1, name: p.name, score: i === 0 ? 1 : 0 }));
        this.broadcastState();
        this.io.to(this.roomId).emit(BR_EVENTS.finished, { ranking });
        logger.debug(`[br ${this.roomId}] partie terminée`);
        this.onFinishedCallback?.(ranking);
    }

    /** Permet à l'orchestrateur (Thread) de savoir quand passer à l'étape suivante. */
    public onFinished(callback: (ranking: BrRanking[]) => void): void {
        this.onFinishedCallback = callback;
    }

    public dispose(): void {
        this.clearPhaseTimer();
    }

    // ------------------------------------------------------------- diffusion

    private buildState(): BrState {
        const players: BrPlayerState[] = this.players.map((p) => ({ name: p.name, lives: p.lives, alive: p.alive }));
        return {
            phase: this.phase,
            index: this.currentIndex,
            players,
            answeredNames: [...this.answers.keys()],
            remainingMs: this.phaseEndsAt > 0 ? Math.max(0, this.phaseEndsAt - Date.now()) : undefined,
        };
    }

    public broadcastState(): void {
        this.io.to(this.roomId).emit(BR_EVENTS.state, this.buildState());
    }

    /** Renvoie l'état courant à un seul joueur (reconnexion, arrivée tardive). */
    public sendStateTo(username: string): void {
        this.emitTo(username, BR_EVENTS.state, this.buildState());
    }

    /** Renvoie l'état courant à un spectateur `/show` (jamais de joueur inscrit). */
    public sendPublicStateTo(socketId: string): void {
        this.io.to(socketId).emit(BR_EVENTS.state, this.buildState());
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
        this.io.to(this.roomId).emit(BR_EVENTS.error, { message });
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

    public getPhase(): BrPhase {
        return this.phase;
    }
}
