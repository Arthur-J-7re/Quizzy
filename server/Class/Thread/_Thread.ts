import Room from "../Room";
import User from "../../Interface/User";
import GridGame, { type GridConfig, DEFAULT_SCORING as DEFAULT_GRID_SCORING } from "../Grid/GridGame";
import EmissionGridGame, { type EmissionGridConfig } from "../Grid/EmissionGridGame";
import PickBanGame, { type PickBanConfig, DEFAULT_SCORING as DEFAULT_PICKBAN_SCORING } from "../PickBan/PickBanGame";
import ListGame, { type ListConfig, DEFAULT_SCORING as DEFAULT_LIST_SCORING } from "../List/ListGame";
import TimerGame, { type TimerConfig, DEFAULT_SCORING as DEFAULT_TIMER_SCORING } from "../Timer/TimerGame";
import EmissionTimerGame, { type EmissionTimerConfig } from "../Timer/EmissionTimerGame";
import DuelGame, { type DuelConfig } from "../Duel/DuelGame";
import PointsGame, { type PointsConfig, type QuestionDrawer, DEFAULT_SCORING as DEFAULT_POINTS_SCORING } from "../Points/PointsGame";
import BrGame, { type BrConfig } from "../BR/BrGame";
import type { TimerHostVerdict } from "../../../shared-types/timer";
import type { ShowView } from "../../../shared-types/show";
import { DEFAULT_DCC_POINTS, FORCED_TYPE_ALLOWED_MODES, type ForcedQuestionType } from "../../../shared-types/scoring";
import quizzManager from "../../function/quizzManager";
import questionManager from "../../function/questionManager";
import tagManager from "../../function/tagManager";
import getterPlay from "../../function/getterPlay";
import { io } from "../../index";
import logger from "../../utils/logger";
import EmissionStepRunner from "./EmissionStepRunner";

/**
 * Chef d'orchestre d'une partie. L'émission fournie par le client est un objet
 * JSON simple ({title, steps:[{mode, quizz, ...}]}) : on la lit défensivement.
 * L'ancienne version appelait `emission.getCurrentStepType()`, qui n'existe pas
 * sur cet objet, et faisait donc planter la construction de la Room.
 *
 * Dispatch par mode + cycle de vie des moteurs de jeu (`*Game.ts`) uniquement :
 * l'orchestration de l'émission (score, bonus/malus, élimination, équipes,
 * quelle étape est en cours) vit dans `EmissionStepRunner` (cf. CODE_QUALITY.md,
 * point 2). `started`/`currentStep` restent des propriétés publiques de
 * `Thread` — via des accesseurs délégués — pour qu'aucun appelant externe
 * (`GameFunction/room.ts`, `Room.getInfo()`) n'ait à changer.
 */
export default class Thread {
    public room: Room;
    public players: { [name: string]: User };

    private readonly stepRunner: EmissionStepRunner;

    private grid: GridGame | null = null;
    private pickBan: PickBanGame | null = null;
    private list: ListGame | null = null;
    private timer: TimerGame | null = null;
    private duel: DuelGame | null = null;
    private points: PointsGame | null = null;
    private br: BrGame | null = null;

    constructor(room: Room) {
        this.room = room;
        this.players = room.players;
        this.stepRunner = new EmissionStepRunner(room, this.players, io);
    }

    public get started(): boolean {
        return this.stepRunner.started;
    }

    private set started(value: boolean) {
        this.stepRunner.started = value;
    }

    public get currentStep(): number {
        return this.stepRunner.currentStep;
    }

    public getMode(): string | null {
        return this.stepRunner.getMode();
    }

