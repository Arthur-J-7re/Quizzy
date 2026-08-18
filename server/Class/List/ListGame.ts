import type { Server } from "socket.io";
import {
    LIST_EVENTS,
    type ListPhase,
    type ListPlayerState,
    type ListQuestionResult,
    type ListRanking,
    type ListState,
} from "../../../shared-types/list";
import { filterQuestionsByForcedType, verify } from "../../GameFunction/threadHelper";
import { enforceDccMode, sanitizeQuestionForBroadcast } from "../../GameFunction/questionSanitizer";
import logger from "../../utils/logger";
import { BaseScoringConfig, ForcedQuestionType } from "../../../shared-types/scoring";
import PhaseTimerEngine from "../PhaseTimerEngine";

export interface ListConfig {
    questions: number[];
    answerDurationMs: number;
    scoring?: BaseScoringConfig;
    forcedType?: ForcedQuestionType;
    /** Le créateur du salon est présentateur : c'est lui qui lance la question suivante (pas d'auto-avance). */
    hosted?: boolean;
    presentatorName?: string;
    /** Le créateur du salon est arbitre : peut inverser un verdict de réponse libre pendant la pause "reveal". */
    hasReferee?: boolean;
    refereeName?: string;
}

interface ListPlayer {
    name: string;
    score: number;
}

export type QuestionLoader = (ids: number[]) => Promise<any[]>;

export const DEFAULT_SCORING: BaseScoringConfig = { correctPoints: 1, wrongPoints: 0 };
/** Temps d'affichage du corrigé avant d'enchaîner sur la question suivante. */
const REVEAL_DURATION_MS = 4000;

/**
 * Moteur du mode LIST (quizz classique) : les questions du quizz défilent une
 * par une, tous les joueurs répondent en même temps à la même question. On
 * passe à la suivante dès que tout le monde a répondu, ou au bout du temps
 * imparti pour les retardataires.
 */
export default class ListGame extends PhaseTimerEngine<ListPhase, ListRanking> {
    private players: ListPlayer[] = [];
    private questionIds: number[] = [];
    private currentIndex = -1;
    private questionsById = new Map<number, any>();
    private answers = new Map<string, { given: unknown; correct: boolean }>();

    constructor(
        roomId: string,
        io: Server,
        private readonly config: ListConfig,
        private readonly loadQuestions: QuestionLoader
    ) {
        super(roomId, io, "waiting", { error: LIST_EVENTS.error });
    }

    // ---------------------------------------------------------------- cycle

    public async start(playerNames: string[]): Promise<void> {
        if (this.phase !== "waiting") return;
        if (playerNames.length === 0) {
            this.emitError("Il faut au moins un joueur pour lancer la partie.");
            return;
        }
        if (this.config.questions.length === 0) {
            this.emitError("Ce quizz ne contient aucune question.");
            return;
        }

        this.players = playerNames.map((name) => ({ name, score: 0 }));
        await this.preloadQuestions();
        const loaded = this.config.questions
            .filter((id) => this.questionsById.has(id))
            .map((id) => this.questionsById.get(id));
        this.questionIds = filterQuestionsByForcedType(loaded, this.config.forcedType).map((q) => Number(q.question_id));
        if (this.questionIds.length === 0) {
            this.emitError("Aucune question exploitable dans ce quizz.");
            return;
        }

        this.currentIndex = -1;
        this.nextQuestion();
    }

    private async preloadQuestions(): Promise<void> {
        try {
            const questions = await this.loadQuestions(this.config.questions);
            for (const q of questions) {
                this.questionsById.set(Number(q.question_id), q);
            }
        } catch (error) {
            logger.error(`[list ${this.roomId}] chargement des questions impossible`, error);
        }
    }

    // ------------------------------------------------------------ questions

    private nextQuestion(): void {
        this.clearPhaseTimer();
        this.currentIndex += 1;
        if (this.currentIndex >= this.questionIds.length) {
            this.finish();
            return;
        }

        this.answers.clear();
        this.phase = "question";
        const question = this.questionsById.get(this.questionIds[this.currentIndex]);

        this.io.to(this.roomId).emit(LIST_EVENTS.question, {
            index: this.currentIndex,
            total: this.questionIds.length,
            durationMs: this.config.answerDurationMs,
            question: this.sanitizeQuestion(question),
        });
        this.broadcastState();
        this.startPhaseTimer(this.config.answerDurationMs, () => this.resolveQuestion());
    }

    /** Réponse d'un joueur à la question en cours. */
    public answer(username: string, given: unknown): void {
        if (this.phase !== "question") return;
        if (!this.players.some((p) => p.name === username)) return;
        if (this.answers.has(username)) return; // une seule réponse retenue par question

        const question = this.questionsById.get(this.questionIds[this.currentIndex]);
        let correct = false;
        try {
            correct = Boolean(verify(username, question, this.enforceDccMode(question, given)));
        } catch (error) {
            logger.error(`[list ${this.roomId}] vérification de réponse impossible`, error);
        }
        this.answers.set(username, { given, correct });
        this.broadcastState();

        if (this.answers.size >= this.players.length) {
            this.resolveQuestion();
        }
    }

