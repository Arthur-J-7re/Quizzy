import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type User from "../../Interface/User";

interface Emission {
    target: string;
    event: string;
    payload: any;
}

let emissions: Emission[] = [];
const fakeIo: any = {
    to: (target: string) => ({
        emit: (event: string, payload: any) => emissions.push({ target, event, payload }),
    }),
};

// Hissé par vitest avant les imports : évite de charger le vrai server/index.ts
// (connexion Mongo réelle, server.listen() réel).
vi.mock("../../index", () => ({ io: fakeIo }));

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
// Question libre dédiée aux tests d'arbitrage : overrideAnswer ne s'applique
// qu'aux réponses libres (FREE, ou DCC joué en Cash), jamais au QCM.
questions[99] = { question_id: 99, mode: "FREE", title: "Question libre", answers: ["paris"] };

vi.mock("../../function/questionManager", () => ({
    default: {
        getQuestionsByIds: async (ids: number[]) => ids.map((i) => questions[i]).filter(Boolean),
    },
}));

vi.mock("../../function/quizzManager", () => ({
    default: {
        getListQuizz: async (id: number) => {
            if (id === 404) return null;
            if (id === 2) return { quizz_id: id, questions: [99], answerDurationMs: 20000 };
            return { quizz_id: id, questions: [1], answerDurationMs: 20000 };
        },
        getGridQuizz: async () => null,
        getPickAndBanQuizz: async () => null,
        getTimerQuizz: async () => null,
    },
}));

vi.mock("../../function/tagManager", () => ({
    default: {
        lookupTagIds: async () => [],
    },
}));

vi.mock("../../function/getterPlay", () => ({
    default: {
        getRandomDocWithTags: async () => null,
    },
}));

// Imports réels (après les mocks) : on teste le vrai Room/Thread, rien n'est mocké côté prod.
const { default: Room } = await import("../Room");

function makePlayer(name: string, role: "creator" | "player", score = 0): User {
    return { name, role, socketId: `socket-${name}`, hasAnswered: false, answer: null, score, life: 0, connected: true };
}

function makeRoom(opts: { steps: any[]; players: Record<string, User>; withPresentator?: boolean; withRef?: boolean }) {
    return new Room(
        "room1",
        "Room 1",
        1,
        false,
        "",
        { title: "Émission test", steps: opts.steps },
        opts.withRef ?? false,
        opts.withPresentator ?? false,
        8,
        opts.players,
        () => {}
    );
}

