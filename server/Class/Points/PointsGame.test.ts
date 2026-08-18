import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import PointsGame, { type PointsConfig } from "./PointsGame";
import type { PointsState } from "../../../shared-types/points";

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

const QUESTION_IDS = [1, 2, 3];
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

/** Pioche dans l'ordre de QUESTION_IDS, en excluant celles déjà tirées. */
function makeDrawer(pool: number[] = QUESTION_IDS) {
    return async (excludedIds: number[]) => {
        const nextId = pool.find((id) => !excludedIds.includes(id));
        return nextId ? questions[nextId] : null;
    };
}

const config: PointsConfig = {
    roundCount: 3,
    answerDurationMs: 3000,
};

describe("PointsGame", () => {
    let io: any;
    let emissions: Emission[];
    let game: PointsGame;

    const eventsOf = (event: string) => emissions.filter((e) => e.event === event);
    const lastState = (): PointsState => {
        const states = eventsOf("points:state");
        return states[states.length - 1].payload;
    };

    beforeEach(() => {
        ({ io, emissions } = makeIo());
        game = new PointsGame("room1", io, config, makeDrawer());
        game.setSocketIdResolver((name) => `socket-${name}`);
    });

    afterEach(() => {
        game.dispose();
        vi.useRealTimers();
    });

    it("refuse de démarrer sans joueur", async () => {
        await game.start([]);
        expect(eventsOf("points:error")[0].payload.message).toContain("au moins un joueur");
    });

    it("tire une question et résout les réponses avec le barème classique", async () => {
        await game.start(["alice", "bob"]);
        game.answer("alice", 2); // correct
        game.answer("bob", 4); // incorrect

        const result = eventsOf("points:result")[0].payload;
        expect(result.answers.find((a: any) => a.player === "alice").pointsEarned).toBe(1);
        expect(result.answers.find((a: any) => a.player === "bob").pointsEarned).toBe(0);
    });

    it("arrête proprement quand le réservoir de questions s'épuise avant roundCount", async () => {
        vi.useFakeTimers();
        game = new PointsGame("room1", io, config, makeDrawer([1])); // une seule question dispo
        game.setSocketIdResolver((name) => `socket-${name}`);

        await game.start(["alice"]);
        game.answer("alice", 2);
        // nextQuestion() est async (draw en attente d'une promesse) : il faut
        // la variante qui laisse les microtasks se résoudre entre deux timers.
        await vi.advanceTimersByTimeAsync(4000 + 10);

        expect(lastState().phase).toBe("finished");
    });

    it("barème par difficulté : ignore correctPoints/wrongPoints classiques quand actif", async () => {
        const hardQuestion = { question_id: 1, mode: "QCM", title: "Q", choices: { ans1: "a", ans2: "b", ans3: "c", ans4: "d" }, answer: 2, level: 9 };
        const drawer = async () => hardQuestion;
        const diffConfig: PointsConfig = { roundCount: 1, answerDurationMs: 3000, difficultyScoring: true };
        game = new PointsGame("room1", io, diffConfig, drawer);
        game.setSocketIdResolver((name) => `socket-${name}`);

        await game.start(["alice"]);
        game.answer("alice", 2);

        const result = eventsOf("points:result")[0].payload;
        // Niveau 9 (8-10) -> 3 points dans le barème par difficulté, pas 1.
        expect(result.answers[0].pointsEarned).toBe(3);
    });

    it("termine la partie et classe les joueurs une fois roundCount atteint", async () => {
        vi.useFakeTimers();
        await game.start(["alice", "bob"]);
        for (let i = 0; i < config.roundCount; i++) {
            game.answer("alice", 2);
            game.answer("bob", 4);
            await vi.advanceTimersByTimeAsync(4000 + 10);
        }

        const finished = eventsOf("points:finished").at(-1)!.payload;
        expect(finished.ranking[0].name).toBe("alice");
        expect(finished.ranking[0].score).toBe(3);
        expect(lastState().phase).toBe("finished");
    });

    it("mode présentateur : n'avance qu'à l'appel de hostAdvance", async () => {
        const hostedConfig: PointsConfig = { ...config, hosted: true, presentatorName: "mj" };
        const hostedGame = new PointsGame("room1", io, hostedConfig, makeDrawer());
        hostedGame.setSocketIdResolver((name) => `socket-${name}`);

        await hostedGame.start(["alice"]);
        hostedGame.answer("alice", 2);
        expect(eventsOf("points:question")).toHaveLength(1);

        hostedGame.hostAdvance("mj");
        // hostAdvance déclenche nextQuestion() (async, draw en attente) sans
        // passer par un timer : on laisse les microtasks se résoudre.
        await Promise.resolve();
        await Promise.resolve();
        expect(eventsOf("points:question")).toHaveLength(2);
        hostedGame.dispose();
    });

    it("arbitre : overrideAnswer inverse un verdict de réponse libre et ajuste le score", async () => {
        const freeQuestion = { question_id: 1, mode: "FREE", title: "Q1", answers: ["paris"] };
        const refConfig: PointsConfig = { roundCount: 1, answerDurationMs: 3000, hasReferee: true, refereeName: "ref" };
        const refGame = new PointsGame("room1", io, refConfig, async () => freeQuestion);
        refGame.setSocketIdResolver((name) => `socket-${name}`);

        await refGame.start(["alice"]);
        refGame.answer("alice", "wrong answer");
        expect(lastState().players.find((p) => p.name === "alice")!.score).toBe(0);

        refGame.overrideAnswer("alice", true);
        expect(lastState().players.find((p) => p.name === "alice")!.score).toBe(1);
        refGame.dispose();
    });
});
