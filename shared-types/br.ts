import { Question } from "./question";

export type BrPhase = "waiting" | "question" | "reveal" | "finished";

export interface BrPlayerState {
  name: string;
  lives: number;
  alive: boolean;
}

/** État complet du mode Battle Royale : les questions défilent une par une, une mauvaise réponse (ou une absence de réponse) coûte une vie. */
export interface BrState {
  phase: BrPhase;
  index: number;
  players: BrPlayerState[];
  answeredNames: string[];
  remainingMs?: number;
}

export interface BrAnswerResult {
  player: string;
  given: unknown;
  correct: boolean;
  livesLost: number;
}

/** Diffusé à tout le salon une fois que la question en cours est résolue. */
export interface BrQuestionResult {
  index: number;
  question: Question;
  answers: BrAnswerResult[];
  /** Joueurs qui viennent de tomber à 0 vie sur cette manche précise. */
  eliminated: string[];
}

export interface BrRanking {
  rank: number;
  name: string;
  score: number;
}

/** Événements serveur → client. */
export const BR_EVENTS = {
  state: "br:state",
  question: "br:question",
  result: "br:result",
  finished: "br:finished",
  error: "br:error",
} as const;

/** Événements client → serveur. */
export const BR_ACTIONS = {
  answer: "br:answer",
  /** Réservé au présentateur : lance la question suivante (pas d'auto-avance en mode hébergé). */
  hostAdvance: "br:hostAdvance",
} as const;

/** Question diffusée à tous les joueurs : pas de secret côté BR. */
export interface BrQuestionPayload {
  index: number;
  durationMs: number;
  question?: Question;
}
