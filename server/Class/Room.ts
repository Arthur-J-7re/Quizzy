import User from '../Interface/User';
import { Theme } from '../Interface/Theme';
import Team from '../Interface/Team';
import RoomInterface from "../Interface/Room";
import Thread from './Thread/_Thread';

export default class Room implements RoomInterface {
    id: string;
    name: string;
    creator: number | string;
    isPrivate: boolean;
    password: string;
    emission: any; //type Emission à rajouter une fois créés
    withRef: boolean;
    withPresentator: boolean;
    numberOfParticipantMax: number;
    players: { [name: string]: User };

    thread : Thread;
    onClose : (id : string) => void;
    private inactivityTimer?: NodeJS.Timeout;
    private readonly INACTIVITY_DELAY = 180_000; // 3 min

    /**
     * Thème associé à chaque joueur, par étape "dynamique" (Grid/Timer avec
     * `step.dynamicThemeStep`) : une même émission peut enchaîner 2 étapes à
     * thème avec des thèmes différents par joueur, donc keyed par index
     * d'étape plutôt qu'un thème unique pour toute la durée du salon. Alimenté
     * dans le lobby, avant que l'étape correspondante ne soit lancée ; lu par
     * EmissionGridGame/EmissionTimerGame pour savoir quel thème revient à quel
     * joueur encore en lice.
     */
    private playerThemes: Record<number, Record<string, Theme>> = {};

    /**
     * Joueurs éliminés au fil des épreuves. Aucune épreuve n'appelle encore
     * `eliminatePlayer` (les modes à élimination ne sont pas implémentés) :
     * ce sera aux futurs moteurs de jeu à le faire quand un joueur perd.
     */
    private eliminatedPlayers = new Set<string>();

    /**
     * Équipes formées dynamiquement en cours d'émission (étape
     * TEAM_FORMATION). Comme playerThemes/eliminatedPlayers : un état de
     * session, jamais persisté dans le document Emission. Vide tant qu'aucune
     * étape TEAM_FORMATION n'a tourné.
     */
    private teams: Team[] = [];
    private nextTeamId = 1;

    constructor(id: string, name: string, creator: number | string, 
        isPrivate: boolean, password: string, emission: any, withRef: boolean, 
        withPresentator: boolean, numberOfParticipantMax: number, players: { [name: string]: User,},onClose: (id : string) => void) {
        this.id = id;
        this.name = name;
        this.creator = creator;
        this.isPrivate = isPrivate;
        this.password = password;
        this.emission = emission;
        this.withRef = withRef;
        this.withPresentator = withPresentator;
        this.numberOfParticipantMax = numberOfParticipantMax;
        this.players = players;
        this.thread = new Thread(this);
        this.resetInactivityTimer();
        this.onClose = onClose;
    }

    public getId(): number | string {
        return this.id;
    }
    
    public getThread(): Thread {
        return this.thread;
    }

    public getPlayers(): { [name: string]: User } {
        return this.players;
    }

    public getCreator(): number | string {
        return this.creator;
    }

    public touch() {
        this.resetInactivityTimer();
    }

