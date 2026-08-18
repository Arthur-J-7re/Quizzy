/**
 * Cycle de vie de la visibilité d'une question (cf. ROADMAP.md, Phase 2) :
 * une question ne devient publique qu'après validation par un admin.
 *
 *   private -> pending  (le créateur demande la publication)
 *   pending -> approved (un admin valide, avec corrections possibles)
 *   pending -> rejected (un admin refuse, avec un motif)
 *   rejected -> pending (le créateur redemande après correction)
 *   approved -> pending (toute édition du créateur repasse par une re-validation)
 */
export type QuestionStatus = "private" | "pending" | "approved" | "rejected";

export const QUESTION_STATUS_VALUES: QuestionStatus[] = ["private", "pending", "approved", "rejected"];
