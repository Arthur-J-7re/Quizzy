import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import TimerGame, { type TimerConfig } from "./TimerGame";
import type { TimerState } from "../../../shared-types/timer";

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

const QUESTION_IDS = [1, 2, 3, 4];
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

const config: TimerConfig = {
    turnDurationMs: 100000,
    themes: [
        { theme_id: 10, title: "Cinéma", questions: [1, 2] },
        { theme_id: 20, title: "Histoire", questions: [3, 4] },
    ],
};

describe("TimerGame", () => {
    let io: any;
    let emissions: Emission[];
    let game: TimerGame;

    const eventsOf = (event: string) => emissions.filter((e) => e.event === event);
    const lastState = (): TimerState => {
        const states = eventsOf("timer:state");
        return states[states.length - 1].payload;
    };

    beforeEach(() => {
        ({ io, emissions } = makeIo());
        game = new TimerGame("room1", io, config, async (ids) =>
            ids.map((i) => questions[i]).filter(Boolean)
        );
        game.setSocketIdResolver((name) => `socket-${name}`);
    });

    afterEach(() => {
        game.dispose();
        vi.useRealTimers();
    });

    it("refuse de démarrer sans joueur", async () => {
        await game.start([]);
        expect(eventsOf("timer:error")[0].payload.message).toContain("au moins un joueur");
    });

    it("attribue un thème par joueur et lance le premier tour", async () => {
        await game.start(["alice", "bob"]);
        const turnStart = eventsOf("timer:turnStart")[0].payload;
        expect(["alice", "bob"]).toContain(turnStart.player);
        expect(lastState().players).toHaveLength(2);
    });

    it("bonne réponse : score le joueur actif et enchaîne sur la question suivante", async () => {
        await game.start(["alice"]);
        const active = lastState().currentPlayer!;
        game.answer(active, 2); // correct

        const result = eventsOf("timer:result")[0].payload;
        expect(result.correct).toBe(true);
        expect(result.pointsEarned).toBe(1);
        expect(lastState().players.find((p) => p.name === active)!.score).toBe(1);
        expect(eventsOf("timer:question")).toHaveLength(2); // 1ère + suivante enchaînée
    });

    it("mauvaise réponse : remet la question en fin de file, aucun point", async () => {
        await game.start(["alice"]);
        const active = lastState().currentPlayer!;
        game.answer(active, 4); // incorrect

        const result = eventsOf("timer:result")[0].payload;
        expect(result.correct).toBe(false);
        expect(result.pointsEarned).toBe(0);
        expect(lastState().players.find((p) => p.name === active)!.score).toBe(0);
    });

    it("bonus de série : la 2e bonne réponse consécutive rapporte le bonus configuré", async () => {
        const bonusConfig: TimerConfig = {
            ...config,
            scoring: { correctPoints: 1, wrongPoints: 0, streakBonus: { everyN: 2, bonusPoints: 5 } },
        };
        game = new TimerGame("room1", io, bonusConfig, async (ids) =>
            ids.map((i) => questions[i]).filter(Boolean)
        );
        game.setSocketIdResolver((name) => `socket-${name}`);

        await game.start(["alice"]);
        const active = lastState().currentPlayer!;
        game.answer(active, 2); // 1ère bonne : +1
        game.answer(active, 2); // 2e bonne : streak 2 -> +1 + bonus 5

        const results = eventsOf("timer:result");
        expect(results[1].payload.pointsEarned).toBe(6);
    });

    it("termine le tour au bout du temps imparti et passe au joueur suivant", async () => {
        vi.useFakeTimers();
        await game.start(["alice", "bob"]);
        const first = lastState().currentPlayer!;
        const second = first === "alice" ? "bob" : "alice";

        vi.advanceTimersByTime(config.turnDurationMs + 10);

        const turnEnd = eventsOf("timer:turnEnd")[0].payload;
        expect(turnEnd.player).toBe(first);
        expect(lastState().currentPlayer).toBe(second);
    });

    it("termine la partie et classe les joueurs une fois tous les tours joués", async () => {
        vi.useFakeTimers();
        await game.start(["alice", "bob"]);

        for (let i = 0; i < 2; i++) {
            const active = lastState().currentPlayer!;
            game.answer(active, 2);
            game.answer(active, 2);
            vi.advanceTimersByTime(config.turnDurationMs + 10);
        }

        const finished = eventsOf("timer:finished").at(-1)!.payload;
        expect(finished.ranking).toHaveLength(2);
        expect(finished.ranking[0].score).toBeGreaterThanOrEqual(finished.ranking[1].score);
        expect(lastState().phase).toBe("finished");
    });

    it("mode présentateur : hostJudge tranche à la place de la vérification automatique", async () => {
        const hostedConfig: TimerConfig = { ...config, hosted: true, presentatorName: "mj" };
        const hostedGame = new TimerGame("room1", io, hostedConfig, async (ids) =>
            ids.map((i) => questions[i]).filter(Boolean)
        );
        hostedGame.setSocketIdResolver((name) => `socket-${name}`);

        await hostedGame.start(["alice"]);
        const active = eventsOf("timer:turnStart")[0].payload.player;

        hostedGame.answer(active, "réponse à voix haute"); // ignoré : hosted=true
        expect(eventsOf("timer:result")).toHaveLength(0);

        hostedGame.hostJudge("mj", "correct");
        const result = eventsOf("timer:result")[0].payload;
        expect(result.correct).toBe(true);
        hostedGame.dispose();
    });
});
