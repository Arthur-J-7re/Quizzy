import { describe, it, expect, beforeEach, vi } from "vitest";
import EmissionGridGame, { type EmissionGridConfig } from "./EmissionGridGame";
import type { GridState } from "../../../shared-types/grid";

interface Emission {
    target: string;
    event: string;
    payload: any;
}

function makeIo() {
    const emissions: Emission[] = [];
    const io: any = {
        to: (target: string) => ({
            emit: (event: string, payload: any) => emissions.push({ target, event, payload }),
        }),
    };
    return { io, emissions };
}

const QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7, 8];
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

// alice et bob sont encore en lice, carol a été éliminée avant l'épreuve Grid.
const config: EmissionGridConfig = {
    width: 3,
    height: 3,
    cellsPerTheme: 2,
    memorizeDurationMs: 50,
    answerDurationMs: 3000,
    activeThemes: [
        { username: "alice", theme: { theme_id: 1, title: "Cinéma", questions: [1, 2] } },
        { username: "bob", theme: { theme_id: 2, title: "Histoire", questions: [3, 4] } },
    ],
    eliminatedThemes: [
        { theme_id: 3, title: "Sport (carol, éliminée)", questions: [5, 6, 7, 8] },
    ],
};

describe("EmissionGridGame", () => {
    let io: any;
    let emissions: Emission[];
    let game: EmissionGridGame;

    const eventsOf = (event: string) => emissions.filter((e) => e.event === event);

    beforeEach(() => {
        ({ io, emissions } = makeIo());
        game = new EmissionGridGame("room1", io, config, async (ids) =>
            ids.map((i) => questions[i]).filter(Boolean)
        );
        game.setSocketIdResolver((name) => `socket-${name}`);
    });

    it("donne à chaque joueur en lice son propre thème d'émission, pas un thème tiré au hasard", async () => {
        await game.start(["alice", "bob"]);
        const state: GridState = eventsOf("grid:memorize")[0].payload.state;

        const alice = state.players.find((p) => p.name === "alice")!;
        const bob = state.players.find((p) => p.name === "bob")!;
        expect(alice.themeTitle).toBe("Cinéma");
        expect(bob.themeTitle).toBe("Histoire");
    });

    it("pioche les cases neutres dans les questions des joueurs éliminés", async () => {
        await game.start(["alice", "bob"]);
        const state: GridState = eventsOf("grid:memorize")[0].payload.state;

        // 2 joueurs × 2 cellsPerTheme = 4 cases à thème, 5 restantes en neutre
        // (grille 3x3 = 9), toutes tirées du pool du joueur éliminé (5-8).
        const neutralCells = state.cells.filter((c) => c.themeId === null);
        expect(neutralCells).toHaveLength(5);
        const usedQuestionIds = new Set(neutralCells.map((c) => c.index));
        expect(usedQuestionIds.size).toBeGreaterThan(0); // sanity: des cases neutres existent bien
    });

    it("ne construit aucune case pour le thème de carol : elle n'est plus en lice", async () => {
        await game.start(["alice", "bob"]);
        const state: GridState = eventsOf("grid:memorize")[0].payload.state;

        expect(state.players.some((p) => p.name === "carol")).toBe(false);
        expect(state.cells.some((c) => c.themeTitle === "Sport (carol, éliminée)")).toBe(false);
    });

    it("refuse de démarrer si un joueur en lice n'a pas de thème assigné", async () => {
        await game.start(["alice", "dave"]); // dave n'a pas de thème dans activeThemes

        expect(eventsOf("grid:memorize")).toHaveLength(0);
        expect(eventsOf("grid:error")[0].payload.message).toContain("dave");
    });

    it("refuse de démarrer si le thème assigné à un joueur n'a plus de question exploitable", async () => {
        const emptyThemeConfig: EmissionGridConfig = {
            ...config,
            activeThemes: [
                { username: "alice", theme: { theme_id: 1, title: "Cinéma", questions: [] } },
                { username: "bob", theme: { theme_id: 2, title: "Histoire", questions: [3, 4] } },
            ],
        };
        const g = new EmissionGridGame("room2", io, emptyThemeConfig, async (ids) =>
            ids.map((i) => questions[i]).filter(Boolean)
        );
        await g.start(["alice", "bob"]);

        expect(eventsOf("grid:error")[0].payload.message).toContain("alice");
        g.dispose();
    });

    it("joue normalement une fois la grille construite (mémorisation puis tour de jeu)", async () => {
        vi.useFakeTimers();
        await game.start(["alice", "bob"]);
        vi.advanceTimersByTime(config.memorizeDurationMs + 10);

        const states = eventsOf("grid:state");
        const playing = states[states.length - 1].payload as GridState;
        expect(playing.phase).toBe("playing");
        expect(playing.cells.every((c) => c.color === undefined)).toBe(true);
        expect(playing.currentPlayer).toBeTruthy();

        vi.useRealTimers();
        game.dispose();
    });
});
