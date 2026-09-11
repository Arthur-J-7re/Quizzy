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

        it("give attribue le thème à la cible imposée par le roulement, jamais à soi-même", async () => {
            const noBanConfig: PickBanConfig = { ...config, allowBan: false };
            const g = new PickBanGame("room1", io, noBanConfig, async (ids) =>
                ids.map((i) => questions[i]).filter(Boolean)
            );
            g.setSocketIdResolver((name) => `socket-${name}`);
            const gState = () => {
                const states = emissions.filter((e) => e.event === "pickban:state");
                return states[states.length - 1].payload as PickBanState;
            };
            await g.start(["alice", "bob"]);
            const gFirst: string = gState().currentPlayer!;
            const gSecond = gFirst === "alice" ? "bob" : "alice";

            // Manche "pick" (allowBan désactivé, donc pick -> give directement) :
            // chacun pick un thème, puis c'est la manche "give" qui reprend au 1er joueur.
            g.draftPick(gFirst, 10);
            g.draftPick(gSecond, 20);
            g.draftGive(gFirst, 30);

            const theme = gState().themes.find((t) => t.theme_id === 30)!;
            expect(theme.owner).toBe(gSecond);
            expect(theme.owner).not.toBe(gFirst);
            g.dispose();
        });

        it("ban rend le thème indisponible pour le reste de la partie", () => {
            game.draftPick(first, 10);
            game.draftPick(second, 20);
            // Manche "pick" terminée pour les 2 joueurs -> manche "ban", le tour repart sur `first`.
            game.draftBan(first, 30);
            const theme = lastState().themes.find((t) => t.theme_id === 30)!;
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
        // 4 thèmes de 2 questions, allowBan désactivé : la manche "pick" (1
        // thème chacun) enchaîne directement sur une manche "give" (sans ban),
        // où chacun donne son thème restant à l'autre (cible forcée, jamais
        // soi-même) — les 2 joueurs finissent avec 2 thèmes chacun, de façon
        // déterministe quel que soit l'ordre de passage tiré au hasard.
        const jeuQuestionIds = [1, 2, 3, 4, 5, 6, 7, 8];
        const jeuQuestions: Record<number, any> = Object.fromEntries(
            jeuQuestionIds.map((id) => [
                id,
                { question_id: id, mode: "QCM", title: `Question ${id}`, choices: { ans1: "a", ans2: "b", ans3: "c", ans4: "d" }, answer: 2 },
            ])
        );
        const jeuConfig: PickBanConfig = {
            columns: 4,
            draftTurnDurationMs: 5000,
            answerDurationMs: 3000,
            allowBan: false,
            themes: [
                { theme_id: 10, title: "Cinéma", questions: [1, 2] },
                { theme_id: 20, title: "Histoire", questions: [3, 4] },
                { theme_id: 30, title: "Sport", questions: [5, 6] },
                { theme_id: 40, title: "Musique", questions: [7, 8] },
            ],
        };

        let jeuGame: PickBanGame;
        let first: string;
        let second: string;

        beforeEach(async () => {
            jeuGame = new PickBanGame("room1", io, jeuConfig, async (ids) =>
                ids.map((i) => jeuQuestions[i]).filter(Boolean)
            );
            jeuGame.setSocketIdResolver((name) => `socket-${name}`);

            await jeuGame.start(["alice", "bob"]);
            first = lastState().currentPlayer!; // turnOrder[0]
            second = first === "alice" ? "bob" : "alice";

            // Manche "pick" : chacun prend un thème.
            jeuGame.draftPick(first, 10);
            jeuGame.draftPick(second, 20);
            // Manche "give" (pas de ban) : chacun donne son thème restant à
            // l'autre (cible forcée) -> first finit avec {10,40}, second avec {20,30}.
            jeuGame.draftGive(first, 30);
            jeuGame.draftGive(second, 40);
        });

        afterEach(() => {
            jeuGame.dispose();
        });

        it("le propriétaire choisit un de ses thèmes et reçoit ses questions", () => {
            const state = lastState();
            expect(state.phase).toBe("playing");
            expect(state.currentPlayer).toBe(first);

            jeuGame.choose(first, 10);
            const toPlayer = eventsOf("pickban:question").find((e) => e.target === `socket-${first}`);
            expect(toPlayer!.payload.question).toBeDefined();
            expect(toPlayer!.payload.question.answer).toBeUndefined();
            expect(toPlayer!.payload.questionsTotal).toBe(2);
        });

        it("refuse de choisir un thème qu'on ne possède pas", () => {
            jeuGame.choose(first, 20);
            expect(eventsOf("pickban:error")[0].payload.message).toBe("Vous ne pouvez pas choisir ce thème.");
        });

        it("enchaîne toutes les questions du thème puis marque les points cumulés", () => {
            jeuGame.choose(first, 10);
            jeuGame.answer(first, 2); // bonne réponse (Q1)
            jeuGame.answer(first, 4); // mauvaise réponse (Q2)

            const complete = eventsOf("pickban:themeComplete")[0].payload;
            expect(complete.correctCount).toBe(1);
            expect(complete.totalQuestions).toBe(2);
            expect(complete.pointsEarned).toBe(1);

            const state = lastState();
            expect(state.players.find((p) => p.name === first)!.score).toBe(1);
            expect(state.themes.find((t) => t.theme_id === 10)!.played).toBe(true);
        });

        it("passe la main après un thème complété", () => {
            jeuGame.choose(first, 10);
            jeuGame.answer(first, 2);
            jeuGame.answer(first, 2);

            expect(lastState().currentPlayer).toBe(second);
        });

        it("revient au premier joueur pour son deuxième thème après le tour de l'autre", () => {
            jeuGame.choose(first, 10);
            jeuGame.answer(first, 2);
            jeuGame.answer(first, 2);

            jeuGame.choose(second, 20);
            jeuGame.answer(second, 2);
            jeuGame.answer(second, 2);

            // `second` a encore un thème (30) inachevé, mais le tour alterne
            // strictement : il doit revenir à `first` pour son deuxième thème (40).
            expect(lastState().currentPlayer).toBe(first);
        });

        it("compte une non-réponse dans le temps imparti comme une erreur", () => {
            vi.useFakeTimers();
            jeuGame.choose(first, 10);
            vi.advanceTimersByTime(jeuConfig.answerDurationMs + 10);

            const result = eventsOf("pickban:result")[0].payload;
            expect(result.correct).toBe(false);
            expect(result.givenAnswer).toBeNull();
        });

        it("termine la partie et classe les joueurs quand tous les thèmes sont joués", () => {
            // first (10, 40) répond juste partout : 4 pts. second (20, 30) répond
            // faux partout : 0 pt.
            jeuGame.choose(first, 10);
            jeuGame.answer(first, 2);
            jeuGame.answer(first, 2);

            jeuGame.choose(second, 20);
            jeuGame.answer(second, 4);
            jeuGame.answer(second, 4);

            jeuGame.choose(first, 40);
            jeuGame.answer(first, 2);
            jeuGame.answer(first, 2);

            jeuGame.choose(second, 30);
            jeuGame.answer(second, 4);
            jeuGame.answer(second, 4);

            const finished = eventsOf("pickban:finished").at(-1)!.payload;
            expect(finished.ranking).toHaveLength(2);
            expect(finished.ranking[0].name).toBe(first);
            expect(finished.ranking[0].score).toBe(4);
            expect(finished.ranking[1].score).toBe(0);
            expect(lastState().phase).toBe("finished");
        });
    });
});
