import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ListGame, { type ListConfig } from "./ListGame";
import type { ListState } from "../../../shared-types/list";

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

const QUESTION_IDS = [1, 2, 3];

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

const config: ListConfig = {
    questions: QUESTION_IDS,
    answerDurationMs: 3000,
};

describe("ListGame", () => {
    let io: any;
    let emissions: Emission[];
    let game: ListGame;

    const eventsOf = (event: string) => emissions.filter((e) => e.event === event);
    const lastState = (): ListState => {
        const states = eventsOf("list:state");
        return states[states.length - 1].payload;
    };

    beforeEach(() => {
        ({ io, emissions } = makeIo());
        game = new ListGame("room1", io, config, async (ids) =>
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
        expect(eventsOf("list:error")[0].payload.message).toContain("au moins un joueur");
    });

    it("envoie la première question sans la bonne réponse", async () => {
        await game.start(["alice", "bob"]);
        const q = eventsOf("list:question")[0].payload;
        expect(q.index).toBe(0);
        expect(q.total).toBe(3);
        expect(q.question.answer).toBeUndefined();
    });

    it("résout la question dès que tous les joueurs ont répondu, avec les bons points", async () => {
        await game.start(["alice", "bob"]);
        game.answer("alice", 2); // correct
        game.answer("bob", 4); // incorrect

        const result = eventsOf("list:result")[0].payload;
        const alice = result.answers.find((a: any) => a.player === "alice");
        const bob = result.answers.find((a: any) => a.player === "bob");
        expect(alice.correct).toBe(true);
        expect(alice.pointsEarned).toBe(1);
        expect(bob.correct).toBe(false);
        expect(bob.pointsEarned).toBe(0);

        expect(lastState().players.find((p) => p.name === "alice")!.score).toBe(1);
        expect(lastState().players.find((p) => p.name === "bob")!.score).toBe(0);
    });

    it("passe à la question suivante après le délai de reveal", async () => {
        vi.useFakeTimers();
        await game.start(["alice"]);
        game.answer("alice", 2);
        expect(eventsOf("list:question")).toHaveLength(1);

        vi.advanceTimersByTime(4000 + 10);
        expect(eventsOf("list:question")).toHaveLength(2);
        expect(eventsOf("list:question")[1].payload.index).toBe(1);
    });

    it("compte une non-réponse comme incorrecte au bout du temps imparti", async () => {
        vi.useFakeTimers();
        await game.start(["alice"]);
        vi.advanceTimersByTime(config.answerDurationMs + 10);

        const result = eventsOf("list:result")[0].payload;
        expect(result.answers[0].correct).toBe(false);
    });

    it("termine la partie et classe les joueurs une fois toutes les questions passées", async () => {
        vi.useFakeTimers();
        await game.start(["alice", "bob"]);
        for (let i = 0; i < QUESTION_IDS.length; i++) {
            game.answer("alice", 2);
            game.answer("bob", 4);
            vi.advanceTimersByTime(4000 + 10);
        }

        const finished = eventsOf("list:finished").at(-1)!.payload;
        expect(finished.ranking[0].name).toBe("alice");
        expect(finished.ranking[0].score).toBe(3);
        expect(finished.ranking[1].score).toBe(0);
        expect(lastState().phase).toBe("finished");
    });

    it("mode présentateur : n'avance qu'à l'appel de hostAdvance", async () => {
        const hostedConfig: ListConfig = { ...config, hosted: true, presentatorName: "mj" };
        const hostedGame = new ListGame("room1", io, hostedConfig, async (ids) =>
            ids.map((i) => questions[i]).filter(Boolean)
        );
        hostedGame.setSocketIdResolver((name) => `socket-${name}`);

        await hostedGame.start(["alice"]);
        hostedGame.answer("alice", 2);
        expect(eventsOf("list:question")).toHaveLength(1);

        hostedGame.hostAdvance("mj");
        expect(eventsOf("list:question")).toHaveLength(2);
        hostedGame.dispose();
    });

    it("arbitre : overrideAnswer inverse un verdict de réponse libre et ajuste le score", async () => {
        const freeQuestions: Record<number, any> = {
            1: { question_id: 1, mode: "FREE", title: "Q1", answers: ["paris"] },
        };
        const refConfig: ListConfig = { questions: [1], answerDurationMs: 3000, hasReferee: true, refereeName: "ref" };
        const refGame = new ListGame("room1", io, refConfig, async (ids) =>
            ids.map((i) => freeQuestions[i]).filter(Boolean)
        );
        refGame.setSocketIdResolver((name) => `socket-${name}`);

        await refGame.start(["alice"]);
        refGame.answer("alice", "wrong answer");
        expect(lastState().players.find((p) => p.name === "alice")!.score).toBe(0);

        refGame.overrideAnswer("alice", true);
        expect(lastState().players.find((p) => p.name === "alice")!.score).toBe(1);
        refGame.dispose();
    });
});