    /** Seul le créateur du salon peut lancer la partie. */
    public async start(username: string): Promise<void> {
        if (this.started) return;
        if (this.players[username]?.role !== "creator") {
            logger.debug(`[thread] ${username} a tenté de lancer sans être créateur`);
            return;
        }

        const step = this.stepRunner.currentStepData();
        if (!step) {
            logger.debug("[thread] aucune étape à jouer");
            return;
        }

        // Émission avec étape(s) à thème par joueur : le MJ doit avoir assigné
        // un thème à chaque joueur encore en lice, pour CHAQUE étape dynamique
        // du déroulé (pas seulement celle sur le point d'être lancée), avant
        // de pouvoir lancer quoi que ce soit.
        if (!this.stepRunner.allDynamicStepsFilled()) {
            io.to(String(this.room.id)).emit("emission:error", {
                message: "Assignez un thème à chaque joueur pour chaque étape dynamique avant de lancer.",
            });
            return;
        }

        // "reset des points" côté StepForm : on repart de zéro pour cette
        // étape plutôt que de continuer à cumuler sur les étapes précédentes.
        if (step.resetPoint) {
            for (const name of this.stepRunner.playingPlayerNames()) {
                if (this.players[name]) this.players[name].score = 0;
            }
            this.stepRunner.broadcastRoomInfo();
        }

        this.started = true;
        io.to(String(this.room.id)).emit("Starting game");

        switch (step.mode) {
            case "LIST":
                await this.startList(step);
                break;
            case "GRID":
                await this.startGrid(step);
                break;
            case "PICKANDBAN":
                await this.startPickBan(step);
                break;
            case "TIMER":
                await this.startTimer(step);
                break;
            case "TEAM_FORMATION":
                this.stepRunner.startTeamFormation(step);
                break;
            case "DUEL":
                await this.startDuel(step);
                break;
            case "POINTS":
                await this.startPoints(step);
                break;
            case "BR":
                await this.startBR(step);
                break;
            default:
                logger.debug(`[thread] mode non implémenté : ${step.mode}`);
                break;
        }
    }

    /** Relayé au moteur actif, quel qu'il soit, via `onFinished` : nettoie le moteur puis délègue l'avancement de l'émission. */
    private finishStep(ranking: { name: string; score: number }[]): void {
        this.disposeGames();
        this.stepRunner.finishStep(ranking);
    }

    /**
     * Réservé au présentateur : valide le score de l'épreuve qui vient de se
     * terminer, avec d'éventuels ajustements bonus/malus par joueur, puis
     * passe à la suite. Renvoie false si le présentateur n'a pas les droits
     * ou qu'aucune épreuve n'attend de validation.
     */
    public confirmBonusMalus(requester: string, adjustments: Record<string, number>): boolean {
        return this.stepRunner.confirmBonusMalus(requester, adjustments);
    }

    private disposeGames(): void {
        this.grid?.dispose();
        this.grid = null;
        this.pickBan?.dispose();
        this.pickBan = null;
        this.list?.dispose();
        this.list = null;
        this.timer?.dispose();
        this.timer = null;
        this.duel?.dispose();
        this.duel = null;
        this.points?.dispose();
        this.points = null;
        this.br?.dispose();
        this.br = null;
    }

    private async startList(step: any): Promise<void> {
        const quizz: any = await quizzManager.getListQuizz(Number(step.quizz));
        if (!quizz) {
            io.to(String(this.room.id)).emit("list:error", {
                message: "Quizz introuvable.",
            });
            this.started = false;
            return;
        }

        const config: ListConfig = {
            questions: (quizz.questions ?? []).map(Number),
            answerDurationMs: quizz.answerDurationMs ?? 20000,
            scoring: quizz.scoring ?? DEFAULT_LIST_SCORING,
            forcedType: quizz.forcedType ?? "ALL",
            hosted: this.room.withPresentator,
            presentatorName: this.stepRunner.presentatorName(),
            hasReferee: this.room.withRef,
            refereeName: this.stepRunner.refereeName(),
        };
        const loadQuestions = (ids: number[]) => questionManager.getQuestionsByIds(ids);

        this.list = new ListGame(String(this.room.id), io, config, loadQuestions);
        this.list.setSocketIdResolver((name) => this.players[name]?.socketId);
        this.list.onFinished((ranking) => this.finishStep(ranking));
        await this.list.start(this.stepRunner.playingPlayerNames());
    }

