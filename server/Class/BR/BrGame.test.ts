import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import BrGame, { type BrConfig } from "./BrGame";
import type { BrState } from "../../../shared-types/br";

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

const QUESTION_IDS = [1, 2, 3, 4, 5];
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

function makeDrawer(pool: number[] = QUESTION_IDS) {
    return async (excludedIds: number[]) => {
        const nextId = pool.find((id) => !excludedIds.includes(id));
        return nextId ? questions[nextId] : null;
    };
}

const config: BrConfig = {
    numberOfLife: 2,
    answerDurationMs: 3000,
};

describe("BrGame", () => {
    let io: any;
    let emissions: Emission[];
    let game: BrGame;

    const eventsOf = (event: string) => emissions.filter((e) => e.event === event);
    const lastState = (): BrState => {
        const states = eventsOf("br:state");
        return states[states.length - 1].payload;
    };

    beforeEach(() => {
        ({ io, emissions } = makeIo());
        game = new BrGame("room1", io, config, makeDrawer());
        game.setSocketIdResolver((name) => `socket-${name}`);
    });

    afterEach(() => {
        game.dispose();
        vi.useRealTimers();
    });

    it("refuse de démarrer sans joueur", async () => {
        await game.start([]);
        expect(eventsOf("br:error")[0].payload.message).toContain("au moins un joueur");
    });

    it("une mauvaise réponse coûte une vie, une bonne n'en coûte aucune", async () => {
        await game.start(["alice", "bob"]);
        game.answer("alice", 2); // correct
        game.answer("bob", 4); // incorrect

        const result = eventsOf("br:result")[0].payload;
        expect(result.answers.find((a: any) => a.player === "alice").livesLost).toBe(0);
        expect(result.answers.find((a: any) => a.player === "bob").livesLost).toBe(1);
        expect(lastState().players.find((p) => p.name === "bob")!.lives).toBe(1);
        expect(lastState().players.find((p) => p.name === "bob")!.alive).toBe(true);
    });

    it("élimine un joueur tombé à 0 vie et il ne répond plus aux manches suivantes", async () => {
        vi.useFakeTimers();
        await game.start(["alice", "bob"]);
        game.answer("alice", 2);
        game.answer("bob", 4); // bob: 2 -> 1 vie
        await vi.advanceTimersByTimeAsync(4000 + 10);

        game.answer("alice", 2);
        game.answer("bob", 4); // bob: 1 -> 0 vie, éliminé
        const result = eventsOf("br:result")[1].payload;
        expect(result.eliminated).toEqual(["bob"]);
        expect(lastState().players.find((p) => p.name === "bob")!.alive).toBe(false);
    });

    it("termine dès qu'il reste un seul survivant, classement en fonction de l'ordre d'élimination", async () => {
        vi.useFakeTimers();
        await game.start(["alice", "bob"]);
        // 2 mauvaises réponses de suite éliminent bob (2 vies).
        game.answer("alice", 2);
        game.answer("bob", 4);
        await vi.advanceTimersByTimeAsync(4000 + 10);
        game.answer("alice", 2);
        game.answer("bob", 4);

        const finished = eventsOf("br:finished").at(-1)!.payload;
        expect(finished.ranking[0].name).toBe("alice");
        expect(finished.ranking[0].score).toBe(1);
        expect(finished.ranking[1].name).toBe("bob");
        expect(finished.ranking[1].score).toBe(0);
        expect(lastState().phase).toBe("finished");
    });

    it("mode présentateur : n'avance qu'à l'appel de hostAdvance", async () => {
        const hostedConfig: BrConfig = { ...config, hosted: true, presentatorName: "mj" };
        const hostedGame = new BrGame("room1", io, hostedConfig, makeDrawer());
        hostedGame.setSocketIdResolver((name) => `socket-${name}`);

        await hostedGame.start(["alice", "bob"]);
        hostedGame.answer("alice", 2);
        hostedGame.answer("bob", 2);
        expect(eventsOf("br:question")).toHaveLength(1);

        hostedGame.hostAdvance("mj");
        await Promise.resolve();
        await Promise.resolve();
        expect(eventsOf("br:question")).toHaveLength(2);
        hostedGame.dispose();
    });

    it("arbitre : overrideAnswer inverse un verdict de réponse libre et restitue la vie perdue", async () => {
        // BR termine immédiatement s'il ne reste qu'un joueur (alivePlayers()
        // <= 1) : il en faut 2 pour que la manche soit réellement jouée.
        const freeQuestion = { question_id: 1, mode: "FREE", title: "Q1", answers: ["paris"] };
        const refConfig: BrConfig = { numberOfLife: 2, answerDurationMs: 3000, hasReferee: true, refereeName: "ref" };
        const refGame = new BrGame("room1", io, refConfig, async () => freeQuestion);
        refGame.setSocketIdResolver((name) => `socket-${name}`);

        await refGame.start(["alice", "bob"]);
        refGame.answer("alice", "wrong answer");
        refGame.answer("bob", "paris");
        expect(lastState().players.find((p) => p.name === "alice")!.lives).toBe(1);

        refGame.overrideAnswer("alice", true);
        expect(lastState().players.find((p) => p.name === "alice")!.lives).toBe(2);
        refGame.dispose();
    });
});