    private resolveQuestion(): void {
        if (this.phase !== "question") return;
        this.clearPhaseTimer();
        this.phase = "reveal";

        const question = this.questionsById.get(this.questionIds[this.currentIndex]);
        const scoring = this.config.scoring ?? DEFAULT_SCORING;
        const answers: ListQuestionResult["answers"] = this.players.map((player) => {
            const entry = this.answers.get(player.name);
            const correct = entry?.correct ?? false;
            const points = correct ? scoring.correctPoints : scoring.wrongPoints;
            if (points) player.score += points;
            return { player: player.name, given: entry?.given ?? null, correct, pointsEarned: points };
        });

        // Contrairement à la question envoyée en phase "question", ici la
        // bonne réponse est incluse : la manche est révélée à tous.
        this.io.to(this.roomId).emit(LIST_EVENTS.result, {
            index: this.currentIndex,
            total: this.questionIds.length,
            question,
            answers,
        });

        // Le présentateur reçoit en plus le titre de la question suivante (pas
        // sa réponse), pour pouvoir l'annoncer avant de lancer la suite — un
        // second envoi ciblé, jamais inclus dans la diffusion publique.
        if (this.config.hosted && this.config.presentatorName) {
            const nextQuestion = this.currentIndex + 1 < this.questionIds.length
                ? this.questionsById.get(this.questionIds[this.currentIndex + 1])
                : null;
            this.emitTo(this.config.presentatorName, LIST_EVENTS.result, {
                index: this.currentIndex,
                total: this.questionIds.length,
                question,
                answers,
                nextQuestionTitle: nextQuestion?.title ?? null,
            });
        }
        this.broadcastState();

        // Avec un présentateur, on n'avance jamais tout seul : il lance la
        // question suivante lui-même (cf. hostAdvance), pour garder le rythme
        // qu'il souhaite (commentaire, relance à l'oral...).
        if (!(this.config.hosted && this.config.presentatorName)) {
            this.startPhaseTimer(REVEAL_DURATION_MS, () => this.nextQuestion());
        }
    }

    /** Réservé au présentateur : lance la question suivante depuis l'écran de correction. */
    public hostAdvance(username: string): void {
        if (!this.config.hosted || username !== this.config.presentatorName) return;
        if (this.phase !== "reveal") return;
        this.nextQuestion();
    }

    /**
     * Réservé à l'arbitre : inverse le verdict d'un joueur sur une réponse
     * libre (FREE, ou DCC joué en Cash) pendant la pause "reveal". Ajuste son
     * score et rediffuse le résultat + l'état pour que tout le monde voie la
     * correction en direct.
     */
    public overrideAnswer(username: string, correct: boolean): void {
        if (!this.config.hasReferee || this.phase !== "reveal") return;
        const player = this.players.find((p) => p.name === username);
        if (!player) return;
        const question = this.questionsById.get(this.questionIds[this.currentIndex]);
        if (!question) return;

        const entry = this.answers.get(username) ?? { given: null, correct: false };
        const givenMode = entry.given && typeof entry.given === "object" ? (entry.given as any).mode : undefined;
        const isFreeAnswer = question.mode === "FREE" || (question.mode === "DCC" && givenMode === "CASH");
        if (!isFreeAnswer || entry.correct === correct) return;

        const scoring = this.config.scoring ?? DEFAULT_SCORING;
        const oldPoints = entry.correct ? scoring.correctPoints : scoring.wrongPoints;
        const newPoints = correct ? scoring.correctPoints : scoring.wrongPoints;
        player.score += newPoints - oldPoints;
        this.answers.set(username, { ...entry, correct });

        const answers: ListQuestionResult["answers"] = this.players.map((p) => {
            const e = this.answers.get(p.name);
            const c = e?.correct ?? false;
            return { player: p.name, given: e?.given ?? null, correct: c, pointsEarned: c ? scoring.correctPoints : scoring.wrongPoints };
        });
        this.io.to(this.roomId).emit(LIST_EVENTS.result, {
            index: this.currentIndex,
            total: this.questionIds.length,
            question,
            answers,
        });
        this.broadcastState();
    }

    private finish(): void {
        this.clearPhaseTimer();
        this.phase = "finished";
        const ranking: ListRanking[] = [...this.players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
        this.broadcastState();
        this.io.to(this.roomId).emit(LIST_EVENTS.finished, { ranking });
        logger.debug(`[list ${this.roomId}] partie terminée`);
        this.finishWith(ranking);
    }

    // ------------------------------------------------------------- diffusion

    private buildState(): ListState {
        const players: ListPlayerState[] = this.players.map((p) => ({ name: p.name, score: p.score }));
        return {
            phase: this.phase,
            index: this.currentIndex,
            total: this.questionIds.length,
            players,
            answeredNames: [...this.answers.keys()],
            remainingMs: this.remainingMs(),
        };
    }

    public broadcastState(): void {
        this.io.to(this.roomId).emit(LIST_EVENTS.state, this.buildState());
    }

    /** Renvoie l'état courant à un seul joueur (reconnexion, arrivée tardive). */
    public sendStateTo(username: string): void {
        this.emitTo(username, LIST_EVENTS.state, this.buildState());
    }

    /** Renvoie l'état courant à un spectateur `/show` (jamais de joueur inscrit). */
    public sendPublicStateTo(socketId: string): void {
        this.io.to(socketId).emit(LIST_EVENTS.state, this.buildState());
    }

    /** Retire la bonne réponse avant de diffuser la question à tous. */
    private sanitizeQuestion(question: any): any {
        return sanitizeQuestionForBroadcast(question, { roomId: this.roomId, forcedType: this.config.forcedType });
    }

    /** Le serveur impose le sous-mode DCC (Carré/Cash, jamais laissé au choix du joueur). */
    private enforceDccMode(question: any, given: unknown): unknown {
        return enforceDccMode(question, given, { roomId: this.roomId, forcedType: this.config.forcedType });
    }
}