    private toGridThemeInput(theme: any) {
        return {
            theme_id: Number(theme.theme_id),
            title: String(theme.title),
            questions: (theme.questions ?? []).map(Number),
        };
    }

    private async startGrid(step: any): Promise<void> {
        const loadQuestions = (ids: number[]) => questionManager.getQuestionsByIds(ids);
        let playerNames: string[];

        // Étape "dynamique" : pas de quizz en base, les réglages viennent de
        // l'étape elle-même et les thèmes des joueurs encore en lice
        // (assignés dans le salon pour CETTE étape via Room.assignPlayerTheme).
        // Les cases neutres piochent dans les thèmes des joueurs déjà éliminés.
        if (this.stepRunner.isDynamicThemeStep(step)) {
            const baseConfig = {
                width: step.gridWidth ?? 5,
                height: step.gridHeight ?? 4,
                cellsPerTheme: step.gridCellsPerTheme ?? 3,
                memorizeDurationMs: step.gridMemorizeDurationMs ?? 8000,
                answerDurationMs: step.gridAnswerDurationMs ?? 20000,
                scoring: {
                    correctPoints: step.gridCorrectPoints ?? DEFAULT_GRID_SCORING.correctPoints,
                    wrongPoints: step.gridWrongPoints ?? DEFAULT_GRID_SCORING.wrongPoints,
                },
                forcedType: step.gridForcedType ?? "ALL",
                hosted: this.room.withPresentator,
                presentatorName: this.stepRunner.presentatorName(),
                hasReferee: this.room.withRef,
                refereeName: this.stepRunner.refereeName(),
            };
            playerNames = this.stepRunner.activeEmissionPlayerNames();
            const activeThemes = this.room
                .getActivePlayerThemes(this.currentStep)
                .filter(({ username }) => playerNames.includes(username))
                .map(({ username, theme }) => ({ username, theme: this.toGridThemeInput(theme) }));
            const eliminatedThemes = this.room
                .getEliminatedPlayerThemes(this.currentStep)
                .map((theme) => this.toGridThemeInput(theme));

            const emissionConfig: EmissionGridConfig = { ...baseConfig, activeThemes, eliminatedThemes };
            this.grid = new EmissionGridGame(String(this.room.id), io, emissionConfig, loadQuestions);
        } else {
            const quizz: any = await quizzManager.getGridQuizz(Number(step.quizz));
            if (!quizz) {
                io.to(String(this.room.id)).emit("grid:error", {
                    message: "Quizz Grid introuvable.",
                });
                this.started = false;
                return;
            }

            playerNames = this.stepRunner.playingPlayerNames();
            const config: GridConfig = {
                width: quizz.width ?? 4,
                height: quizz.height ?? 4,
                cellsPerTheme: quizz.cellsPerTheme ?? 3,
                memorizeDurationMs: quizz.memorizeDurationMs ?? 8000,
                answerDurationMs: quizz.answerDurationMs ?? 20000,
                themes: (quizz.themes ?? []).map((t: any) => this.toGridThemeInput(t)),
                neutralQuestions: (quizz.neutralQuestions ?? []).map(Number),
                scoring: quizz.scoring ?? DEFAULT_GRID_SCORING,
                forcedType: quizz.forcedType ?? "ALL",
                hosted: this.room.withPresentator,
                presentatorName: this.stepRunner.presentatorName(),
                hasReferee: this.room.withRef,
                refereeName: this.stepRunner.refereeName(),
            };
            this.grid = new GridGame(String(this.room.id), io, config, loadQuestions);
        }

        this.grid.setSocketIdResolver((name) => this.players[name]?.socketId);
        this.grid.onFinished((ranking) => this.finishStep(ranking));
        await this.grid.start(playerNames);
    }

