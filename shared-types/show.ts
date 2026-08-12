/**
 * Ce que l'écran `/show` (grand écran public, cf. ShowPage) doit afficher en
 * ce moment. Contrôlé par le présentateur — pour l'instant seul le mode LIST
 * l'utilise (pousser les résultats de la question précédente ou le
 * classement total plutôt que de suivre la question en direct).
 */
export type ShowView = "live" | "results" | "scoreboard";

export interface ShowState {
  view: ShowView;
}

/** Événements serveur → client. */
export const SHOW_EVENTS = {
  state: "show:state",
} as const;

/** Événements client → serveur. */
export const SHOW_ACTIONS = {
  setView: "show:setView",
} as const;
