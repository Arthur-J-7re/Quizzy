import { Question } from "./question";

export type PointsPhase = "waiting" | "question" | "reveal" | "finished";

export interface PointsPlayerState {
  name: string;
  score: number;
}

/** État complet du mode Points. Même principe que LIST, mais le total de manches est fixé au salon (pas la taille d'un quizz). */
export interface PointsState {
  phase: PointsPhase;
  index: number;
  total: number;
  players: PointsPlayerState[];
  answeredNames: string[];
  remainingMs?: number;
}

export interface PointsAnswerResult {
  player: string;
  given: unknown;
  correct: boolean;
  pointsEarned: number;
}

/** Diffusé à tout le salon une fois que la question en cours est résolue. */
export interface PointsQuestionResult {
  index: number;
  total: number;
  question: Question;
  answers: PointsAnswerResult[];
  nextQuestionTitle?: string | null;
}

export interface PointsRanking {
  rank: number;
  name: string;
  score: number;
}

/** Événements serveur → client. */
export const POINTS_EVENTS = {
  state: "points:state",
  question: "points:question",
  result: "points:result",
  finished: "points:finished",
  error: "points:error",
} as const;

/** Événements client → serveur. */
export const POINTS_ACTIONS = {
  answer: "points:answer",
  /** Réservé au présentateur : lance la question suivante (pas d'auto-avance en mode hébergé). */
  hostAdvance: "points:hostAdvance",
} as const;

/** Question diffusée à tous les joueurs : pas de secret côté Points. */
export interface PointsQuestionPayload {
  index: number;
  total: number;
  durationMs: number;
  question?: Question;
  /** Barème "par niveau de difficulté" actif : le client affiche un bandeau de niveau/points. */
  difficultyScoring?: boolean;
}
