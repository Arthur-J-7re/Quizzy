import { Question } from "./question";

// "reveal" : pause après résolution d'une question, uniquement quand le
// salon a un arbitre (cf. PickBanGame.resolveAnswer) — sans arbitre, on
// enchaîne directement comme avant, cette phase n'est jamais atteinte.
export type PickBanPhase = "waiting" | "draft" | "playing" | "answering" | "reveal" | "finished";

export type PBThemeStatus = "available" | "owned" | "banned";

/**
 * Une case de la grille de draft. C'est aussi un jeu de déduction : le nom du
 * thème (`title`) n'est jamais envoyé aux joueurs, qui ne voient qu'un
 * placeholder ("Thème N") — seul le présentateur (si le salon en a un) reçoit
 * les vrais titres. L'image et le statut restent visibles de tous. Les
 * questions, elles, restent cachées jusqu'à ce que le thème soit choisi en
 * phase 2.
 */
export interface PBThemeCell {
  theme_id: number;
  title: string;
  img?: string;
  questionCount: number;
  status: PBThemeStatus;
  /** Joueur propriétaire (pick ou give), null si disponible ou banni. */
  owner: string | null;
  /** Le propriétaire a-t-il déjà répondu à toutes les questions de ce thème ? */
  played: boolean;
}

export interface PickBanPlayerState {
  name: string;
  score: number;
  ownedThemeIds: number[];
}

/**
 * Action imposée par la manche de draft en cours (cf. PickBanGame) : la draft
 * avance par manches complètes — tout le monde Pick, puis tout le monde Ban
 * (si activé), puis tout le monde Give (une seule manche, la cible étant
 * imposée par roulement) — et on recommence tant qu'il reste des thèmes.
 * `null` hors phase "draft".
 */
export type PickBanDraftAction = "pick" | "ban" | "give";

export interface PickBanState {
  phase: PickBanPhase;
  columns: number;
  themes: PBThemeCell[];
  players: PickBanPlayerState[];
  /** Joueur dont c'est le tour, en draft comme en phase de jeu. */
  currentPlayer: string | null;
  /** Action que `currentPlayer` doit effectuer, uniquement en phase "draft". */
  draftAction?: PickBanDraftAction;
  /** Manche "give" uniquement : destinataire imposé par le roulement pour `currentPlayer`. */
  forcedGiveTarget?: string | null;
  remainingMs?: number;
}

export interface PickBanQuestionResult {
  theme_id: number;
  player: string;
  correct: boolean;
  givenAnswer: unknown;
  pointsEarned: number;
  /** Position dans la liste de questions du thème (0-indexé). */
  questionIndex: number;
  questionsTotal: number;
  /** La manche est déjà résolue : la question (et sa bonne réponse) peut être révélée à tous. */
  question?: any;
}

export interface PickBanThemeComplete {
  theme_id: number;
  player: string;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
}

export interface PickBanRanking {
  rank: number;
  name: string;
  score: number;
}

/** Événements serveur → client. */
export const PICKBAN_EVENTS = {
  state: "pickban:state",
  question: "pickban:question",
  result: "pickban:result",
  themeComplete: "pickban:themeComplete",
  finished: "pickban:finished",
  error: "pickban:error",
} as const;

/** Événements client → serveur. */
export const PICKBAN_ACTIONS = {
  draftPick: "pickban:draftPick",
  draftGive: "pickban:draftGive",
  draftBan: "pickban:draftBan",
  choose: "pickban:choose",
  answer: "pickban:answer",
} as const;

/** Payload envoyé au joueur actif quand une question de son thème s'ouvre. */
export interface PickBanQuestionPayload {
  theme_id: number;
  player: string;
  questionIndex: number;
  questionsTotal: number;
  durationMs: number;
  question?: Question;
}
