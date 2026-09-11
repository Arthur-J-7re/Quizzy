/**
 * Étape d'émission (cf. server/Collection/step.ts pour le schéma Mongoose
 * correspondant). Type partagé client/serveur : c'est exactement la forme
 * envoyée par le formulaire de création d'émission.
 */
export interface Step {
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

export interface EmissionBlueprintOptions {
  teams: boolean;
  playerThemeEnabled: boolean;
  hostModeEnabled: boolean;
}

export interface EmissionBlueprint {
  id: string;
  label: string;
  description: string;
  numberOfPlayers: number;
  options: EmissionBlueprintOptions;
  steps: Step[];
}

/** Taille d'équipe par défaut, si une étape ne la précise pas (cf. Emission.tsx, TEAM_SIZE). */
const DEFAULT_TEAM_SIZE = 2;

/**
 * Recalcule Entrées/Sorties de haut en bas à chaque changement : `outputCount`
 * reste le choix du MJ (juste capé à `inputCount`, forcé à `inputCount` sur
 * une étape TEAM_FORMATION puisqu'elle n'élimine personne), `inputCount` est
 * toujours dérivé de la sortie de l'étape précédente. Partagé entre
 * `EmissionCreationForm` (recalcul à chaque édition) et les tests de
 * blueprint (vérifie qu'un template pré-rempli est déjà un point fixe de
 * cette fonction, donc n'est jamais "corrigé" sous les yeux du créateur dès
 * qu'il touche à un champ).
 */
export function recalcStepCounts(steps: Step[], numberOfPlayers: number): Step[] {
  const result = steps.map((s) => ({ ...s }));
  let teamsActive = false;

  for (let i = 0; i < result.length; i++) {
    const s = result[i];
    if (i === 0) s.inputCount = numberOfPlayers;

    if (s.mode === "TEAM_FORMATION") {
      s.outputCount = s.inputCount;
    } else {
      if (s.outputCount > s.inputCount) s.outputCount = s.inputCount;
      if (s.outputCount < 1) s.outputCount = 1;
    }

    const enteringTeams = teamsActive;
    if (s.mode === "TEAM_FORMATION") teamsActive = true;
    if (s.dissolveTeamsAfter) teamsActive = false;

    if (i + 1 < result.length) {
      const teamSize = s.teamSize ?? DEFAULT_TEAM_SIZE;
      let nextInput = s.outputCount;
      if (!enteringTeams && teamsActive) nextInput = Math.max(1, Math.floor(nextInput / teamSize));
      else if (enteringTeams && !teamsActive) nextInput = nextInput * teamSize;
      result[i + 1].inputCount = nextInput;
    }
  }

  return result;
}

/**
 * Modes sélectionnables dans l'éditeur d'étape (cf. client/StepForm.tsx,
 * AVAILABLE_MODES — à garder synchronisé). POINTS et BR existent côté moteur
 * (`_Thread.ts`) mais n'ont pas encore d'entrée dans ce sélecteur : un
 * blueprint qui les utiliserait afficherait un mode d'étape vide dans le
 * formulaire, donc ils sont exclus des templates tant que ce n'est pas fait.
 */
export const EMISSION_STEP_EDITOR_MODES = ["LIST", "GRID", "PICKANDBAN", "TIMER", "TEAM_FORMATION", "DUEL"] as const;

/** Bornes du formulaire de création (cf. Emission.tsx : slider 2-20, 5 étapes max). */
export const EMISSION_BLUEPRINT_LIMITS = { minPlayers: 2, maxPlayers: 20, maxSteps: 5 };

/**
 * Modèles de déroulé pré-remplissant le formulaire de création d'émission
 * (cf. ROADMAP.md, backlog non planifié). Choisir un blueprint ne fait que
 * préremplir title/options/steps : le résultat reste une émission normale,
 * librement éditable ensuite (pas de mode figé).
 */
export const EMISSION_BLUEPRINTS: EmissionBlueprint[] = [
  {
    id: "12-coups-de-midi",
    label: "12 Coups de Midi",
    description: "Un duel en tête-à-tête, puis une question bonus solo pour le vainqueur.",
    numberOfPlayers: 2,
    options: { teams: false, playerThemeEnabled: false, hostModeEnabled: true },
    steps: [
      {
        name: "Le duel",
        mode: "DUEL",
        quizz: "",
        inputCount: 2,
        outputCount: 1,
        resetPoint: false,
        last: false,
        played: false,
        duelTimePerPlayerMs: 60000,
      },
      {
        name: "L'étoile mystérieuse",
        mode: "TIMER",
        quizz: "",
        inputCount: 1,
        outputCount: 1,
        resetPoint: false,
        last: true,
        played: false,
        timerTurnDurationMs: 60000,
      },
    ],
  },
  {
    id: "questions-pour-un-champion",
    label: "Questions pour un Champion",
    description: "Des candidats s'affrontent en qualifications, puis en demi-finale, avant un duel final.",
    numberOfPlayers: 6,
    options: { teams: false, playerThemeEnabled: false, hostModeEnabled: false },
    steps: [
      {
        name: "Qualifications",
        mode: "LIST",
        quizz: "",
        inputCount: 6,
        outputCount: 4,
        resetPoint: false,
        last: false,
        played: false,
      },
      {
        name: "Demi-finale",
        mode: "LIST",
        quizz: "",
        inputCount: 4,
        outputCount: 2,
        resetPoint: true,
        last: false,
        played: false,
      },
      {
        name: "Finale",
        mode: "DUEL",
        quizz: "",
        inputCount: 2,
        outputCount: 1,
        resetPoint: true,
        last: true,
        played: false,
        duelTimePerPlayerMs: 60000,
      },
    ],
  },
];