    private async startPickBan(step: any): Promise<void> {
        const quizz: any = await quizzManager.getPickAndBanQuizz(Number(step.quizz));
        if (!quizz) {
            io.to(String(this.room.id)).emit("pickban:error", {
                message: "Quizz Pick & Ban introuvable.",
            });
            this.started = false;
            return;
        }

        const config: PickBanConfig = {
            columns: quizz.columns ?? 6,
            draftTurnDurationMs: quizz.draftTurnDurationMs ?? 20000,
            answerDurationMs: quizz.answerDurationMs ?? 20000,
            themes: (quizz.themes ?? []).map((t: any) => ({
                theme_id: Number(t.theme_id),
                title: String(t.title),
                img: t.img || undefined,
                questions: (t.questions ?? []).map(Number),
            })),
            // Des équipes existent dès qu'une étape TEAM_FORMATION a tourné :
            // n'importe quel membre du duo joue pour son équipe (draft comme
            // réponses), et les points vont à l'équipe plutôt qu'à lui.
            teams: this.room.getTeams().length > 0
                ? this.room.getTeams().map((t) => ({ id: t.id, members: t.members }))
                : undefined,
            // Seul le présentateur (créateur du salon en mode présentateur)
            // voit les vrais titres des thèmes : les joueurs draftent à l'aveugle.
            hosted: this.room.withPresentator,
            presentatorName: this.stepRunner.presentatorName(),
            scoring: quizz.scoring ?? DEFAULT_PICKBAN_SCORING,
            forcedType: quizz.forcedType ?? "ALL",
            allowBan: quizz.allowBan ?? true,
            hasReferee: this.room.withRef,
            refereeName: this.stepRunner.refereeName(),
        };

        this.pickBan = new PickBanGame(
            String(this.room.id),
            io,
            config,
            (ids) => questionManager.getQuestionsByIds(ids)
        );
        this.pickBan.setSocketIdResolver((name) => this.players[name]?.socketId);
        this.pickBan.onFinished((ranking) => this.finishStep(ranking));

        await this.pickBan.start(this.stepRunner.playingPlayerNames());
    }

