import { Question } from "./question";

/** Couleurs attribuables à un thème/joueur, alignées sur la palette Quizzy. */
export const GRID_COLORS = [
  "#5a54e8", // bleu
  "#28e269", // vert
  "#FBA40E", // orange
  "#ed254e", // rouge
  "#99b3ff", // bleu clair
  "#a855f7", // violet
  "#0f1943", // bleu nuit
  "#14b8a6", // turquoise
] as const;

export type GridColor = (typeof GRID_COLORS)[number];

/** Couleur des cases sans thème (questions génériques). */
export const NEUTRAL_COLOR = "#b9c0cc";

/** Un thème tel que défini à la création du quizz Grid. */
export interface GridTheme {
  theme_id: number;
  title: string;
  questions: number[];
}

/** Un thème une fois attribué à un joueur en partie. */
export interface AssignedTheme extends GridTheme {
  color: string;
  /** Nom du joueur propriétaire, null pour le thème neutre. */
  owner: string | null;
}

// "reveal" : pause après résolution d'une case, uniquement quand le salon a
// un arbitre (cf. GridGame.resolve) — sans arbitre, on repasse directement à
// "playing" comme avant, cette phase n'est jamais atteinte.
export type GridPhase = "waiting" | "memorize" | "playing" | "answering" | "reveal" | "finished";

/**
 * Une case de la grille. `themeId` et `color` ne sont envoyés au client que
 * pendant la phase de mémorisation, ou une fois la case retournée : c'est le
 * serveur qui décide ce qu'il révèle, jamais le client qui masque.
 */
export interface GridCell {
  index: number;
  taken: boolean;
  /** Joueur ayant retourné la case, null tant qu'elle est fermée. */
  takenBy: string | null;
  /** Bonne réponse donnée ? null tant que la case n'est pas jouée. */
  success: boolean | null;
  /** Présent en phase memorize et après ouverture. */
  themeId?: number | null;
  color?: string;
  themeTitle?: string | null;
}

export interface GridPlayerState {
  name: string;
  color: string;
  themeTitle: string;
  score: number;
  connected: boolean;
}

/** État complet envoyé à chaque changement notable. */
export interface GridState {
  phase: GridPhase;
  width: number;
  height: number;
  cells: GridCell[];
  players: GridPlayerState[];
  /** Joueur dont c'est le tour, null hors phase de jeu. */
  currentPlayer: string | null;
  /** Millisecondes restantes sur la phase courante, si minutée. */
  remainingMs?: number;
}

/** Résultat d'une case jouée, diffusé à tout le salon. */
export interface GridCellResult {
  index: number;
  player: string;
  correct: boolean;
  themeTitle: string | null;
  color: string;
  question: Question;
  givenAnswer: unknown;
  pointsEarned: number;
}

export interface GridRanking {
  rank: number;
  name: string;
  score: number;
  color: string;
}

/** Événements serveur → client. */
export const GRID_EVENTS = {
  state: "grid:state",
  memorize: "grid:memorize",
  turn: "grid:turn",
  question: "grid:question",
  result: "grid:result",
  finished: "grid:finished",
  error: "grid:error",
} as const;

/** Événements client → serveur. */
export const GRID_ACTIONS = {
  pick: "grid:pick",
  answer: "grid:answer",
} as const;
