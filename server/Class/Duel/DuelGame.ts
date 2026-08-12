import type { Server } from "socket.io";
import {
    DUEL_EVENTS,
    type DuelPhase,
    type DuelPlayerState,
    type DuelRanking,
    type DuelState,
} from "../../../shared-types/duel";
import { verify } from "../../GameFunction/threadHelper";
import logger from "../../utils/logger";

export interface DuelConfig {
    questions: number[];
    timePerPlayerMs: number;
}

interface DuelPlayer {
    name: string;
    remainingMs: number;
}

export type QuestionLoader = (ids: number[]) => Promise<any[]>;

/** Fréquence de décompte du chrono actif, diffusé à chaque tick. */
const TICK_MS = 250;

/**
 * Moteur du mode Duel (façon "Face à Face" des 12 Coups de Midi) : les 2
 * joueurs partagent la même liste de questions, mais chacun a son propre
 * chrono qui ne décompte que pendant son tour de répondre. Une bonne réponse
 * passe la main à l'adversaire pour la question suivante ; une mauvaise
 * réponse garde la main au même joueur (jamais de "vol" de la question en
 * cours, contrairement au vrai Face à Face). Le premier dont le chrono tombe
 * à 0 perd immédiatement ; si les questions s'épuisent avant, celui qui a le
 * plus de temps restant l'emporte.
 */
export default class DuelGame {
    private phase: DuelPhase = "waiting";
    private players: [DuelPlayer, DuelPlayer] = [
        { name: "", remainingMs: 0 },
        { name: "", remainingMs: 0 },
    ];
    private activeIndex: 0 | 1 = 0;
    private questionIds: number[] = [];
    private currentIndex = -1;
    private questionsById = new Map<number, any>();

    private tickTimer?: NodeJS.Timeout;
    private lastTickAt = 0;
    private socketIdResolver: ((name: string) => string | undefined) | null = null;
    private onFinishedCallback: ((ranking: DuelRanking[]) => void) | null = null;

    constructor(
        private readonly roomId: string,
        private readonly io: Server,
        private readonly config: DuelConfig,
        private readonly loadQuestions: QuestionLoader
    ) {}

    // ---------------------------------------------------------------- cycle

    public async start(playerNames: [string, string]): Promise<void> {
        if (this.phase !== "waiting") return;
        if (this.config.questions.length === 0) {
            this.emitError("Ce quizz ne contient aucune question.");
            return;
        }

        this.players = [
            { name: playerNames[0], remainingMs: this.config.timePerPlayerMs },
            { name: playerNames[1], remainingMs: this.config.timePerPlayerMs },
        ];
        this.activeIndex = 0;

        await this.preloadQuestions();
        this.questionIds = this.config.questions.filter((id) => this.questionsById.has(id));
        if (this.questionIds.length === 0) {
            this.emitError("Aucune question exploitable dans ce quizz.");
            return;
        }

        this.currentIndex = -1;
        this.nextQuestion();
        logger.debug(`[duel ${this.roomId}] duel lancé (${this.questionIds.length} questions)`);
    }

    private async preloadQuestions(): Promise<void> {
        try {
            const questions = await this.loadQuestions(this.config.questions);
            for (const q of questions) {
                this.questionsById.set(Number(q.question_id), q);
            }
        } catch (error) {
            logger.error(`[duel ${this.roomId}] chargement des questions impossible`, error);
        }
    }

    // ------------------------------------------------------------ questions

    private nextQuestion(): void {
        this.clearTick();
        this.currentIndex += 1;
        if (this.currentIndex >= this.questionIds.length) {
            this.finishByTime();
            return;
        }

        this.phase = "question";
        const question = this.questionsById.get(this.questionIds[this.currentIndex]);

        this.io.to(this.roomId).emit(DUEL_EVENTS.question, {
            questionIndex: this.currentIndex,
            questionsTotal: this.questionIds.length,
            activePlayer: this.players[this.activeIndex].name,
            question: this.sanitizeQuestion(question),
        });
        this.broadcastState();
        this.startTick();
    }

