import mongoose from "../db";

/**
 * Schéma sous-document, embarqué dans EmissionSchema.steps. Ne correspondait
 * pas du tout à ce qu'envoie le client ({name, mode, quizz, inputCount,
 * outputCount, resetPoint, last, played}) : Mongoose supprime silencieusement
 * les champs absents du schéma à l'enregistrement, donc `mode` et `quizz`
 * (dont Thread.currentStepData() dépend pour savoir quel jeu lancer)
 * disparaissaient dès qu'une émission était sauvegardée en base.
 */
export const StepSchema = new mongoose.Schema({
    name: String,
    mode: String,
    quizz: Number,
    inputCount: Number,
    outputCount: Number,
    resetPoint: Boolean,
    last: Boolean,
    played: Boolean,
    // TEAM_FORMATION : taille des équipes formées (toujours 2 pour l'instant).
    teamSize: Number,
    // DUEL : temps de réflexion total par joueur, et d'où viennent les 2
    // participants (seul "topTeam" — l'équipe en tête au moment de l'étape —
    // est géré aujourd'hui).
    duelTimePerPlayerMs: Number,
    duelParticipants: String,
    // Dissout les équipes courantes une fois cette étape terminée (et remet
    // les points à 0) : voir Thread.finalizeStep.
    dissolveTeamsAfter: Boolean,
    // Étape Grid/Timer "dynamique" : pas de quizz en base, chaque joueur joue
    // sur le thème qui lui a été assigné dans le salon pour CETTE étape
    // précise (cf. Room.playerThemes, keyed par index d'étape). Réglages
    // numériques portés directement par l'étape plutôt que par un quizz.
    dynamicThemeStep: Boolean,
    gridWidth: Number,
    gridHeight: Number,
    gridCellsPerTheme: Number,
    gridMemorizeDurationMs: Number,
    gridAnswerDurationMs: Number,
    timerTurnDurationMs: Number,
    // Barème / type de question forcé pour une étape dynamique (pas de quizz
    // en base pour porter ces réglages, cf. server/Collection/quizz.ts).
    gridForcedType: String,
    gridCorrectPoints: Number,
    gridWrongPoints: Number,
    timerForcedType: String,
    timerCorrectPoints: Number,
    timerWrongPoints: Number,
    timerStreakEveryN: Number,
    timerStreakBonusPoints: Number,
    // Étapes Points/BR : pas de quizz en base non plus, les questions sont
    // tirées au hasard par tag (cf. Class/Points/PointsGame,
    // Class/BR/BrGame). Tags en texte libre, résolus en ids canoniques au
    // lancement de la manche (cf. Thread.buildQuestionDrawer) — "wanted" =
    // au moins un de ces tags (mode "Choisir"), "blocked" = aucun de ces tags
    // (mode "Bloquer") ; un seul des deux est actif à la fois côté client.
    pointsWantedTags: { type: [String], default: [] },
    pointsBlockedTags: { type: [String], default: [] },
    pointsForcedType: String,
    pointsCorrectPoints: Number,
    pointsWrongPoints: Number,
    pointsRoundCount: Number,
    // Barème "par niveau de difficulté" (1-3→1pt, 4-7→2pts, 8-10→3pts) au lieu
    // du barème classique correctPoints/wrongPoints ci-dessus (cf.
    // shared-types/scoring.ts pointsForLevel). Sans effet si pointsForcedType
    // vaut "DCC" (barème gradué 5-3-1 fixe dans ce cas, cf. PointsGame).
    pointsDifficultyScoring: Boolean,
    brWantedTags: { type: [String], default: [] },
    brBlockedTags: { type: [String], default: [] },
    brForcedType: String,
    brNumberOfLife: Number,
});