describe("Thread", () => {
    const eventsOf = (event: string) => emissions.filter((e) => e.event === event);

    beforeEach(() => {
        emissions = [];
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("start()", () => {
        it("refuse si le demandeur n'est pas le créateur", async () => {
            const players = { alice: makePlayer("alice", "player"), bob: makePlayer("bob", "creator") };
            const room = makeRoom({ steps: [{ mode: "LIST", quizz: 1 }], players });
            await room.getThread().start("alice");
            expect(room.getThread().started).toBe(false);
            room.dispose();
        });

        it("refuse de lancer si une étape dynamique n'a pas de thème assigné pour chaque joueur", async () => {
            const players = { alice: makePlayer("alice", "creator") };
            const room = makeRoom({
                steps: [{ mode: "GRID", dynamicThemeStep: true }],
                players,
            });
            await room.getThread().start("alice");
            expect(room.getThread().started).toBe(false);
            expect(eventsOf("emission:error")[0].payload.message).toContain("thème");
            room.dispose();
        });

        it("resetPoint remet les scores à zéro avant de lancer l'étape", async () => {
            const players = {
                alice: makePlayer("alice", "creator", 10),
                bob: makePlayer("bob", "player", 7),
            };
            const room = makeRoom({ steps: [{ mode: "LIST", quizz: 1, resetPoint: true }], players });
            await room.getThread().start("alice");
            expect(players.alice.score).toBe(0);
            expect(players.bob.score).toBe(0);
            room.dispose();
        });
    });

    describe("cycle complet d'une étape LIST", () => {
        it("crédite les scores et termine l'émission sur la dernière étape", async () => {
            vi.useFakeTimers();
            const players = { alice: makePlayer("alice", "creator"), bob: makePlayer("bob", "player") };
            const room = makeRoom({ steps: [{ mode: "LIST", quizz: 1 }], players });
            const thread = room.getThread();

            await thread.start("alice");
            thread.answer("alice", 2); // correct
            thread.answer("bob", 4); // incorrect
            await vi.advanceTimersByTimeAsync(4000 + 10); // reveal -> next -> finish

            expect(players.alice.score).toBe(1);
            expect(players.bob.score).toBe(0);
            const finished = eventsOf("emission:finished")[0].payload;
            expect(finished.ranking[0].name).toBe("alice");
            expect(thread.started).toBe(false);
            room.dispose();
        });

        it("passe à l'étape suivante quand ce n'est pas la dernière", async () => {
            vi.useFakeTimers();
            const players = { alice: makePlayer("alice", "creator") };
            const room = makeRoom({
                steps: [{ mode: "LIST", quizz: 1 }, { mode: "LIST", quizz: 2 }],
                players,
            });
            const thread = room.getThread();

            await thread.start("alice");
            thread.answer("alice", 2);
            await vi.advanceTimersByTimeAsync(4000 + 10);

            expect(thread.currentStep).toBe(1);
            const stepFinished = eventsOf("emission:stepFinished")[0].payload;
            expect(stepFinished.nextStepIndex).toBe(1);
            expect(eventsOf("emission:finished")).toHaveLength(0);
            room.dispose();
        });
    });

    describe("avec présentateur", () => {
        it("met le score en attente du bonus/malus au lieu de l'appliquer immédiatement", async () => {
            const players = { mj: makePlayer("mj", "creator"), alice: makePlayer("alice", "player") };
            const room = makeRoom({ steps: [{ mode: "LIST", quizz: 1 }], players, withPresentator: true });
            const thread = room.getThread();

            await thread.start("mj");
            thread.answer("alice", 2);
            thread.listHostAdvance("mj"); // reveal -> pas d'auto-avance en mode hébergé -> finish() ici (1 seule question)

            expect(players.alice.score).toBe(0); // pas encore crédité
            expect(eventsOf("emission:bonusMalus")).toHaveLength(1);
            room.dispose();
        });

        it("confirmBonusMalus (créateur uniquement) applique le score + les ajustements", async () => {
            const players = { mj: makePlayer("mj", "creator"), alice: makePlayer("alice", "player") };
            const room = makeRoom({ steps: [{ mode: "LIST", quizz: 1 }], players, withPresentator: true });
            const thread = room.getThread();

            await thread.start("mj");
            thread.answer("alice", 2);
            thread.listHostAdvance("mj");

            expect(thread.confirmBonusMalus("alice", { alice: 5 })).toBe(false); // pas le créateur
            expect(players.alice.score).toBe(0);

            expect(thread.confirmBonusMalus("mj", { alice: 5 })).toBe(true);
            expect(players.alice.score).toBe(1 + 5); // 1 point de bonne réponse + 5 d'ajustement
            room.dispose();
        });
    });

    describe("élimination automatique (outputCount)", () => {
        it("élimine les joueurs hors du quota une fois l'étape terminée", async () => {
            vi.useFakeTimers();
            const players = {
                alice: makePlayer("alice", "creator"),
                bob: makePlayer("bob", "player"),
                carol: makePlayer("carol", "player"),
            };
            const room = makeRoom({
                steps: [{ mode: "LIST", quizz: 1, outputCount: 1 }],
                players,
            });
            const thread = room.getThread();

            await thread.start("alice");
            thread.answer("alice", 2); // seule bonne réponse
            thread.answer("bob", 4);
            thread.answer("carol", 4);
            await vi.advanceTimersByTimeAsync(4000 + 10);

            expect(room.isEliminated("alice")).toBe(false);
            expect(room.isEliminated("bob")).toBe(true);
            expect(room.isEliminated("carol")).toBe(true);
            room.dispose();
        });
    });

    describe("TEAM_FORMATION", () => {
        it("apparie par extrémités du classement et enchaîne sans écran bonus/malus", async () => {
            // "mj" est un créateur/présentateur séparé, exclu de playingPlayerNames :
            // les 4 joueurs restants (compte pair) forment 2 paires par extrémités.
            const players = {
                mj: makePlayer("mj", "creator"),
                alice: makePlayer("alice", "player", 30),
                bob: makePlayer("bob", "player", 20),
                carol: makePlayer("carol", "player", 10),
                dave: makePlayer("dave", "player", 0),
            };
            const room = makeRoom({
                steps: [{ mode: "TEAM_FORMATION", teamSize: 2 }, { mode: "LIST", quizz: 1 }],
                players,
                withPresentator: true, // même avec présentateur : pas de score à réviser ici
            });
            const thread = room.getThread();

            await thread.start("mj");

            // Classement décroissant [alice,bob,carol,dave] -> extrémités : (alice,dave) et (bob,carol).
            const teams = room.getTeams();
            expect(teams).toHaveLength(2);
            expect(teams.find((t) => t.members.includes("alice"))!.members).toContain("dave");
            expect(teams.find((t) => t.members.includes("bob"))!.members).toContain("carol");
            expect(eventsOf("emission:bonusMalus")).toHaveLength(0);
            expect(thread.currentStep).toBe(1);
            room.dispose();
        });
    });

    describe("dissolveTeamsAfter", () => {
        it("dissout les équipes et remet les scores individuels à zéro", async () => {
            vi.useFakeTimers();
            const players = { alice: makePlayer("alice", "creator", 3), bob: makePlayer("bob", "player", 5) };
            const room = makeRoom({
                steps: [{ mode: "TEAM_FORMATION", teamSize: 2 }, { mode: "LIST", quizz: 1, dissolveTeamsAfter: true }],
                players,
            });
            const thread = room.getThread();

            await thread.start("alice"); // TEAM_FORMATION : forme l'équipe et avance, ne lance rien d'autre
            expect(room.getTeams()).toHaveLength(1);
            expect(thread.started).toBe(false); // il faut relancer explicitement l'étape suivante

            await thread.start("alice"); // lance réellement l'étape LIST (dissolveTeamsAfter)
            thread.answer("alice", 2);
            thread.answer("bob", 2);
            await vi.advanceTimersByTimeAsync(4000 + 10);

            expect(room.getTeams()).toHaveLength(0);
            expect(players.alice.score).toBe(0);
            expect(players.bob.score).toBe(0);
            room.dispose();
        });
    });

    describe("participants du duel", () => {
        it("prend les 2 membres de l'équipe en tête quand des équipes existent", async () => {
            // Même disposition que le test TEAM_FORMATION : classement décroissant
            // [alice,bob,carol,dave] -> équipes (alice,dave) puis (bob,carol),
            // formées dans cet ordre. `formTeams` initialise le score de CHAQUE
            // équipe à 0 (jamais recopié depuis le score individuel) : à égalité
            // 0-0 juste après TEAM_FORMATION, `resolveDuelParticipants` retient
            // la première équipe formée, (alice,dave) — comportement actuel
            // capturé tel quel, pas une propriété qu'on cherche à garantir.
            const players = {
                mj: makePlayer("mj", "creator"),
                alice: makePlayer("alice", "player", 30),
                bob: makePlayer("bob", "player", 20),
                carol: makePlayer("carol", "player", 10),
                dave: makePlayer("dave", "player", 0),
            };
            const room = makeRoom({
                steps: [{ mode: "TEAM_FORMATION", teamSize: 2 }, { mode: "DUEL", quizz: 1, duelTimePerPlayerMs: 1000 }],
                players,
                withPresentator: true,
            });
            const thread = room.getThread();
            await thread.start("mj"); // TEAM_FORMATION : forme les équipes et avance, ne lance rien d'autre
            await thread.start("mj"); // lance réellement l'étape DUEL

            const duelState = eventsOf("duel:state")[0]?.payload;
            expect(duelState).toBeDefined();
            const names = duelState.players.map((p: any) => p.name);
            expect(names.sort()).toEqual(["alice", "dave"]);
            room.dispose();
        });
    });

    describe("étape Grid dynamique (thème par joueur)", () => {
        it("construit la grille à partir des thèmes assignés dans le salon, pas d'un quizz de bibliothèque", async () => {
            const players = { alice: makePlayer("alice", "creator"), bob: makePlayer("bob", "player") };
            const room = makeRoom({
                steps: [{ mode: "GRID", dynamicThemeStep: true, gridWidth: 2, gridHeight: 2, gridCellsPerTheme: 2 }],
                players,
            });
            const thread = room.getThread();

            const theme = (id: number, title: string) => ({ theme_id: id, title, questions: [1, 2, 3] });
            expect(thread.assignPlayerTheme("alice", "alice", 0, theme(10, "Cinéma"))).toBe(true);
            expect(thread.assignPlayerTheme("alice", "bob", 0, theme(20, "Histoire"))).toBe(true);

            await thread.start("alice");
            expect(thread.started).toBe(true);
            const memo = eventsOf("grid:memorize")[0];
            expect(memo).toBeDefined();
            expect(memo.payload.state.cells).toHaveLength(4);
            room.dispose();
        });
    });

    describe("permissions réservées au créateur", () => {
        it("assignPlayerTheme/eliminatePlayer/resetScores/setShowView refusent un non-créateur", async () => {
            const players = { alice: makePlayer("alice", "creator"), bob: makePlayer("bob", "player") };
            const room = makeRoom({ steps: [{ mode: "LIST", quizz: 1 }], players, withPresentator: true });
            const thread = room.getThread();

            expect(thread.assignPlayerTheme("bob", "alice", 0, { theme_id: 1, title: "x", questions: [] })).toBe(false);
            expect(thread.eliminatePlayer("bob", "alice")).toBe(false);
            expect(thread.resetScores("bob")).toBe(false);
            expect(thread.setShowView("bob", "results")).toBe(false);

            expect(thread.eliminatePlayer("alice", "bob")).toBe(true);
            expect(room.isEliminated("bob")).toBe(true);
            room.dispose();
        });
    });

    describe("dispatch vers le moteur actif", () => {
        it("sendStateTo/answer/refereeOverride atteignent le moteur LIST réellement construit", async () => {
            // "mj" présentateur+arbitre séparé (exclu de playingPlayerNames) :
            // bob est seul à jouer, donc sa réponse fait passer directement en
            // phase "reveal" (sans attendre un 2e joueur), où overrideAnswer agit.
            const players = { mj: makePlayer("mj", "creator"), bob: makePlayer("bob", "player") };
            const room = makeRoom({
                steps: [{ mode: "LIST", quizz: 2 }], // quizz 2 -> question FREE (nécessaire à overrideAnswer)
                players,
                withRef: true,
                withPresentator: true,
            });
            const thread = room.getThread();

            await thread.start("mj");
            thread.sendStateTo("bob");
            expect(eventsOf("list:state").some((e) => e.target === "socket-bob")).toBe(true);

            thread.answer("bob", "mauvaise réponse"); // incorrect
            expect(eventsOf("list:result")[0].payload.answers.find((a: any) => a.player === "bob").correct).toBe(false);

            thread.refereeOverride("mj", "bob", true);
            expect(eventsOf("list:result").at(-1)!.payload.answers.find((a: any) => a.player === "bob").correct).toBe(true);
            room.dispose();
        });
    });
});
