import { Mode } from "./question";

/**
 * Type de question qu'un quizz peut forcer :
 * - ALL  : tous les types de question ; les DCC sont tirées 50/50 Carré/Cash
 *   (jamais laissées au libre choix du joueur, cf. threadHelper.resolveDccMode).
 * - QCM  : questions natives QCM, ou DCC jouées de force en Carré.
 * - CASH : questions natives FREE, ou DCC jouées de force en Cash.
 * - DCC  : uniquement des questions DCC, sous-mode (Cash/Carré/Duo) laissé au
 *   libre choix du joueur — pensé pour un barème gradué (cf. DEFAULT_DCC_POINTS).
 */
export type ForcedQuestionType = "ALL" | "QCM" | "CASH" | "DCC";

export interface BaseScoringConfig {
  correctPoints: number;
  wrongPoints: number;
}

export interface TimerScoringConfig extends BaseScoringConfig {
  streakBonus: { everyN: number; bonusPoints: number };
}

export interface PickBanScoringConfig extends BaseScoringConfig {
  dccPoints: { cash: number; carre: number; duo: number };
}

export const FORCED_TYPE_ALLOWED_MODES: Record<ForcedQuestionType, Mode[]> = {
  ALL: [Mode.QCM, Mode.FREE, Mode.DCC, Mode.VF],
  QCM: [Mode.QCM, Mode.DCC],
  CASH: [Mode.FREE, Mode.DCC],
  DCC: [Mode.DCC],
};

/** Barème DCC gradué par sous-mode : mêmes valeurs par défaut que PickBan (cf. PickBanGame.DEFAULT_SCORING). */
export const DEFAULT_DCC_POINTS: PickBanScoringConfig["dccPoints"] = { cash: 5, carre: 3, duo: 1 };

/** Points gagnés pour une bonne réponse selon le niveau (1-10) de la question, pour le barème "par difficulté". */
export function pointsForLevel(level: number | undefined | null): number {
  const lvl = level ?? 1;
  if (lvl <= 3) return 1;
  if (lvl <= 7) return 2;
  return 3;
}

/** Couleur du niveau d'une question — mêmes seuils que le sélecteur de niveau en création de question (QuestionCreationForm.tsx). */
export function levelColor(level: number | undefined | null): "green" | "orange" | "red" {
  const lvl = level ?? 1;
  if (lvl <= 3) return "green";
  if (lvl <= 7) return "orange";
  return "red";
}
