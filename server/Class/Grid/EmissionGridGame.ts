import type { Server } from "socket.io";
import GridGame, { type GridConfig, type GridThemeInput, type QuestionLoader } from "./GridGame";

/** Thème assigné à un joueur encore en lice, pour cette étape précise. */
export interface ActivePlayerTheme {
    username: string;
    theme: GridThemeInput;
}

export interface EmissionGridConfig extends Omit<GridConfig, "themes" | "neutralQuestions"> {
    /** Thème de chaque joueur encore en lice, assigné pour cette étape. */
    activeThemes: ActivePlayerTheme[];
    /** Thèmes des joueurs déjà éliminés : alimentent les cases sans thème. */
    eliminatedThemes: GridThemeInput[];
}

/**
 * Variante Grid utilisée au sein d'une émission à plusieurs épreuves.
 *
 * Chaque joueur reçoit un thème personnel pour CETTE étape "dynamique"
 * précise (assigné dans le lobby avant son lancement, cf. `Thread.startGrid`
 * et `Room.playerThemes` keyed par index d'étape) — pas nécessairement le même
 * qu'une autre étape dynamique de la même émission. Quand l'épreuve Grid arrive :
 *   - les thèmes de la grille sont ceux des joueurs ENCORE EN LICE (non
 *     éliminés) — chacun joue avec son propre thème plutôt que d'en tirer un
 *     au hasard dans un vivier partagé ;
 *   - les cases sans thème piochent dans les questions des joueurs déjà
 *     ÉLIMINÉS, au lieu d'un pool neutre configuré à part.
 *
 * Le reste du déroulé (mémorisation, tours, scoring, fin de partie) est
 * strictement identique à GridGame : seule la provenance des thèmes et du
 * pool neutre change, via les deux points d'extension prévus dans la classe
 * mère (`resolvePlayerThemes`, `getNeutralQuestionPool`).
 */
export default class EmissionGridGame extends GridGame {
    constructor(
        roomId: string,
        io: Server,
        private readonly emissionConfig: EmissionGridConfig,
        loadQuestions: QuestionLoader
    ) {
        super(roomId, io, emissionConfig, loadQuestions);
    }

    protected override resolvePlayerThemes(
        playerNames: string[]
    ): { name: string; theme: GridThemeInput }[] | null {
        const themeByPlayer = new Map(
            this.emissionConfig.activeThemes.map((a) => [a.username, a.theme])
        );

        const missing = playerNames.filter((name) => {
            const theme = themeByPlayer.get(name);
            return !theme || theme.questions.length === 0;
        });
        if (missing.length > 0) {
            this.emitError(
                `Aucun thème jouable associé pour : ${missing.join(", ")}. ` +
                "Assignez un thème à chaque joueur en lice avant de lancer l'épreuve."
            );
            return null;
        }

        return playerNames.map((name) => ({ name, theme: themeByPlayer.get(name)! }));
    }

    protected override getNeutralQuestionPool(): number[] {
        return this.emissionConfig.eliminatedThemes.flatMap((t) => t.questions);
    }
}
