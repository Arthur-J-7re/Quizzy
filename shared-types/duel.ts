import { Question } from "./question";

export type DuelPhase = "waiting" | "question" | "finished";

export interface DuelPlayerState {
  name: string;
  remainingMs: number;
}

/**
 * État complet du mode Duel (façon Face à Face) : chrono individuel par
 * joueur, décompté seulement pendant le tour de celui qui a la main.
 */
export interface DuelState {
  phase: DuelPhase;
  players: [DuelPlayerState, DuelPlayerState];
  activePlayer: string | null;
  questionIndex: number;
  questionsTotal: number;
}

/** Question diffusée à tout le monde : les deux joueurs voient la même, seul l'actif répond. */
export interface DuelQuestionPayload {
  questionIndex: number;
  questionsTotal: number;
  activePlayer: string;
  question?: Question;
}

export interface DuelAnswerResult {
  player: string;
  correct: boolean;
  givenAnswer: unknown;
  questionIndex: number;
  questionsTotal: number;
  /** Bonne réponse : passe à l'adversaire. Mauvaise réponse : reste au même joueur. */
  nextActivePlayer: string;
}

export interface DuelRanking {
  rank: number;
  name: string;
  score: number;
}

/** Événements serveur → client. */
export const DUEL_EVENTS = {
  state: "duel:state",
  question: "duel:question",
  result: "duel:result",
  finished: "duel:finished",
  error: "duel:error",
} as const;

/** Événements client → serveur. */
export const DUEL_ACTIONS = {
  answer: "duel:answer",
} as const;
