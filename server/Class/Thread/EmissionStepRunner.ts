import type { Server } from "socket.io";
import Room from "../Room";
import User from "../../Interface/User";
import { SHOW_EVENTS, type ShowView } from "../../../shared-types/show";
import logger from "../../utils/logger";

/**
 * Orchestration d'une émission (score, bonus/malus, élimination, équipes,
 * quelle étape est en cours) — indépendante de quel moteur de jeu (`*Game.ts`)
 * fait tourner l'étape en cours. Extrait de `Thread` (cf. CODE_QUALITY.md,
 * point 2 : « un EmissionStepRunner séparé du dispatch par mode »).
 *
 * Le seul point de jonction avec le dispatcher (`Thread`) : `finishStep` ne
 * nettoie plus le moteur actif elle-même (`disposeGames()`), c'est la
 * responsabilité de l'appelant — cf. `Thread.finishStep`.
 */
export default class EmissionStepRunner {
    public started = false;
    public currentStep = 0;

    /**
     * Score brut de l'épreuve qui vient de se terminer, en attente de
     * validation (avec ajustements bonus/malus éventuels) par le
     * présentateur — cf. `finishStep`/`confirmBonusMalus`. Toujours `null`
     * sans présentateur (application immédiate, jamais de mise en attente).
     */
    private pendingStepRanking: { name: string; score: number }[] | null = null;

    /** Ce que l'écran `/show` doit afficher (mode LIST hébergé uniquement, cf. setShowView). */
    private showView: ShowView = "live";

    constructor(
        private readonly room: Room,
        private readonly players: { [name: string]: User },
        private readonly io: Server
    ) {}

    public currentStepData(): any | null {
        const steps = this.room?.emission?.steps;
        if (!Array.isArray(steps)) return null;
        return steps[this.currentStep] ?? null;
    }

    public getMode(): string | null {
        return this.currentStepData()?.mode ?? null;
    }

    public playingPlayerNames(): string[] {
        // Le présentateur ne joue pas : le créateur du salon endosse le rôle
        // plutôt que de jouer. L'arbitre, lui, continue à jouer normalement
        // (sinon aucune différence avec le présentateur) — il peut même
        // corriger son propre verdict, cf. overrideAnswer de chaque moteur.
        return Object.values(this.players)
            .filter((p) => p.role === "player" || (p.role === "creator" && !this.room.withPresentator))
            .map((p) => p.name);
    }

    /** Nom du créateur, quand il est présentateur (n'existe pas sinon). */
    public presentatorName(): string | undefined {
        if (!this.room.withPresentator) return undefined;
        return Object.values(this.players).find((p) => p.role === "creator")?.name;
    }

    /** Nom du créateur, quand il est arbitre (n'existe pas sinon). */
    public refereeName(): string | undefined {
        if (!this.room.withRef) return undefined;
        return Object.values(this.players).find((p) => p.role === "creator")?.name;
    }

    /** Étape "dynamique" : pas de quizz en base, thème par joueur assigné dans le salon pour cette étape précise. */
    public isDynamicThemeStep(step: any): boolean {
        return Boolean(step?.dynamicThemeStep) && (step?.mode === "GRID" || step?.mode === "TIMER");
    }

    /**
     * Vérifie que TOUTES les étapes dynamiques de l'émission (pas seulement
     * celle sur le point d'être lancée) ont un thème assigné pour chaque
     * joueur actuellement actif : sans ça, rien n'empêchait de lancer une
     * émission qui exige des thèmes plus loin dans le déroulé sans les avoir
     * préparés à l'avance.
     */
    public allDynamicStepsFilled(): boolean {
        const steps = this.room?.emission?.steps;
        if (!Array.isArray(steps)) return true;
        const activeNames = this.activeEmissionPlayerNames();
        return steps.every((s: any, index: number) => {
            if (!this.isDynamicThemeStep(s)) return true;
            return activeNames.every((name) => Boolean(this.room.getPlayerTheme(index, name)));
        });
    }

    /**
     * Participants réels d'une épreuve à thème d'émission : un joueur éliminé
     * ne joue plus, donc ne doit ni bloquer le lancement (gate ci-dessus) ni
     * être compté dans la grille — c'est son thème qui doit au contraire
     * nourrir le pool neutre (cf. Thread.startGrid).
     */
    public activeEmissionPlayerNames(): string[] {
        return this.playingPlayerNames().filter((name) => !this.room.isEliminated(name));
    }

    /**
     * Appelée via `onFinished` par le moteur de jeu actif, quel qu'il soit,
     * une fois l'épreuve terminée avec le score gagné par chacun.
     *
     * Sans présentateur : comportement inchangé, application immédiate et
     * passage à l'étape suivante. Avec un présentateur : les scores restent
     * en attente le temps qu'il valide (ou ajuste) un écran bonus/malus —
     * cf. `confirmBonusMalus`.
     */
    public finishStep(ranking: { name: string; score: number }[]): void {
        if (this.room.withPresentator) {
            this.pendingStepRanking = ranking;
            this.io.to(String(this.room.id)).emit("emission:bonusMalus", { ranking });
            logger.debug(`[thread] étape ${this.currentStep} terminée, en attente du bonus/malus du présentateur`);
            return;
        }

        this.finalizeStep(ranking, {});
    }

