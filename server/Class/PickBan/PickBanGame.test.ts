import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import PickBanGame, { type PickBanConfig } from "./PickBanGame";
import type { PickBanState } from "../../../shared-types/pickban";

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

const QUESTION_IDS = [1, 2, 3, 4, 5, 6];
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

// 3 thèmes de 2 questions chacun, pour 2 joueurs : de quoi picker, donner et bannir.
const config: PickBanConfig = {
    columns: 3,
    draftTurnDurationMs: 5000,
    answerDurationMs: 3000,
    themes: [
        { theme_id: 10, title: "Cinéma", questions: [1, 2] },
        { theme_id: 20, title: "Histoire", questions: [3, 4] },
        { theme_id: 30, title: "Sport", questions: [5, 6] },
    ],
};

describe("PickBanGame", () => {
    let io: any;
    let emissions: Emission[];
    let game: PickBanGame;

    const eventsOf = (event: string) => emissions.filter((e) => e.event === event);
    const lastState = (): PickBanState => {
        const states = eventsOf("pickban:state");
        return states[states.length - 1].payload;
    };

    beforeEach(() => {
        ({ io, emissions } = makeIo());
        game = new PickBanGame("room1", io, config, async (ids) =>
            ids.map((i) => questions[i]).filter(Boolean)
        );
        game.setSocketIdResolver((name) => `socket-${name}`);
    });

    afterEach(() => {
        game.dispose();
        vi.useRealTimers();
    });

    describe("mise en place", () => {
        it("refuse de démarrer à moins de 2 joueurs", async () => {
            await game.start(["alice"]);
            expect(eventsOf("pickban:error")[0].payload.message).toContain("2 joueurs");
        });

        it("refuse s'il y a moins de thèmes que de joueurs", async () => {
            await game.start(["alice", "bob", "carol", "dave"]);
            expect(eventsOf("pickban:error")[0].payload.message).toContain("3 thème(s) jouable(s)");
        });

        it("lance la draft avec tous les thèmes visibles et disponibles", async () => {
            await game.start(["alice", "bob"]);
            const state = lastState();
            expect(state.phase).toBe("draft");
            expect(state.themes).toHaveLength(3);
            expect(state.themes.every((t) => t.status === "available")).toBe(true);
            expect(state.currentPlayer).toBeTruthy();
        });

        it("cache les vrais titres des thèmes aux joueurs (jeu de déduction)", async () => {
            await game.start(["alice", "bob"]);
            const state = lastState();
            expect(state.themes.map((t) => t.title)).toEqual(["Thème 1", "Thème 2", "Thème 3"]);
        });
    });

    describe("présentateur", () => {
        it("voit les vrais titres, contrairement aux joueurs", async () => {
            const hostedConfig: PickBanConfig = { ...config, hosted: true, presentatorName: "mj" };
            const hostedGame = new PickBanGame("room1", io, hostedConfig, async (ids) =>
                ids.map((i) => questions[i]).filter(Boolean)
            );
            hostedGame.setSocketIdResolver((name) => `socket-${name}`);

            await hostedGame.start(["alice", "bob"]);

            const roomEmission = eventsOf("pickban:state").find((e) => e.target === "room1");
            expect(roomEmission).toBeDefined();
            const playerState: PickBanState = roomEmission!.payload;
            expect(playerState.themes.map((t) => t.title)).toEqual(["Thème 1", "Thème 2", "Thème 3"]);

            const hostEmission = eventsOf("pickban:state").find((e) => e.target === "socket-mj");
            expect(hostEmission).toBeDefined();
            const hostState: PickBanState = hostEmission!.payload;
            // La disposition des thèmes est mélangée (même ordre pour tous, mais
            // pas forcément celui du quizz) : on vérifie l'ensemble, pas l'ordre.
            expect(hostState.themes.map((t) => t.title).sort()).toEqual(["Cinéma", "Histoire", "Sport"].sort());

            hostedGame.dispose();
        });
    });

    describe("draft", () => {
        let first: string;
        let second: string;

        beforeEach(async () => {
            vi.useFakeTimers();
            await game.start(["alice", "bob"]);
            first = lastState().currentPlayer!;
            second = first === "alice" ? "bob" : "alice";
        });

        it("refuse une action hors tour", () => {
            game.draftPick(second, 10);
            expect(eventsOf("pickban:error")[0].payload.message).toBe("Ce n'est pas votre tour.");
        });

        it("pick attribue le thème au joueur et passe la main", () => {
            game.draftPick(first, 10);
            const state = lastState();
            const theme = state.themes.find((t) => t.theme_id === 10)!;
            expect(theme.status).toBe("owned");
            expect(theme.owner).toBe(first);
            expect(state.currentPlayer).toBe(second);
        });

        it("give attribue le thème à l'autre joueur, pas à soi-même", () => {
            game.draftGive(first, 10, second);
            const theme = lastState().themes.find((t) => t.theme_id === 10)!;
            expect(theme.owner).toBe(second);
        });

        it("refuse de se donner un thème à soi-même", () => {
            game.draftGive(first, 10, first);
            expect(eventsOf("pickban:error")[0].payload.message).toContain("vous-même");
            expect(lastState().themes.find((t) => t.theme_id === 10)!.status).toBe("available");
        });

        it("ban rend le thème indisponible pour le reste de la partie", () => {
            game.draftPick(first, 10);
            game.draftBan(second, 20);
            const theme = lastState().themes.find((t) => t.theme_id === 20)!;
            expect(theme.status).toBe("banned");
            expect(theme.owner).toBeNull();
        });

        it("refuse d'agir sur un thème déjà résolu", () => {
            game.draftPick(first, 10);
            game.draftPick(second, 10);
            expect(eventsOf("pickban:error").at(-1)!.payload.message).toBe("Ce thème n'est plus disponible.");
        });

        it("passe en phase de jeu une fois tous les thèmes résolus", () => {
            game.draftPick(first, 10);
            game.draftPick(second, 20);
            game.draftBan(first, 30);

            const state = lastState();
            expect(state.phase).toBe("playing");
            expect(state.currentPlayer).toBeTruthy();
        });

        it("bannit automatiquement un thème si le temps de draft expire", () => {
            const before = lastState().themes.filter((t) => t.status === "available").length;
            vi.advanceTimersByTime(config.draftTurnDurationMs + 10);
            const after = lastState();
            expect(after.themes.filter((t) => t.status === "available").length).toBe(before - 1);
            expect(after.currentPlayer).toBe(second);
        });
    });

    describe("phase de jeu", () => {
        let owner: string;
        let other: string;

        beforeEach(async () => {
            await game.start(["alice", "bob"]);
            const first = lastState().currentPlayer!;
            const second = first === "alice" ? "bob" : "alice";
            // alice (ou bob, selon l'ordre tiré) prend 2 thèmes, l'autre 1.
            game.draftPick(first, 10);
            game.draftPick(second, 20);
            game.draftPick(first, 30);
            owner = first;
            other = second;
        });

        it("le propriétaire choisit un de ses thèmes et reçoit ses questions", () => {
            const state = lastState();
            expect(state.phase).toBe("playing");
            expect(state.currentPlayer).toBe(owner);

            game.choose(owner, 10);
            const toPlayer = eventsOf("pickban:question").find((e) => e.target === `socket-${owner}`);
            expect(toPlayer!.payload.question).toBeDefined();
            expect(toPlayer!.payload.question.answer).toBeUndefined();
            expect(toPlayer!.payload.questionsTotal).toBe(2);
        });

        it("refuse de choisir un thème qu'on ne possède pas", () => {
            game.choose(owner, 20);
            expect(eventsOf("pickban:error")[0].payload.message).toBe("Vous ne pouvez pas choisir ce thème.");
        });

        it("enchaîne toutes les questions du thème puis marque les points cumulés", () => {
            game.choose(owner, 10);
            game.answer(owner, 2); // bonne réponse (Q1)
            game.answer(owner, 4); // mauvaise réponse (Q2)

            const complete = eventsOf("pickban:themeComplete")[0].payload;
            expect(complete.correctCount).toBe(1);
            expect(complete.totalQuestions).toBe(2);
            expect(complete.pointsEarned).toBe(1);

            const state = lastState();
            expect(state.players.find((p) => p.name === owner)!.score).toBe(1);
            expect(state.themes.find((t) => t.theme_id === 10)!.played).toBe(true);
        });

        it("passe la main après un thème complété", () => {
            game.choose(owner, 10);
            game.answer(owner, 2);
            game.answer(owner, 2);

            expect(lastState().currentPlayer).toBe(other);
        });

        it("revient au premier joueur pour son deuxième thème après le tour de l'autre", () => {
            game.choose(owner, 10);
            game.answer(owner, 2);
            game.answer(owner, 2);

            game.choose(other, 20);
            game.answer(other, 2);
            game.answer(other, 2);

            // `other` n'a plus de thème : le tour doit revenir à `owner` pour son
            // deuxième thème (30), sans jamais rester bloqué sur `other`.
            expect(lastState().currentPlayer).toBe(owner);
        });

        it("compte une non-réponse dans le temps imparti comme une erreur", () => {
            vi.useFakeTimers();
            game.choose(owner, 10);
            vi.advanceTimersByTime(config.answerDurationMs + 10);

            const result = eventsOf("pickban:result")[0].payload;
            expect(result.correct).toBe(false);
            expect(result.givenAnswer).toBeNull();
        });

        it("termine la partie et classe les joueurs quand tous les thèmes sont joués", () => {
            // owner possède 2 thèmes (10 et 30) de 2 questions chacun : 400 pts
            // si tout est juste. other n'a que le thème 20, tout faux : 0 pt.
            game.choose(owner, 10);
            game.answer(owner, 2);
            game.answer(owner, 2);

            game.choose(other, 20);
            game.answer(other, 4);
            game.answer(other, 4);

            game.choose(owner, 30);
            game.answer(owner, 2);
            game.answer(owner, 2);

            const finished = eventsOf("pickban:finished").at(-1)!.payload;
            expect(finished.ranking).toHaveLength(2);
            expect(finished.ranking[0].name).toBe(owner);
            expect(finished.ranking[0].score).toBe(4);
            expect(finished.ranking[1].score).toBe(0);
            expect(lastState().phase).toBe("finished");
        });
    });
});