    private async startTimer(step: any): Promise<void> {
        const sharedConfig = {
            hosted: this.room.withPresentator,
            presentatorName: this.stepRunner.presentatorName(),
            // Des équipes existent dès qu'une étape TEAM_FORMATION a tourné :
            // chacun garde son thème perso, mais joue en 2 manches par duo au
            // lieu d'un tour individuel, et les points vont à l'équipe.
            teams: this.room.getTeams().length > 0
                ? this.room.getTeams().map((t) => ({ id: t.id, members: t.members }))
                : undefined,
        };
        const loadQuestions = (ids: number[]) => questionManager.getQuestionsByIds(ids);
        let playerNames: string[];

        // Étape "dynamique" : pas de quizz en base (donc pas de présentateur
        // obligatoire non plus), chaque joueur encore en lice joue avec le
        // thème personnel assigné dans le salon pour CETTE étape.
        if (this.stepRunner.isDynamicThemeStep(step)) {
            playerNames = this.stepRunner.activeEmissionPlayerNames();
            const activeThemes = this.room
                .getActivePlayerThemes(this.currentStep)
                .filter(({ username }) => playerNames.includes(username))
                .map(({ username, theme }) => ({ username, theme: this.toGridThemeInput(theme) }));

            const emissionConfig: EmissionTimerConfig = {
                ...sharedConfig,
                turnDurationMs: step.timerTurnDurationMs ?? 100000,
                activeThemes,
                scoring: {
                    correctPoints: step.timerCorrectPoints ?? DEFAULT_TIMER_SCORING.correctPoints,
                    wrongPoints: step.timerWrongPoints ?? DEFAULT_TIMER_SCORING.wrongPoints,
                    streakBonus: {
                        everyN: step.timerStreakEveryN ?? DEFAULT_TIMER_SCORING.streakBonus.everyN,
                        bonusPoints: step.timerStreakBonusPoints ?? DEFAULT_TIMER_SCORING.streakBonus.bonusPoints,
                    },
                },
                forcedType: step.timerForcedType ?? "ALL",
            };
            this.timer = new EmissionTimerGame(String(this.room.id), io, emissionConfig, loadQuestions);
        } else {
            const quizz: any = await quizzManager.getTimerQuizz(Number(step.quizz));
            if (!quizz) {
                io.to(String(this.room.id)).emit("timer:error", {
                    message: "Quizz Timer introuvable.",
                });
                this.started = false;
                return;
            }
            // Ce quizz exige un présentateur pour juger les réponses : sans
            // salon hébergeant l'option, personne ne serait là pour le faire.
            if (quizz.hostModeEnabled && !this.room.withPresentator) {
                io.to(String(this.room.id)).emit("timer:error", {
                    message: "Ce quizz Timer nécessite un présentateur : jouez-le depuis une émission ayant l'option « avec un présentateur ».",
                });
                this.started = false;
                return;
            }

            playerNames = this.stepRunner.playingPlayerNames();
            const config: TimerConfig = {
                ...sharedConfig,
                turnDurationMs: quizz.turnDurationMs ?? 100000,
                themes: (quizz.themes ?? []).map((t: any) => this.toGridThemeInput(t)),
                scoring: quizz.scoring ?? DEFAULT_TIMER_SCORING,
                forcedType: quizz.forcedType ?? "ALL",
            };
            this.timer = new TimerGame(String(this.room.id), io, config, loadQuestions);
        }

        this.timer.setSocketIdResolver((name) => this.players[name]?.socketId);
        this.timer.onFinished((ranking) => this.finishStep(ranking));
        await this.timer.start(playerNames);
    }

    /**
     * Duel 1v1 façon Face à Face : le duo en tête à l'issue des étapes par
     * équipe s'affronte, chaque membre pour lui-même (les points ne vont plus
     * à l'équipe mais aux 2 individus). Le vivier de questions vient d'un
     * quizz LIST comme n'importe quelle autre étape.
     */
    private async startDuel(step: any): Promise<void> {
        const quizz: any = await quizzManager.getListQuizz(Number(step.quizz));
        if (!quizz) {
            io.to(String(this.room.id)).emit("duel:error", {
                message: "Quizz introuvable.",
            });
            this.started = false;
            return;
        }

        const participants = this.stepRunner.resolveDuelParticipants();
        if (!participants) {
            io.to(String(this.room.id)).emit("duel:error", {
                message: "Impossible de déterminer les 2 participants du duel.",
            });
            this.started = false;
            return;
        }

        const config: DuelConfig = {
            questions: (quizz.questions ?? []).map(Number),
            timePerPlayerMs: step.duelTimePerPlayerMs ?? 60000,
        };
        const loadQuestions = (ids: number[]) => questionManager.getQuestionsByIds(ids);

        this.duel = new DuelGame(String(this.room.id), io, config, loadQuestions);
        this.duel.setSocketIdResolver((name) => this.players[name]?.socketId);
        this.duel.onFinished((ranking) => this.finishStep(ranking));
        await this.duel.start(participants);
    }

