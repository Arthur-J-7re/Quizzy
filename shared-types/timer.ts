import { Question } from "./question";

export type TimerPhase = "waiting" | "turn" | "turnEnd" | "finished" | "awaitingDuoChoice";

/** Un thème tel que défini à la création du quizz Timer. */
export interface TimerTheme {
  theme_id: number;
  title: string;
  questions: number[];
}

export interface TimerPlayerState {
  name: string;
  /** Thème personnel révélé une fois son tour commencé (null avant). */
  themeTitle: string | null;
  score: number;
  /** A déjà joué son tour ? */
  done: boolean;
}

/**
 * État complet du mode Timer : les joueurs passent chacun leur tour, un
 * décompte personnel tourne pendant le tour du joueur actif. Les questions ne
 * sont jamais visibles dans cet état (secret serveur, comme Grid) : seul le
 * joueur actif les reçoit via `TIMER_EVENTS.question`.
 */
export interface TimerState {
  phase: TimerPhase;
  players: TimerPlayerState[];
  /** Joueur dont c'est le tour, null hors phase "turn". */
  currentPlayer: string | null;
  /** Nombre de bonnes réponses du joueur actif sur son tour en cours. */
  currentTurnCorrectCount: number;
  remainingMs?: number;
  /**
   * Mode équipe (duo) uniquement : en phase "awaitingDuoChoice", les 2
   * membres qui peuvent réclamer ce tour (n'importe lequel des deux).
   */
  awaitingDuoMembers?: [string, string];
}

export interface TimerAnswerResult {
  player: string;
  correct: boolean;
  pointsEarned: number;
  givenAnswer: unknown;
}

/** Diffusé quand le tour d'un joueur se termine (temps écoulé). */
export interface TimerTurnResult {
  player: string;
  correctCount: number;
  questionsAnswered: number;
  pointsEarned: number;
}

export interface TimerRanking {
  rank: number;
  name: string;
  score: number;
}

/** Événements serveur → client. */
export const TIMER_EVENTS = {
  state: "timer:state",
  turnStart: "timer:turnStart",
  question: "timer:question",
  result: "timer:result",
  turnEnd: "timer:turnEnd",
  finished: "timer:finished",
  error: "timer:error",
  /** Réservé au présentateur : question complète (avec la/les bonne(s) réponse(s)). */
  hostQuestion: "timer:hostQuestion",
} as const;

/** Événements client → serveur. */
export const TIMER_ACTIONS = {
  answer: "timer:answer",
  /** Réservé au présentateur : verdict manuel sur la réponse en cours. */
  hostJudge: "timer:hostJudge",
  /** Mode équipe : réclame le tour de manche 1 pour son duo. */
  claimTurn: "timer:claimTurn",
} as const;

/** Annonce de début de tour, diffusée à tout le salon. */
export interface TimerTurnStartPayload {
  player: string;
  themeTitle: string;
  durationMs: number;
}

/** Question envoyée uniquement au joueur actif (les autres attendent). */
export interface TimerQuestionPayload {
  player: string;
  question?: Question;
}

/** Verdict du présentateur sur la réponse en cours. */
export type TimerHostVerdict = "correct" | "wrong" | "skip";

/**
 * Question envoyée au présentateur (quizz "avec présentateur") : contrairement
 * à `TimerQuestionPayload`, elle inclut la bonne réponse — c'est lui qui juge,
 * pas le serveur — et la réponse donnée par le joueur une fois soumise, à
 * titre indicatif seulement (il n'a pas besoin de la voir pour juger, le
 * joueur répondant à voix haute).
 */
export interface TimerHostQuestionPayload {
  player: string;
  question?: Question;
  givenAnswer?: unknown;
}
