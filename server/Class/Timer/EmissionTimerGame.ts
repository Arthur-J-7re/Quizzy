import type { Server } from "socket.io";
import TimerGame, { type TimerConfig, type TimerThemeInput, type QuestionLoader } from "./TimerGame";

/** Thème assigné à un joueur encore en lice, pour cette étape précise. */
export interface ActivePlayerTheme {
    username: string;
    theme: TimerThemeInput;
}

export interface EmissionTimerConfig extends Omit<TimerConfig, "themes"> {
    /** Thème de chaque joueur encore en lice, assigné pour cette étape. */
    activeThemes: ActivePlayerTheme[];
}

/**
 * Variante Timer utilisée au sein d'une émission à plusieurs épreuves.
 *
 * Comme EmissionGridGame : chaque joueur reçoit un thème personnel pour CETTE
 * étape "dynamique" précise (assigné dans le lobby avant son lancement), pas
 * nécessairement le même qu'une autre étape dynamique de la même émission.
 * Quand l'épreuve Timer arrive, chaque joueur encore en lice joue avec son
 * propre thème plutôt que d'en tirer un au hasard dans le vivier du quizz.
 */
export default class EmissionTimerGame extends TimerGame {
    constructor(
        roomId: string,
        io: Server,
        private readonly emissionConfig: EmissionTimerConfig,
        loadQuestions: QuestionLoader
    ) {
        super(roomId, io, emissionConfig, loadQuestions);
    }

    protected override resolvePlayerThemes(
        playerNames: string[]
    ): { name: string; theme: TimerThemeInput }[] | null {
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
}
