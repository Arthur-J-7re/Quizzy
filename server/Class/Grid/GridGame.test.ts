import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import GridGame, { type GridConfig } from "./GridGame";
import type { GridState } from "../../../shared-types/grid";

interface Emission {
    target: string;
    event: string;
    payload: any;
}

/** Faux io : enregistre les émissions au lieu de les envoyer. */
function makeIo() {
    const emissions: Emission[] = [];
    const io: any = {
        to: (target: string) => ({
            emit: (event: string, payload: any) => emissions.push({ target, event, payload }),
        }),
    };
    return { io, emissions };
}

const QUESTION_IDS = [1, 2, 3, 4, 5, 6, 90, 91, 92];

/** Toutes en QCM avec 2 comme bonne réponse, pour simplifier les assertions. */
const questions: Record<number, any> = Object.fromEntries(
    QUESTION_IDS.map((id) => [
        id,
        {
            question_id: id,
            mode: "QCM",
            title: `Question ${id}`,
            choices: { ans1: "a", ans2: "b", ans3: "c", ans4: "d" },
            answer: 2,
        },
    ])
);

const config: GridConfig = {
    width: 3,
    height: 3,
    cellsPerTheme: 3,
    memorizeDurationMs: 50,
    answerDurationMs: 3000,
    themes: [
        { theme_id: 10, title: "Cinéma", questions: [1, 2, 3] },
        { theme_id: 20, title: "Histoire", questions: [4, 5, 6] },
    ],
    neutralQuestions: [90, 91, 92],
};

describe("GridGame", () => {
    let io: any;
    let emissions: Emission[];
    let game: GridGame;

    const eventsOf = (event: string) => emissions.filter((e) => e.event === event);
    const lastState = (): GridState => {
        const states = eventsOf("grid:state");
        return states[states.length - 1].payload;
    };

    beforeEach(async () => {
        ({ io, emissions } = makeIo());
        game = new GridGame("room1", io, config, async (ids) =>
            ids.map((i) => questions[i]).filter(Boolean)
        );
        game.setSocketIdResolver((name) => `socket-${name}`);
    });

    describe("mise en place", () => {
        it("construit la grille et montre les couleurs pendant la mémorisation", async () => {
            await game.start(["alice", "bob"]);

            const memo = eventsOf("grid:memorize")[0];
            expect(memo).toBeDefined();

            const state: GridState = memo.payload.state;
            expect(state.cells).toHaveLength(9);
            expect(state.cells.every((c) => c.color !== undefined)).toBe(true);

            // 2 thèmes × 3 cases = 6 à thème, le reste en neutre
            expect(state.cells.filter((c) => c.themeId !== null)).toHaveLength(6);
            expect(state.cells.filter((c) => c.themeId === null)).toHaveLength(3);
        });

        it("attribue un thème et une couleur distincte à chaque joueur", async () => {
            await game.start(["alice", "bob"]);
            const state: GridState = eventsOf("grid:memorize")[0].payload.state;

            expect(state.players).toHaveLength(2);
            expect(state.players[0].color).not.toBe(state.players[1].color);
            expect(state.players[0].themeTitle).not.toBe(state.players[1].themeTitle);
        });

        it("refuse de démarrer s'il y a moins de thèmes que de joueurs", async () => {
            await game.start(["alice", "bob", "carol"]);

            expect(eventsOf("grid:memorize")).toHaveLength(0);
            expect(eventsOf("grid:error")[0].payload.message).toContain("2 thème(s) jouable(s)");
        });

        it("masque les couleurs à la fin de la mémorisation", async () => {
            vi.useFakeTimers();
            await game.start(["alice", "bob"]);
            vi.advanceTimersByTime(config.memorizeDurationMs + 10);

            const state = lastState();
            expect(state.phase).toBe("playing");
            expect(state.cells.every((c) => c.color === undefined)).toBe(true);
            expect(state.currentPlayer).toBeTruthy();
            vi.useRealTimers();
        });
    });

    describe("tour de jeu", () => {
        let current: string;
        let other: string;

        beforeEach(async () => {
            vi.useFakeTimers();
            await game.start(["alice", "bob"]);
            vi.advanceTimersByTime(config.memorizeDurationMs + 10);
            current = lastState().currentPlayer!;
            other = current === "alice" ? "bob" : "alice";
        });

        it("refuse qu'un joueur joue hors de son tour", () => {
            game.pick(other, 0);
            expect(eventsOf("grid:error")[0].payload.message).toBe("Ce n'est pas votre tour.");
        });

        it("n'envoie l'énoncé qu'au joueur actif, sans la bonne réponse", () => {
            game.pick(current, 0);

            const toRoom = eventsOf("grid:question").find((e) => e.target === "room1");
            const toPlayer = eventsOf("grid:question").find((e) => e.target === `socket-${current}`);

            expect(toRoom!.payload.question).toBeUndefined();
            expect(toPlayer!.payload.question).toBeDefined();
            expect(toPlayer!.payload.question.answer).toBeUndefined();
        });

        it("compte les points sur une bonne réponse et passe la main", () => {
            game.pick(current, 0);
            game.answer(current, 2);

            const result = eventsOf("grid:result")[0].payload;
            expect(result.correct).toBe(true);
            expect(result.pointsEarned).toBe(1);

            const state = lastState();
            expect(state.players.find((p) => p.name === current)!.score).toBe(1);
            expect(state.currentPlayer).toBe(other);
        });

        it("ne donne aucun point sur une mauvaise réponse", () => {
            game.pick(current, 0);
            game.answer(current, 4);

            const result = eventsOf("grid:result")[0].payload;
            expect(result.correct).toBe(false);
            expect(result.pointsEarned).toBe(0);
        });

        it("laisse la case jouée révélée", () => {
            game.pick(current, 0);
            game.answer(current, 2);

            const cell = lastState().cells.find((c) => c.index === 0)!;
            expect(cell.taken).toBe(true);
            expect(cell.color).toBeDefined();
            expect(cell.takenBy).toBe(current);
        });

        it("refuse une case déjà jouée", () => {
            game.pick(current, 0);
            game.answer(current, 2);

            const next = lastState().currentPlayer!;
            game.pick(next, 0);
            expect(eventsOf("grid:error").at(-1)!.payload.message).toBe("Cette case a déjà été jouée.");
        });

        it("compte une non-réponse dans le temps imparti comme une erreur", () => {
            game.pick(current, 0);
            vi.advanceTimersByTime(config.answerDurationMs + 10);

            const result = eventsOf("grid:result")[0].payload;
            expect(result.correct).toBe(false);
            expect(result.givenAnswer).toBeNull();
        });

        it("termine la partie et classe les joueurs quand la grille est pleine", () => {
            for (let i = 0; i < 20; i++) {
                const state = lastState();
                if (state.phase === "finished") break;
                const free = state.cells.find((c) => !c.taken);
                if (!free) break;
                game.pick(state.currentPlayer!, free.index);
                // seul "alice" répond juste, pour un classement déterministe
                game.answer(state.currentPlayer!, state.currentPlayer === "alice" ? 2 : 4);
            }

            const finished = eventsOf("grid:finished").at(-1)!.payload;
            expect(finished.ranking).toHaveLength(2);
            expect(finished.ranking[0].rank).toBe(1);
            expect(finished.ranking[0].name).toBe("alice");
            expect(finished.ranking[0].score).toBeGreaterThan(finished.ranking[1].score);
            expect(lastState().phase).toBe("finished");
        });

        afterEach(() => {
            game.dispose();
            vi.useRealTimers();
        });
    });
});