    /**
     * Réservé au présentateur : valide le score de l'épreuve qui vient de se
     * terminer, avec d'éventuels ajustements bonus/malus par joueur, puis
     * passe à la suite. Renvoie false si le présentateur n'a pas les droits
     * ou qu'aucune épreuve n'attend de validation.
     */
    public confirmBonusMalus(requester: string, adjustments: Record<string, number>): boolean {
        if (this.players[requester]?.role !== "creator") return false;
        if (!this.pendingStepRanking) return false;

        const ranking = this.pendingStepRanking;
        this.pendingStepRanking = null;
        this.finalizeStep(ranking, adjustments);
        return true;
    }

    /**
     * Cumule le score (+ ajustements) sur le score persistant, puis avance.
     * En mode équipe, une épreuve (Timer/Pick&Ban) peut renvoyer un
     * classement dont `name` est un id d'équipe plutôt qu'un joueur — on
     * crédite alors l'équipe plutôt qu'un joueur inexistant.
     */
    private finalizeStep(ranking: { name: string; score: number }[], adjustments: Record<string, number>): void {
        const finishedStep = this.currentStepData();
        const teamIds = new Set(this.room.getTeams().map((t) => t.id));
        for (const entry of ranking) {
            const delta = entry.score + (adjustments[entry.name] ?? 0);
            if (teamIds.has(entry.name)) {
                this.room.addTeamScore(entry.name, delta);
            } else if (this.players[entry.name]) {
                this.players[entry.name].score += delta;
            }
        }

        this.applyStepElimination(finishedStep, ranking, adjustments);

        if (finishedStep?.dissolveTeamsAfter) {
            this.room.clearTeams();
            for (const name of this.playingPlayerNames()) {
                if (this.players[name]) this.players[name].score = 0;
            }
            logger.debug(`[thread] équipes dissoutes et points remis à zéro après l'étape ${this.currentStep}`);
        }

        this.currentStep += 1;
        this.started = false;
        this.broadcastRoomInfo();

        const nextStep = this.currentStepData();
        const roomId = String(this.room.id);
        if (nextStep) {
            this.io.to(roomId).emit("emission:stepFinished", {
                ranking,
                nextStepIndex: this.currentStep,
                nextStepMode: nextStep.mode,
                nextStepName: nextStep.name,
            });
            logger.debug(`[thread] étape ${this.currentStep - 1} terminée, passage à l'étape ${this.currentStep} (${nextStep.mode})`);
        } else {
            // Pendant une phase en équipe, les points gagnés sont crédités à
            // l'équipe (cf. plus haut), jamais recopiés sur le score
            // individuel des membres — sauf dissolution, qui le remet à 0
            // plutôt que de le créditer. Si l'émission se termine directement
            // sur une étape en équipe (duo gagnant sans duel décisif, cas
            // volontairement accepté comme fin de partie), il faut donc
            // rajouter le score de l'équipe courante de chacun pour que le
            // classement final reflète ce qu'ils ont réellement gagné.
            const finalRanking = Object.values(this.players)
                .filter((p) => p.role === "player" || (p.role === "creator" && !this.room.withPresentator))
                .map((p) => ({ name: p.name, score: p.score + (this.room.teamOf(p.name)?.score ?? 0) }))
                .sort((a, b) => b.score - a.score)
                .map((p, i) => ({ rank: i + 1, name: p.name, score: p.score }));
            this.io.to(roomId).emit("emission:finished", { ranking: finalRanking });
            logger.debug(`[thread] émission terminée`);
        }
    }

    /**
     * `step.outputCount` élimine automatiquement les entrées du classement qui
     * ne rentrent pas dans le quota, sans intervention du MJ. En mode équipe,
     * `ranking` est keyed par id d'équipe (comme le crédit de score juste
     * au-dessus) : une entrée = un duo, jamais un seul de ses 2 membres.
     */
    private applyStepElimination(
        finishedStep: any,
        ranking: { name: string; score: number }[],
        adjustments: Record<string, number>
    ): void {
        const outputCount = Number(finishedStep?.outputCount);
        if (!Number.isFinite(outputCount) || ranking.length === 0 || outputCount >= ranking.length) return;

        const scored = ranking
            .map((entry) => ({ name: entry.name, score: entry.score + (adjustments[entry.name] ?? 0) }))
            .sort((a, b) => b.score - a.score);

        const teams = this.room.getTeams();
        for (const entry of scored.slice(outputCount)) {
            const team = teams.find((t) => t.id === entry.name);
            if (team) {
                team.members.forEach((m) => this.room.eliminatePlayer(m));
            } else {
                this.room.eliminatePlayer(entry.name);
            }
        }
        logger.debug(`[thread] élimination auto : ${ranking.length - outputCount} sorti(s) après l'étape (outputCount=${outputCount})`);
    }

