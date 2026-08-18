import type { Server } from "socket.io";
import {
    GRID_COLORS,
    GRID_EVENTS,
    NEUTRAL_COLOR,
    type AssignedTheme,
    type GridCell,
    type GridCellResult,
    type GridPhase,
    type GridPlayerState,
    type GridRanking,
    type GridState,
} from "../../../shared-types/grid";
import { filterQuestionsByForcedType, verify } from "../../GameFunction/threadHelper";
import { enforceDccMode, sanitizeQuestionForBroadcast } from "../../GameFunction/questionSanitizer";
import logger from "../../utils/logger";
import { BaseScoringConfig, ForcedQuestionType } from "../../../shared-types/scoring";
import PhaseTimerEngine from "../PhaseTimerEngine";

/** Thème minimal nécessaire à la construction d'une grille. */
export interface GridThemeInput {
    theme_id: number;
    title: string;
    questions: number[];
}

/**
 * Configuration résolue d'une partie. `themes` et `neutralQuestions` sont
 * optionnels : c'est le cas classique (issu du quizz GRID) qui les utilise.
 * Une variante comme EmissionGridGame source ses thèmes autrement (cf.
 * `resolvePlayerThemes`/`getNeutralQuestionPool`) et n'a pas à les fournir ici.
 */
export interface GridConfig {
    width: number;
    height: number;
    cellsPerTheme: number;
    memorizeDurationMs: number;
    answerDurationMs: number;
    themes?: GridThemeInput[];
    neutralQuestions?: number[];
    scoring?: BaseScoringConfig;
    forcedType?: ForcedQuestionType;
    /** Le créateur du salon est présentateur : lui seul voit toujours la couleur réelle de chaque case. */
    hosted?: boolean;
    presentatorName?: string;
    /**
     * Le créateur du salon est arbitre : insère une courte pause "reveal"
     * après chaque case (au lieu d'enchaîner immédiatement) pour lui laisser
     * le temps d'inverser un verdict de réponse libre. Sans arbitre, la
     * partie garde son rythme actuel (enchaînement immédiat).
     */
    hasReferee?: boolean;
    refereeName?: string;
}

/** Une case côté serveur : contient la vérité, y compris ce qui est caché. */
interface ServerCell {
    index: number;
    themeId: number | null;
    questionId: number;
    taken: boolean;
    takenBy: string | null;
    success: boolean | null;
}

interface GridPlayer {
    name: string;
    themeId: number | null;
    color: string;
    themeTitle: string;
    score: number;
}

/** Récupère les questions par id. Injecté pour rester testable sans base. */
export type QuestionLoader = (ids: number[]) => Promise<any[]>;

export const DEFAULT_SCORING: BaseScoringConfig = { correctPoints: 1, wrongPoints: 0 };
/** Pause "reveal" après une case, uniquement quand le salon a un arbitre. */
const REVEAL_DURATION_MS = 4000;

