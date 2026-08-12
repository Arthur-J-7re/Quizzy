export type Step = {
  name: string;
  mode: string;
  quizz: any;
  inputCount: number;
  outputCount: number;
  resetPoint: boolean;
  last: boolean;
  played: boolean;
  /** TEAM_FORMATION : taille des équipes formées (toujours 2 pour l'instant). */
  teamSize?: number;
  /** DUEL : temps de réflexion total par joueur (ms). */
  duelTimePerPlayerMs?: number;
  /** DUEL : d'où viennent les 2 participants — seul "topTeam" est géré aujourd'hui. */
  duelParticipants?: "topTeam";
  /** Dissout les équipes courantes une fois cette étape terminée (et remet les points à 0). */
  dissolveTeamsAfter?: boolean;
  /** Étape Grid/Timer "dynamique" : thème par joueur assigné dans le salon, pas de quizz en base. */
  dynamicThemeStep?: boolean;
  gridWidth?: number;
  gridHeight?: number;
  gridCellsPerTheme?: number;
  gridMemorizeDurationMs?: number;
  gridAnswerDurationMs?: number;
  timerTurnDurationMs?: number;
  gridForcedType?: string;
  gridCorrectPoints?: number;
  gridWrongPoints?: number;
  timerForcedType?: string;
  timerCorrectPoints?: number;
  timerWrongPoints?: number;
  timerStreakEveryN?: number;
  timerStreakBonusPoints?: number;
}