    /**
     * Étape sans moteur de jeu : forme des équipes par classement (score
     * cumulé décroissant, appariées par extrémités opposées — 1er+dernier,
     * 2e+avant-dernier...) puis enchaîne aussitôt sur la suite. Les étapes
     * Timer/Pick&Ban qui suivent basculent alors automatiquement en jeu par
     * équipe dès qu'elles constatent que `room.getTeams()` n'est plus vide.
     */
    public startTeamFormation(step: any): void {
        const teamSize = step.teamSize ?? 2;
        const ranked = [...this.playingPlayerNames()]
            .sort((a, b) => (this.players[b]?.score ?? 0) - (this.players[a]?.score ?? 0));

        const pairs: { members: [string, string] }[] = [];
        if (teamSize === 2) {
            for (let i = 0; i < Math.floor(ranked.length / 2); i++) {
                pairs.push({ members: [ranked[i], ranked[ranked.length - 1 - i]] });
            }
        } else {
            // Pas le cas d'usage visé (toujours des duos) : repli simple par
            // tranches contiguës du classement plutôt que par extrémités.
            for (let i = 0; i + teamSize <= ranked.length; i += teamSize) {
                pairs.push({ members: ranked.slice(i, i + teamSize) as [string, string] });
            }
        }

        this.room.formTeams(pairs);
        logger.debug(`[thread] ${pairs.length} équipe(s) formée(s) par classement`);

        // Enchaîne directement, même avec un présentateur : il n'y a aucun
        // score à réviser sur une étape qui ne fait que composer les équipes,
        // inutile de lui montrer un écran bonus/malus vide.
        this.finalizeStep([], {});
    }

    /**
     * L'équipe en tête (score cumulé) fournit ses 2 membres ; sans équipe
     * (émission qui ne serait pas passée par TEAM_FORMATION), on retombe sur
     * les 2 premiers joueurs actifs — un duel a toujours besoin d'exactement
     * 2 participants.
     */
    public resolveDuelParticipants(): [string, string] | null {
        const teams = this.room.getTeams();
        if (teams.length > 0) {
            const top = [...teams].sort((a, b) => b.score - a.score)[0];
            return top.members;
        }
        const fallback = this.playingPlayerNames();
        if (fallback.length < 2) return null;
        return [fallback[0], fallback[1]];
    }

    /**
     * Une épreuve vient de se terminer et attend le bonus/malus du
     * présentateur : sans ça, quiconque recharge la page pendant cette
     * attente ne revoit plus jamais cet écran (émis une seule fois). Appelée
     * par `Thread.sendStateTo` en plus de l'état des moteurs de jeu.
     */
    public resendPendingBonusMalus(): void {
        if (this.pendingStepRanking) {
            this.io.to(String(this.room.id)).emit("emission:bonusMalus", { ranking: this.pendingStepRanking });
        }
    }

    /** Rafraîchit la vue du salon chez tout le monde (lobby : qui a un thème, qui est éliminé...). */
    public broadcastRoomInfo(): void {
        this.io.to(String(this.room.id)).emit("infoRoom", this.room.getInfo());
    }

    // --- Émission (multi-épreuves) ------------------------------------------
    // Seul le créateur du salon peut assigner un thème ou éliminer un joueur :
    // ce sont des décisions d'orchestration de l'émission, pas du jeu en cours.
    public assignPlayerTheme(requester: string, target: string, stepIndex: number, theme: any): boolean {
        if (this.players[requester]?.role !== "creator") return false;
        if (!this.players[target]) return false;
        this.room.assignPlayerTheme(stepIndex, target, theme);
        this.broadcastRoomInfo();
        return true;
    }

    public eliminatePlayer(requester: string, target: string): boolean {
        if (this.players[requester]?.role !== "creator") return false;
        if (!this.players[target]) return false;
        this.room.eliminatePlayer(target);
        this.broadcastRoomInfo();
        return true;
    }

    /**
     * Réservé au présentateur : remet à zéro les scores cumulés à la demande,
     * même quand l'étape courante n'a pas `resetPoint` (cf. `Thread.start`) —
     * un filet de rattrapage manuel pour un cas non prévu au montage de l'émission.
     */
    public resetScores(requester: string): boolean {
        if (this.players[requester]?.role !== "creator" || !this.room.withPresentator) return false;
        for (const name of this.playingPlayerNames()) {
            if (this.players[name]) this.players[name].score = 0;
        }
        for (const team of this.room.getTeams()) {
            this.room.resetTeamScore(team.id);
        }
        this.broadcastRoomInfo();
        logger.debug(`[thread] scores remis à zéro manuellement par le présentateur ${requester}`);
        return true;
    }

    /** Réservé au présentateur : choisit ce que l'écran `/show` affiche en ce moment. */
    public setShowView(requester: string, view: ShowView): boolean {
        if (this.players[requester]?.role !== "creator" || !this.room.withPresentator) return false;
        this.showView = view;
        this.io.to(String(this.room.id)).emit(SHOW_EVENTS.state, { view });
        return true;
    }
}