    private resetInactivityTimer() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }

        this.inactivityTimer = setTimeout(() => {
            this.onClose(this.id);
        }, this.INACTIVITY_DELAY);
    }

    public dispose() {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
        }
    }

    public addPlayer(user: User): void {
        this.players[user.name] = user;
    }

    /** Associe un thème à un joueur pour une étape "dynamique" précise. */
    public assignPlayerTheme(stepIndex: number, username: string, theme: Theme): void {
        if (!this.playerThemes[stepIndex]) this.playerThemes[stepIndex] = {};
        this.playerThemes[stepIndex][username] = theme;
    }

    public getPlayerTheme(stepIndex: number, username: string): Theme | undefined {
        return this.playerThemes[stepIndex]?.[username];
    }

    /** Marque un joueur éliminé : son thème rejoint le pool des cases neutres des futures épreuves Grid. */
    public eliminatePlayer(username: string): void {
        this.eliminatedPlayers.add(username);
    }

    public isEliminated(username: string): boolean {
        return this.eliminatedPlayers.has(username);
    }

    /** Thèmes des joueurs qui ont un thème assigné pour cette étape et sont encore en lice. */
    public getActivePlayerThemes(stepIndex: number): { username: string; theme: Theme }[] {
        return Object.entries(this.playerThemes[stepIndex] ?? {})
            .filter(([username]) => !this.eliminatedPlayers.has(username))
            .map(([username, theme]) => ({ username, theme }));
    }

    /** Thèmes des joueurs déjà éliminés pour cette étape : source des cases neutres du Grid "émission". */
    public getEliminatedPlayerThemes(stepIndex: number): Theme[] {
        return Object.entries(this.playerThemes[stepIndex] ?? {})
            .filter(([username]) => this.eliminatedPlayers.has(username))
            .map(([, theme]) => theme);
    }

    /**
     * Remplace les équipes courantes par ces paires. Appelé une fois par
     * l'étape TEAM_FORMATION (classement automatique) — n'importe quelle
     * étape ultérieure qui consulte `getTeams()`/`teamOf()` bascule alors en
     * jeu par équipe (Timer, Pick & Ban).
     */
    public formTeams(pairs: { members: [string, string] }[]): void {
        this.teams = pairs.map((pair) => ({
            id: `team-${this.nextTeamId++}`,
            name: pair.members.join(" & "),
            members: pair.members,
            score: 0,
        }));
    }

    public getTeams(): Team[] {
        return this.teams;
    }

    public teamOf(username: string): Team | undefined {
        return this.teams.find((t) => t.members.includes(username));
    }

    public addTeamScore(teamId: string, points: number): void {
        const team = this.teams.find((t) => t.id === teamId);
        if (team) team.score += points;
    }

    public resetTeamScore(teamId: string): void {
        const team = this.teams.find((t) => t.id === teamId);
        if (team) team.score = 0;
    }

    /** Dissout les équipes courantes : les étapes suivantes rejouent en individuel. */
    public clearTeams(): void {
        this.teams = [];
    }



    /**
     * Vue du salon envoyée au client (écran de salon et reprise de partie).
     * Renvoyait `undefined` : RoomHub plantait sur `data.name`.
     * Le mot de passe n'est évidemment jamais inclus.
     */
    public getInfo() {
        return {
            room_id: this.id,
            name: this.name,
            creator: this.creator,
            isPrivate: this.isPrivate,
            withRef: this.withRef,
            withPresentator: this.withPresentator,
            numberOfParticipantMax: this.numberOfParticipantMax,
            emission: this.emission,
            mode: this.thread.getMode(),
            started: this.thread.started,
            currentStep: this.thread.currentStep,
            totalSteps: Array.isArray(this.emission?.steps) ? this.emission.steps.length : 0,
            teams: this.teams,
            player: Object.fromEntries(
                Object.entries(this.players).map(([name, user]) => [
                    name,
                    {
                        name: user.name,
                        role: user.role,
                        connected: user.connected,
                        score: user.score,
                        // Thèmes assignés à ce joueur pour chaque étape
                        // "dynamique" (Grid/Timer à thème par joueur), keyed
                        // par index d'étape.
                        themes: Object.fromEntries(
                            Object.entries(this.playerThemes)
                                .filter(([, byUsername]) => byUsername[name])
                                .map(([stepIndex, byUsername]) => [
                                    stepIndex,
                                    { theme_id: byUsername[name].theme_id, title: byUsername[name].title },
                                ])
                        ),
                        eliminated: this.eliminatedPlayers.has(name),
                        // Équipe formée en cours d'émission (TEAM_FORMATION), si applicable.
                        teamId: this.teamOf(name)?.id ?? null,
                    },
                ])
            ),
        };
    }
}