import { Question } from "./question";

export type ListPhase = "waiting" | "question" | "reveal" | "finished";

export interface ListPlayerState {
  name: string;
  score: number;
}

/**
 * État complet du mode LIST. Contrairement à Grid/Pick & Ban, tout le monde
 * répond à la même question en même temps : `answeredNames` permet au client
 * de savoir qui a déjà répondu pour la question en cours (remis à zéro à
 * chaque nouvelle question).
 */
export interface ListState {
  phase: ListPhase;
  index: number;
  total: number;
  players: ListPlayerState[];
  answeredNames: string[];
  remainingMs?: number;
}

export interface ListAnswerResult {
  player: string;
  given: unknown;
  correct: boolean;
  pointsEarned: number;
}

/** Diffusé à tout le salon une fois que la question en cours est résolue. */
export interface ListQuestionResult {
  index: number;
  total: number;
  question: Question;
  answers: ListAnswerResult[];
  /**
   * Titre de la question suivante : réservé au présentateur (envoi ciblé
   * distinct de la diffusion publique, cf. ListGame.resolveQuestion), pour
   * qu'il puisse l'annoncer avant de lancer la suite sans le révéler aux
   * joueurs à l'avance.
   */
  nextQuestionTitle?: string | null;
}

export interface ListRanking {
  rank: number;
  name: string;
  score: number;
}

/** Événements serveur → client. */
export const LIST_EVENTS = {
  state: "list:state",
  question: "list:question",
  result: "list:result",
  finished: "list:finished",
  error: "list:error",
} as const;

/** Événements client → serveur. */
export const LIST_ACTIONS = {
  answer: "list:answer",
  /** Réservé au présentateur : lance la question suivante (pas d'auto-avance en mode hébergé). */
  hostAdvance: "list:hostAdvance",
} as const;

/** Question diffusée à tous les joueurs : pas de secret côté List. */
export interface ListQuestionPayload {
  index: number;
  total: number;
  durationMs: number;
  question?: Question;
}
