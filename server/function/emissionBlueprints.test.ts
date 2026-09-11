import { describe, it, expect } from "vitest";
import {
    EMISSION_BLUEPRINTS,
    EMISSION_BLUEPRINT_LIMITS,
    EMISSION_STEP_EDITOR_MODES,
    recalcStepCounts,
    type EmissionBlueprint,
} from "../../shared-types/emission";

/**
 * Un blueprint mal formé casserait silencieusement le formulaire de création
 * d'émission (cf. ROADMAP.md, backlog "Blueprints d'émission") : ces
 * assertions vérifient que chaque template respecte les contraintes que le
 * moteur/formulaire imposent déjà à une émission construite à la main, sans
 * dépendre de React (shared-types/emission.ts est pur).
 */
describe.each(EMISSION_BLUEPRINTS)("blueprint $label", (blueprint: EmissionBlueprint) => {
    it("a un nombre de joueurs dans les bornes du formulaire", () => {
        expect(blueprint.numberOfPlayers).toBeGreaterThanOrEqual(EMISSION_BLUEPRINT_LIMITS.minPlayers);
        expect(blueprint.numberOfPlayers).toBeLessThanOrEqual(EMISSION_BLUEPRINT_LIMITS.maxPlayers);
    });

    it("ne dépasse pas le nombre d'étapes maximum du formulaire", () => {
        expect(blueprint.steps.length).toBeGreaterThan(0);
        expect(blueprint.steps.length).toBeLessThanOrEqual(EMISSION_BLUEPRINT_LIMITS.maxSteps);
    });

    it("n'utilise que des modes sélectionnables dans l'éditeur d'étape", () => {
        for (const step of blueprint.steps) {
            expect(EMISSION_STEP_EDITOR_MODES).toContain(step.mode);
        }
    });

    it("laisse le quizz de chaque étape au choix du créateur", () => {
        for (const step of blueprint.steps) {
            if (step.mode !== "TEAM_FORMATION") {
                expect(step.quizz).toBe("");
            }
        }
    });

    it("marque une seule étape comme dernière, celle en fin de déroulé", () => {
        const lastFlags = blueprint.steps.map((s) => s.last);
        expect(lastFlags.filter(Boolean)).toHaveLength(1);
        expect(blueprint.steps[blueprint.steps.length - 1].last).toBe(true);
    });

    it("est déjà un point fixe de recalcStepCounts (le formulaire ne le corrige pas au premier rendu)", () => {
        const recalculated = recalcStepCounts(blueprint.steps, blueprint.numberOfPlayers);
        expect(recalculated).toEqual(blueprint.steps);
    });

    it("garde un outputCount décroissant ou stable étape après étape", () => {
        for (let i = 1; i < blueprint.steps.length; i++) {
            expect(blueprint.steps[i].inputCount).toBeLessThanOrEqual(blueprint.steps[i - 1].outputCount);
        }
    });
});

describe("EMISSION_BLUEPRINTS", () => {
    it("a des id uniques", () => {
        const ids = EMISSION_BLUEPRINTS.map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});
