import type { Question } from "shared-types";

/**
 * Réponse donnée par un joueur, transformée en texte lisible pour l'écran de
 * correction — le payload brut varie selon le mode de la question (index QCM,
 * chaîne libre, "vrai"/"faux", ou {value, mode} pour DCC, cf. QcmAnswer/
 * FreeAnswer/VfAnswer/Cash-Carre-DuoAnswer.tsx).
 */
export function formatGivenAnswer(question: Question, given: unknown): string {
    if (given === null || given === undefined || given === "") return "";

    if (question.mode === "QCM") {
        const idx = Number(given);
        return (question.choices as any)?.[`ans${idx}`] ?? String(given);
    }

    if (question.mode === "VF") {
        if (given === "vrai") return "Vrai";
        if (given === "faux") return "Faux";
        return String(given);
    }

    if (question.mode === "DCC" && given && typeof given === "object") {
        const value = (given as any).value;
        return value !== undefined ? String(value) : JSON.stringify(given);
    }

    return String(given);
}