    /**
     * Construit le tirage aléatoire par tag partagé par Points et BR : les
     * tags sont stockés en texte libre sur l'étape (comme partout ailleurs,
     * cf. Tags.tsx) et résolus une seule fois ici en ids canoniques
     * (tagManager.lookupTagIds, jamais resolveTags — on filtre des questions
     * existantes, on ne crée pas de nouveaux tags). `wantedTagNames` (mode
     * "Choisir" côté client) et `blockedTagNames` (mode "Bloquer") sont
     * mutuellement exclusifs : le client n'envoie jamais les deux à la fois.
     */
    private async buildQuestionDrawer(
        wantedTagNames: string[],
        blockedTagNames: string[],
        forcedType: ForcedQuestionType
    ): Promise<QuestionDrawer> {
        const [wantedTagIds, blockedTagIds] = await Promise.all([
            tagManager.lookupTagIds(wantedTagNames ?? []),
            tagManager.lookupTagIds(blockedTagNames ?? []),
        ]);
        const allowedModes = FORCED_TYPE_ALLOWED_MODES[forcedType];
        return (excludedIds: number[]) =>
            getterPlay.getRandomDocWithTags({
                wantedTags: (wantedTagNames?.length ?? 0) > 0 ? wantedTagIds : undefined,
                excludedTags: blockedTagIds,
                allowedModes,
                excludedQuestionIds: excludedIds,
            });
    }

    private async startPoints(step: any): Promise<void> {
        const forcedType: ForcedQuestionType = step.pointsForcedType ?? "ALL";
        const drawQuestion = await this.buildQuestionDrawer(step.pointsWantedTags, step.pointsBlockedTags, forcedType);

        const config: PointsConfig = {
            roundCount: Number(step.pointsRoundCount) > 0 ? Number(step.pointsRoundCount) : 10,
            answerDurationMs: 20000,
            scoring: {
                correctPoints: step.pointsCorrectPoints ?? DEFAULT_POINTS_SCORING.correctPoints,
                wrongPoints: step.pointsWrongPoints ?? DEFAULT_POINTS_SCORING.wrongPoints,
            },
            dccPoints: forcedType === "DCC" ? DEFAULT_DCC_POINTS : undefined,
            difficultyScoring: Boolean(step.pointsDifficultyScoring),
            forcedType,
            hosted: this.room.withPresentator,
            presentatorName: this.stepRunner.presentatorName(),
            hasReferee: this.room.withRef,
            refereeName: this.stepRunner.refereeName(),
        };

        this.points = new PointsGame(String(this.room.id), io, config, drawQuestion);
        this.points.setSocketIdResolver((name) => this.players[name]?.socketId);
        this.points.onFinished((ranking) => this.finishStep(ranking));
        await this.points.start(this.stepRunner.playingPlayerNames());
    }

    private async startBR(step: any): Promise<void> {
        const forcedType: ForcedQuestionType = step.brForcedType ?? "ALL";
        const drawQuestion = await this.buildQuestionDrawer(step.brWantedTags, step.brBlockedTags, forcedType);

        const config: BrConfig = {
            numberOfLife: Number(step.brNumberOfLife) > 0 ? Number(step.brNumberOfLife) : 3,
            answerDurationMs: 20000,
            forcedType,
            hosted: this.room.withPresentator,
            presentatorName: this.stepRunner.presentatorName(),
            hasReferee: this.room.withRef,
            refereeName: this.stepRunner.refereeName(),
        };

        this.br = new BrGame(String(this.room.id), io, config, drawQuestion);
        this.br.setSocketIdResolver((name) => this.players[name]?.socketId);
        this.br.onFinished((ranking) => this.finishStep(ranking));
        await this.br.start(this.stepRunner.playingPlayerNames());
    }

    /** Renvoie l'état courant à un joueur qui (re)rejoint la partie. */
    public sendStateTo(username: string): void {
        this.grid?.sendStateTo(username);
        this.pickBan?.sendStateTo(username);
        this.list?.sendStateTo(username);
        this.timer?.sendStateTo(username);
        this.duel?.sendStateTo(username);
        this.points?.sendStateTo(username);
        this.br?.sendStateTo(username);

        this.stepRunner.resendPendingBonusMalus();
    }