/** Mélange en place (Fisher-Yates). Exporté pour être réutilisé par les variantes de grille. */
export function shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export default class GridGame extends PhaseTimerEngine<GridPhase, GridRanking> {
    private cells: ServerCell[] = [];
    private players: GridPlayer[] = [];
    private turnOrder: string[] = [];
    private currentTurnIndex = 0;
    private themesById = new Map<number, AssignedTheme>();
    private questionsById = new Map<number, any>();

    /** Case en cours de résolution, null hors phase "answering". */
    private pendingCell: ServerCell | null = null;
    /** Dernière case résolue, le temps de la pause "reveal" (arbitre uniquement) — sert à `overrideAnswer`. */
    private lastResolved: { cell: ServerCell; username: string; given: unknown } | null = null;

    constructor(
        roomId: string,
        io: Server,
        private readonly config: GridConfig,
        private readonly loadQuestions: QuestionLoader
    ) {
        super(roomId, io, "waiting", { error: GRID_EVENTS.error });
    }

    // ---------------------------------------------------------------- cycle

    /**
     * Construit la grille et lance la phase de mémorisation.
     * `playerNames` doit exclure le présentateur/arbitre éventuel.
     */
    public async start(playerNames: string[]): Promise<void> {
        if (this.phase !== "waiting") {
            return;
        }
        if (playerNames.length === 0) {
            this.emitError("Il faut au moins un joueur pour lancer la partie.");
            return;
        }

        if (!this.assignThemes(playerNames)) {
            return; // resolvePlayerThemes a déjà émis l'erreur qui explique le refus.
        }
        this.buildCells();
        await this.preloadQuestions();

        if (this.cells.length === 0) {
            this.emitError("Impossible de construire la grille : aucune question disponible.");
            return;
        }

        this.turnOrder = shuffle([...playerNames]);
        this.currentTurnIndex = 0;

        // Phase de mémorisation : on envoie la grille COULEURS VISIBLES.
        this.phase = "memorize";
        this.startPhaseTimer(this.config.memorizeDurationMs, () => this.beginPlaying());
        this.io.to(this.roomId).emit(GRID_EVENTS.memorize, {
            durationMs: this.config.memorizeDurationMs,
            state: this.buildState(false),
        });
        logger.debug(`[grid ${this.roomId}] mémorisation lancée (${this.cells.length} cases)`);
    }

    private beginPlaying(): void {
        this.phase = "playing";
        this.broadcastState();
        this.announceTurn();
    }

    // --------------------------------------------------------------- setup

    /** Résout un thème par joueur puis peuple players/themesById. Renvoie false si `resolvePlayerThemes` a refusé. */
    private assignThemes(playerNames: string[]): boolean {
        const resolved = this.resolvePlayerThemes(playerNames);
        if (!resolved) return false;

        this.players = resolved.map(({ name, theme }, i) => {
            const color = GRID_COLORS[i % GRID_COLORS.length];
            this.themesById.set(theme.theme_id, {
                ...theme,
                color,
                owner: name,
            });
            return {
                name,
                themeId: theme.theme_id,
                color,
                themeTitle: theme.title,
                score: 0,
            };
        });
        return true;
    }

    /**
     * Détermine quel thème revient à quel joueur. Comportement par défaut :
     * un thème tiré au hasard dans le vivier du quizz, par joueur.
     *
     * Point d'extension : EmissionGridGame le redéfinit pour attribuer à
     * chaque joueur encore en lice son thème personnel assigné en début
     * d'émission, au lieu d'un tirage dans un vivier partagé.
     */
    protected resolvePlayerThemes(
        playerNames: string[]
    ): { name: string; theme: GridThemeInput }[] | null {
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

    private buildCells(): void {
        const total = this.config.width * this.config.height;
        const assignments: { themeId: number | null; questionId: number }[] = [];

        // Chaque thème occupe cellsPerTheme cases, sans réutiliser deux fois la
        // même question tant qu'il en reste dans le pool.
        for (const player of this.players) {
            const theme = this.themesById.get(player.themeId!);
            if (!theme) continue;
            const questions = shuffle([...theme.questions]);
            for (let i = 0; i < this.config.cellsPerTheme && assignments.length < total; i++) {
                assignments.push({
                    themeId: theme.theme_id,
                    questionId: questions[i % questions.length],
                });
            }
        }

        // Le reste de la grille : cases neutres, questions génériques.
        const neutral = shuffle([...this.getNeutralQuestionPool()]);
        while (assignments.length < total && neutral.length > 0) {
            assignments.push({
                themeId: null,
                questionId: neutral[assignments.length % neutral.length],
            });
        }

        this.cells = shuffle(assignments).map((a, index) => ({
            index,
            themeId: a.themeId,
            questionId: a.questionId,
            taken: false,
            takenBy: null,
            success: null,
        }));
    }

    /**
     * Pool de questions pour les cases sans thème. Par défaut, celui configuré
     * sur le quizz.
     *
     * Point d'extension : EmissionGridGame le redéfinit pour puiser dans les
     * questions des thèmes des joueurs déjà éliminés.
     */
    protected getNeutralQuestionPool(): number[] {
        return this.config.neutralQuestions ?? [];
    }

    private async preloadQuestions(): Promise<void> {
        const ids = [...new Set(this.cells.map((c) => c.questionId))];
        try {
            const questions = await this.loadQuestions(ids);
            for (const question of questions) {
                this.questionsById.set(Number(question.question_id), question);
            }
        } catch (error) {
            logger.error(`[grid ${this.roomId}] chargement des questions impossible`, error);
        }
        // Une case sans question exploitable, ou dont le type n'est pas
        // autorisé par le type forcé du quizz, est retirée plutôt que de
        // bloquer la partie au moment où quelqu'un clique dessus.
        const allowedIds = new Set(
            filterQuestionsByForcedType([...this.questionsById.values()], this.config.forcedType).map((q) =>
                Number(q.question_id)
            )
        );
        this.cells = this.cells
            .filter((c) => allowedIds.has(c.questionId))
            .map((c, index) => ({ ...c, index }));
    }

    // ---------------------------------------------------------------- tours

    private announceTurn(): void {
        const current = this.currentPlayerName();
        if (!current) return;
        this.io.to(this.roomId).emit(GRID_EVENTS.turn, { player: current });
    }

    private currentPlayerName(): string | null {
        if (this.turnOrder.length === 0) return null;
        return this.turnOrder[this.currentTurnIndex % this.turnOrder.length];
    }

    private nextTurn(): void {
        if (this.cells.every((c) => c.taken)) {
            this.finish();
            return;
        }
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
        this.phase = "playing";
        this.broadcastState();
        this.announceTurn();
    }

    // --------------------------------------------------------------- actions

    /** Le joueur dont c'est le tour retourne une case. */
    public pick(username: string, index: number): void {
        if (this.phase !== "playing") {
            this.emitErrorTo(username, "Ce n'est pas le moment de choisir une case.");
            return;
        }
        if (username !== this.currentPlayerName()) {
            this.emitErrorTo(username, "Ce n'est pas votre tour.");
            return;
        }
        const cell = this.cells.find((c) => c.index === index);
        if (!cell) {
            this.emitErrorTo(username, "Cette case n'existe pas.");
            return;
        }
        if (cell.taken) {
            this.emitErrorTo(username, "Cette case a déjà été jouée.");
            return;
        }

        const question = this.questionsById.get(cell.questionId);
        if (!question) {
            this.emitErrorTo(username, "Question indisponible, choisissez une autre case.");
            return;
        }

        this.pendingCell = cell;
        this.phase = "answering";

        // La question ne part qu'au joueur concerné ; les autres voient
        // seulement quelle case a été ouverte et par qui.
        const theme = cell.themeId !== null ? this.themesById.get(cell.themeId) : null;
        this.io.to(this.roomId).emit(GRID_EVENTS.question, {
            index: cell.index,
            player: username,
            themeTitle: theme?.title ?? null,
            color: theme?.color ?? NEUTRAL_COLOR,
            durationMs: this.config.answerDurationMs,
            // `question` est ajouté ci-dessous uniquement pour le joueur actif.
        });
        this.emitTo(username, GRID_EVENTS.question, {
            index: cell.index,
            player: username,
            themeTitle: theme?.title ?? null,
            color: theme?.color ?? NEUTRAL_COLOR,
            durationMs: this.config.answerDurationMs,
            question: this.sanitizeQuestion(question),
        });

        // Pas de réponse dans le temps imparti = mauvaise réponse.
        this.startPhaseTimer(this.config.answerDurationMs, () => this.resolve(username, null, false));
    }

    /** Réponse du joueur actif à la case en cours. */
    public answer(username: string, given: unknown): void {
        if (this.phase !== "answering" || !this.pendingCell) {
            return;
        }
        if (username !== this.currentPlayerName()) {
            return;
        }
        const question = this.questionsById.get(this.pendingCell.questionId);
        let correct = false;
        try {
            correct = Boolean(verify(username, question, this.enforceDccMode(question, given)));
        } catch (error) {
            logger.error(`[grid ${this.roomId}] vérification de réponse impossible`, error);
        }
        this.resolve(username, given, correct);
    }

    private resolve(username: string, given: unknown, correct: boolean): void {
        const cell = this.pendingCell;
        if (!cell) return;
        this.clearPhaseTimer();
        this.pendingCell = null;

        cell.taken = true;
        cell.takenBy = username;
        cell.success = correct;

        const player = this.players.find((p) => p.name === username);
        const scoring = this.config.scoring ?? DEFAULT_SCORING;
        const points = correct ? scoring.correctPoints : scoring.wrongPoints;
        if (player && points) {
            player.score += points;
        }

        const theme = cell.themeId !== null ? this.themesById.get(cell.themeId) : null;
        const result: GridCellResult = {
            index: cell.index,
            player: username,
            correct,
            themeTitle: theme?.title ?? null,
            color: theme?.color ?? NEUTRAL_COLOR,
            question: this.questionsById.get(cell.questionId),
            givenAnswer: given,
            pointsEarned: points,
        };
        this.io.to(this.roomId).emit(GRID_EVENTS.result, result);

        // Sans arbitre : comportement inchangé, on enchaîne aussitôt. Avec un
        // arbitre : courte pause pour lui laisser le temps de corriger une
        // réponse libre (cf. overrideAnswer) avant de reprendre.
        if (this.config.hasReferee) {
            this.lastResolved = { cell, username, given };
            this.phase = "reveal";
            this.broadcastState();
            this.startPhaseTimer(REVEAL_DURATION_MS, () => this.nextTurn());
        } else {
            this.nextTurn();
        }
    }

    /**
     * Réservé à l'arbitre : inverse le verdict d'un joueur sur une réponse
     * libre (FREE, ou DCC joué en Cash) pendant la pause "reveal" qui suit
     * chaque case.
     */
    public overrideAnswer(username: string, correct: boolean): void {
        if (!this.config.hasReferee || this.phase !== "reveal" || !this.lastResolved) return;
        if (this.lastResolved.username !== username) return;

        const { cell, given } = this.lastResolved;
        if (cell.success === correct) return;
        const question = this.questionsById.get(cell.questionId);
        if (!question) return;

        const givenMode = given && typeof given === "object" ? (given as any).mode : undefined;
        const isFreeAnswer = question.mode === "FREE" || (question.mode === "DCC" && givenMode === "CASH");
        if (!isFreeAnswer) return;

        const player = this.players.find((p) => p.name === username);
        const scoring = this.config.scoring ?? DEFAULT_SCORING;
        const oldPoints = cell.success ? scoring.correctPoints : scoring.wrongPoints;
        const newPoints = correct ? scoring.correctPoints : scoring.wrongPoints;
        if (player) player.score += newPoints - oldPoints;
        cell.success = correct;

        const theme = cell.themeId !== null ? this.themesById.get(cell.themeId) : null;
        const result: GridCellResult = {
            index: cell.index,
            player: username,
            correct,
            themeTitle: theme?.title ?? null,
            color: theme?.color ?? NEUTRAL_COLOR,
            question,
            givenAnswer: given,
            pointsEarned: newPoints,
        };
        this.io.to(this.roomId).emit(GRID_EVENTS.result, result);
        this.broadcastState();
    }

    private finish(): void {
        this.clearPhaseTimer();
        this.phase = "finished";
        const ranking: GridRanking[] = [...this.players]
            .sort((a, b) => b.score - a.score)
            .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score, color: p.color }));
        this.broadcastState();
        this.io.to(this.roomId).emit(GRID_EVENTS.finished, { ranking });
        logger.debug(`[grid ${this.roomId}] partie terminée`);
        this.finishWith(ranking);
    }

    // ------------------------------------------------------------- diffusion

    /**
     * Vue client de l'état. Les couleurs ne sont incluses qu'en phase de
     * mémorisation ou pour les cases déjà retournées (le masquage est fait ici,
     * côté serveur, pour qu'un client bricolé ne puisse pas lire la grille) —
     * sauf pour le présentateur (`forPresentator`), qui voit toujours la
     * couleur réelle de chaque case, y compris fermée.
     */
    private buildState(forPresentator: boolean): GridState {
        const reveal = forPresentator || this.phase === "memorize";
        const cells: GridCell[] = this.cells.map((c) => {
            const base: GridCell = {
                index: c.index,
                taken: c.taken,
                takenBy: c.takenBy,
                success: c.success,
            };
            if (reveal || c.taken) {
                const theme = c.themeId !== null ? this.themesById.get(c.themeId) : null;
                base.themeId = c.themeId;
                base.color = theme?.color ?? NEUTRAL_COLOR;
                base.themeTitle = theme?.title ?? null;
            }
            return base;
        });

        const players: GridPlayerState[] = this.players.map((p) => ({
            name: p.name,
            color: p.color,
            themeTitle: p.themeTitle,
            score: p.score,
            connected: true,
        }));

        return {
            phase: this.phase,
            width: this.config.width,
            height: this.config.height,
            cells,
            players,
            currentPlayer: this.phase === "playing" || this.phase === "answering" || this.phase === "reveal"
                ? this.currentPlayerName()
                : null,
            remainingMs: this.remainingMs(),
        };
    }

    public broadcastState(): void {
        this.io.to(this.roomId).emit(GRID_EVENTS.state, this.buildState(false));
        if (this.config.hosted && this.config.presentatorName) {
            this.emitTo(this.config.presentatorName, GRID_EVENTS.state, this.buildState(true));
        }
    }

    /** Renvoie l'état courant à un seul joueur (reconnexion, arrivée tardive). */
    public sendStateTo(username: string): void {
        const forPresentator = Boolean(this.config.hosted && this.config.presentatorName === username);
        this.emitTo(username, GRID_EVENTS.state, this.buildState(forPresentator));
    }

    /** Renvoie l'état public (jamais celui du présentateur) à un spectateur `/show`. */
    public sendPublicStateTo(socketId: string): void {
        this.io.to(socketId).emit(GRID_EVENTS.state, this.buildState(false));
    }

    /** Retire la bonne réponse avant d'envoyer la question au joueur. */
    private sanitizeQuestion(question: any): any {
        return sanitizeQuestionForBroadcast(question, { roomId: this.roomId, forcedType: this.config.forcedType });
    }

    /** Le serveur impose le sous-mode DCC (Carré/Cash, jamais laissé au choix du joueur). */
    private enforceDccMode(question: any, given: unknown): unknown {
        return enforceDccMode(question, given, { roomId: this.roomId, forcedType: this.config.forcedType });
    }

    private emitErrorTo(username: string, message: string): void {
        this.emitTo(username, GRID_EVENTS.error, { message });
    }
}