    /** Réponse du joueur actif à la question en cours. */
    public answer(username: string, given: unknown): void {
        if (this.phase !== "question") return;
        if (this.players[this.activeIndex].name !== username) return;

        const question = this.questionsById.get(this.questionIds[this.currentIndex]);
        let correct = false;
        try {
            correct = Boolean(verify(username, question, given));
        } catch (error) {
            logger.error(`[duel ${this.roomId}] vérification de réponse impossible`, error);
        }

        this.clearTick();
        // Bonne réponse : la main passe à l'adversaire pour la question
        // suivante. Mauvaise réponse : le joueur actif la garde.
        if (correct) {
            this.activeIndex = this.activeIndex === 0 ? 1 : 0;
        }

        this.io.to(this.roomId).emit(DUEL_EVENTS.result, {
            player: username,
            correct,
            givenAnswer: given,
            questionIndex: this.currentIndex,
            questionsTotal: this.questionIds.length,
            nextActivePlayer: this.players[this.activeIndex].name,
        });

        this.nextQuestion();
    }

    // ---------------------------------------------------------------- chrono

    private startTick(): void {
        this.lastTickAt = Date.now();
        this.tickTimer = setInterval(() => this.tick(), TICK_MS);
    }

    private tick(): void {
        const now = Date.now();
        const elapsed = now - this.lastTickAt;
        this.lastTickAt = now;

        const active = this.players[this.activeIndex];
        active.remainingMs = Math.max(0, active.remainingMs - elapsed);
        this.broadcastState();

        if (active.remainingMs <= 0) {
            this.finishByTimeout();
        }
    }

    private clearTick(): void {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = undefined;
        }
    }

    // --------------------------------------------------------------- issue

    /** Le joueur actif a épuisé son temps : il perd immédiatement. */
    private finishByTimeout(): void {
        const winnerIndex = this.activeIndex === 0 ? 1 : 0;
        this.finish(winnerIndex);
    }

    /** Plus de question à poser : celui qui a le plus de temps restant l'emporte. */
    private finishByTime(): void {
        const [p0, p1] = this.players;
        if (p0.remainingMs === p1.remainingMs) {
            this.finish(null);
            return;
        }
        this.finish(p0.remainingMs > p1.remainingMs ? 0 : 1);
    }

    private finish(winnerIndex: 0 | 1 | null): void {
        this.clearTick();
        this.phase = "finished";
        const ranking: DuelRanking[] =
            winnerIndex === null
                ? this.players.map((p) => ({ rank: 1, name: p.name, score: 0 }))
                : [
                      { rank: 1, name: this.players[winnerIndex].name, score: 1 },
                      { rank: 2, name: this.players[winnerIndex === 0 ? 1 : 0].name, score: 0 },
                  ];

        this.broadcastState();
        this.io.to(this.roomId).emit(DUEL_EVENTS.finished, { ranking });
        logger.debug(`[duel ${this.roomId}] duel terminé`);
        this.onFinishedCallback?.(ranking);
    }

    /** Permet à l'orchestrateur (Thread) de savoir quand passer à la suite. */
    public onFinished(callback: (ranking: DuelRanking[]) => void): void {
        this.onFinishedCallback = callback;
    }

    public dispose(): void {
        this.clearTick();
    }

    // ------------------------------------------------------------- diffusion

    private buildState(): DuelState {
        const players: [DuelPlayerState, DuelPlayerState] = [
            { name: this.players[0].name, remainingMs: this.players[0].remainingMs },
            { name: this.players[1].name, remainingMs: this.players[1].remainingMs },
        ];
        return {
            phase: this.phase,
            players,
            activePlayer: this.phase === "question" ? this.players[this.activeIndex].name : null,
            questionIndex: this.currentIndex,
            questionsTotal: this.questionIds.length,
        };
    }

    public broadcastState(): void {
        this.io.to(this.roomId).emit(DUEL_EVENTS.state, this.buildState());
    }

    /** Renvoie l'état courant à un seul joueur (reconnexion, arrivée tardive). */
    public sendStateTo(username: string): void {
        this.emitTo(username, DUEL_EVENTS.state, this.buildState());
    }

    /** Retire la bonne réponse avant de diffuser la question à tous. */
    private sanitizeQuestion(question: any): any {
        const { answer, answers, truth, ...safe } = question?.toObject?.() ?? question ?? {};
        return safe;
    }

    private emitError(message: string): void {
        this.io.to(this.roomId).emit(DUEL_EVENTS.error, { message });
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

    public getPhase(): DuelPhase {
        return this.phase;
    }
}