    /** Renvoie l'état public courant à un spectateur `/show` (jamais de joueur inscrit). */
    public sendPublicStateTo(socketId: string): void {
        this.list?.sendPublicStateTo(socketId);
        this.grid?.sendPublicStateTo(socketId);
        this.pickBan?.sendPublicStateTo(socketId);
        this.timer?.sendPublicStateTo(socketId);
        this.points?.sendPublicStateTo(socketId);
        this.br?.sendPublicStateTo(socketId);
    }

    // --- Mode Grid ---------------------------------------------------------
    public pick(username: string, index: number): void {
        this.grid?.pick(username, index);
    }

    public answer(username: string, given: unknown): void {
        this.grid?.answer(username, given);
        this.pickBan?.answer(username, given);
        this.list?.answer(username, given);
        this.timer?.answer(username, given);
        this.duel?.answer(username, given);
        this.points?.answer(username, given);
        this.br?.answer(username, given);
    }

    /**
     * Réservé à l'arbitre (créateur du salon avec l'option "avec un
     * arbitre") : inverse le verdict d'un joueur sur une réponse libre
     * (juste ↔ faux), pendant la pause qui suit chaque résolution. Un seul
     * moteur est actif à la fois, les autres sont `null` — pas besoin de
     * distinguer explicitement lequel.
     */
    public refereeOverride(requester: string, target: string, correct: boolean): void {
        if (this.players[requester]?.role !== "creator" || !this.room.withRef) return;
        this.list?.overrideAnswer(target, correct);
        this.grid?.overrideAnswer(target, correct);
        this.pickBan?.overrideAnswer(target, correct);
        this.points?.overrideAnswer(target, correct);
        this.br?.overrideAnswer(target, correct);
    }

    // --- Mode Points ---------------------------------------------------------
    public pointsHostAdvance(username: string): void {
        this.points?.hostAdvance(username);
    }

    // --- Mode Battle Royale ----------------------------------------------------
    public brHostAdvance(username: string): void {
        this.br?.hostAdvance(username);
    }

    // --- Mode Timer (quizz "avec présentateur") -----------------------------
    public timerHostJudge(username: string, verdict: TimerHostVerdict): void {
        this.timer?.hostJudge(username, verdict);
    }

    // --- Mode Timer (mode équipe) --------------------------------------------
    public timerClaimTurn(username: string): void {
        this.timer?.claimTurn(username);
    }

    // --- Mode List (quizz "avec présentateur") --------------------------------
    public listHostAdvance(username: string): void {
        this.list?.hostAdvance(username);
    }

    /** Réservé au présentateur : choisit ce que l'écran `/show` affiche en ce moment. */
    public setShowView(requester: string, view: ShowView): boolean {
        return this.stepRunner.setShowView(requester, view);
    }

    // --- Mode Pick & Ban -----------------------------------------------------
    public pbDraftPick(username: string, theme_id: number): void {
        this.pickBan?.draftPick(username, theme_id);
    }

    public pbDraftGive(username: string, theme_id: number): void {
        this.pickBan?.draftGive(username, theme_id);
    }

    public pbDraftBan(username: string, theme_id: number): void {
        this.pickBan?.draftBan(username, theme_id);
    }

    public pbChoose(username: string, theme_id: number): void {
        this.pickBan?.choose(username, theme_id);
    }

    // --- Émission (multi-épreuves) ------------------------------------------
    public assignPlayerTheme(requester: string, target: string, stepIndex: number, theme: any): boolean {
        return this.stepRunner.assignPlayerTheme(requester, target, stepIndex, theme);
    }

    public eliminatePlayer(requester: string, target: string): boolean {
        return this.stepRunner.eliminatePlayer(requester, target);
    }

    public resetScores(requester: string): boolean {
        return this.stepRunner.resetScores(requester);
    }

    public send(message: string, all: boolean = true, _players: number[] | null = null): void {
        if (all) {
            io.to(String(this.room.id)).emit("message", message);
        }
    }

    public dispose(): void {
        this.disposeGames();
    }
}
