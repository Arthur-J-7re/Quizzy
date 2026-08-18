import { QuestionModel } from "../Collection/questions";
import { QuizzModel } from "../Collection/quizz";

/**
 * Visibilité effective en cascade (cf. ROADMAP.md, Phase 3) : un quizz/thème/
 * émission n'est public que si son créateur l'a demandé (le booléen `private`
 * existant) ET que toutes les questions qu'il référence, même indirectement,
 * sont `status: "approved"`. Calculé à la lecture, rien n'est stocké.
 */

/**
 * Union de toutes les questions référencées par un quizz : directement
 * (`questions`, `neutralQuestions` pour Grid) ou via les thèmes embarqués
 * (`themes[].questions` — Grid/PickAndBan/BigBucket/Timer embarquent une
 * copie de chaque thème, cf. server/Collection/quizz.ts).
 */
export function collectQuizzQuestionIds(quizz: any): number[] {
    const ids = new Set<number>();
    (quizz?.questions ?? []).forEach((id: number) => ids.add(id));
    (quizz?.neutralQuestions ?? []).forEach((id: number) => ids.add(id));
    (quizz?.themes ?? []).forEach((theme: any) => {
        (theme?.questions ?? []).forEach((id: number) => ids.add(id));
    });
    return [...ids];
}

const countApproved = async (ids: number[]): Promise<number> => {
    if (ids.length === 0) return 0;
    return QuestionModel.countDocuments({ question_id: { $in: ids }, status: "approved" });
};

/** Nombre de questions référencées qui ne sont pas (encore) approuvées — 0 = rien ne bloque la publication. */
export async function getQuizzBlockingCount(quizz: any): Promise<number> {
    const ids = collectQuizzQuestionIds(quizz);
    if (ids.length === 0) return 0;
    const approved = await countApproved(ids);
    return ids.length - approved;
}

export async function isQuizzEffectivelyPublic(quizz: any): Promise<boolean> {
    if (quizz?.private) return false;
    return (await getQuizzBlockingCount(quizz)) === 0;
}

export async function getThemeBlockingCount(theme: any): Promise<number> {
    const ids: number[] = theme?.questions ?? [];
    if (ids.length === 0) return 0;
    const approved = await countApproved(ids);
    return ids.length - approved;
}

export async function isThemeEffectivelyPublic(theme: any): Promise<boolean> {
    if (theme?.private) return false;
    return (await getThemeBlockingCount(theme)) === 0;
}

/**
 * Ids des quizz référencés par les étapes d'une émission qui en dépendent
 * réellement (LIST/GRID non-dynamique/PICKANDBAN/TIMER non-dynamique/DUEL) —
 * TEAM_FORMATION/POINTS/BR et les étapes Grid/Timer "dynamiques"
 * (dynamicThemeStep) ne référencent aucun quizz fixe (contenu résolu au
 * lancement), donc n'imposent aucune contrainte ici.
 */
const stepQuizzIds = (emission: any): number[] => {
    const steps = Array.isArray(emission?.steps) ? emission.steps : [];
    return steps
        .filter((s: any) => typeof s?.quizz === "number" && !s?.dynamicThemeStep)
        .map((s: any) => s.quizz);
};

/** Nombre de "problèmes" bloquant la publication : quizz manquants + quizz référencés non publiables. */
export async function getEmissionBlockingCount(emission: any): Promise<number> {
    const quizzIds = [...new Set(stepQuizzIds(emission))];
    if (quizzIds.length === 0) return 0;

    const quizzes = await QuizzModel.find({ quizz_id: { $in: quizzIds } });
    const foundIds = new Set(quizzes.map((q: any) => q.quizz_id));
    const missing = quizzIds.filter((id) => !foundIds.has(id)).length;

    const results = await Promise.all(quizzes.map((q: any) => isQuizzEffectivelyPublic(q)));
    const blockedQuizzes = results.filter((isPublic) => !isPublic).length;

    return missing + blockedQuizzes;
}

export async function isEmissionEffectivelyPublic(emission: any): Promise<boolean> {
    if (emission?.private) return false;
    return (await getEmissionBlockingCount(emission)) === 0;
}
