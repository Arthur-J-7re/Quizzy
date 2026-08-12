import { InputLabel, TextField, Select, FormControl, MenuItem, Button, Slider, Switch } from "@mui/material";
import { getForcedQuestionTypeOptions } from "../../tools/props/Props";
import "./StepForm.css";

interface Step {
  name: string;
  mode: string;
  quizz: any;
  inputCount: number;
  outputCount: number;
  resetPoint: boolean;
  last: boolean;
  played: boolean;
  teamSize?: number;
  duelTimePerPlayerMs?: number;
  dissolveTeamsAfter?: boolean;
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

/** Modes pouvant utiliser une étape "dynamique" (thème par joueur, pas de quizz en base). */
const DYNAMIC_CAPABLE_MODES = new Set(["GRID", "TIMER"]);

const AVAILABLE_MODES = [
  { value: "LIST", label: "Quizz classique" },
  { value: "GRID", label: "Grid (mémoire)" },
  { value: "PICKANDBAN", label: "Pick & Ban" },
  { value: "TIMER", label: "Timer (chacun son tour)" },
  { value: "TEAM_FORMATION", label: "Formation d'équipes" },
  { value: "DUEL", label: "Duel (face à face)" },
];

/** Ces modes n'ont pas de quizz associé : rien à choisir dans le sélecteur. */
const MODES_WITHOUT_QUIZZ = new Set(["TEAM_FORMATION"]);

/** Le mode Duel n'a pas son propre type de quizz : il rejoue un quizz LIST. */
const QUIZZ_MODE_FOR_STEP: Record<string, string> = { DUEL: "LIST" };

export function StepForm({
  step,
  quizz,
  hostModeEnabled = false,
  playerThemeEnabled = false,
  teamsActive = false,
  setStep,
  number,
  onDelete,
  isFirst
}: {
  step: Step;
  quizz: any[];
  hostModeEnabled?: boolean;
  playerThemeEnabled?: boolean;
  /** Des équipes existent déjà à l'entrée de cette étape (TEAM_FORMATION jouée avant, pas encore dissoute). */
  teamsActive?: boolean;
  setStep: any;
  number: number;
  onDelete: any;
  isFirst: boolean;
}) {
  // Le sélecteur de quizz ne propose que les quizz compatibles avec le mode
  // choisi pour cette étape : un quizz LIST n'a pas de sens pour une étape Grid.
  // Un quizz Timer "avec présentateur" n'est jouable que dans une émission qui
  // a elle aussi l'option, sans quoi personne ne serait là pour juger.
  const compatibleQuizz = quizz?.filter((q) =>
    q.mode === (QUIZZ_MODE_FOR_STEP[step.mode] ?? step.mode) && (!q.hostModeEnabled || hostModeEnabled)
  ) ?? [];

  const canBeDynamic = playerThemeEnabled && DYNAMIC_CAPABLE_MODES.has(step.mode);
  const isDynamic = canBeDynamic && Boolean(step.dynamicThemeStep);

  return (
    <div className="stepFormContainer">
      <div className="stepFormHeaderRow">
        <FormControl fullWidth>
          <TextField
            label="nom de l'étape"
            value={step.name}
            onChange={(e) => setStep(number, "name", e.target.value)}
          />
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Mode de l'épreuve</InputLabel>
          <Select
            value={step.mode}
            label="Mode de l'épreuve"
            onChange={(e) => {
              setStep(number, "mode", e.target.value);
              // Le quizz sélectionné précédemment n'a plus de raison d'être valide.
              setStep(number, "quizz", "");
            }}
          >
            {AVAILABLE_MODES.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {MODES_WITHOUT_QUIZZ.has(step.mode) ? (
        <p className="filler">
          Forme automatiquement des duos par classement (1er+dernier, 2e+avant-dernier...)
          d'après le score cumulé à ce stade de l'émission. Les épreuves suivantes se
          joueront alors par équipe.
        </p>
      ) : (
        <>
          {canBeDynamic && (
            <label className="stepFormDynamicToggleRow">
              <Switch
                checked={isDynamic}
                onChange={() => setStep(number, "dynamicThemeStep", !step.dynamicThemeStep)}
              />
              Étape dynamique (thème par joueur, assigné dans le salon)
            </label>
          )}

          {isDynamic ? (
            step.mode === "GRID" ? (
              <div className="stepFormDynamicFields">
                <label className="stepFormSliderLabel">
                  Largeur : {step.gridWidth ?? 5}
                  <Slider value={step.gridWidth ?? 5} min={2} max={8} step={1}
                    onChange={(_, v) => setStep(number, "gridWidth", v as number)} />
                </label>
                <label className="stepFormSliderLabel">
                  Hauteur : {step.gridHeight ?? 4}
                  <Slider value={step.gridHeight ?? 4} min={2} max={8} step={1}
                    onChange={(_, v) => setStep(number, "gridHeight", v as number)} />
                </label>
                <label className="stepFormSliderLabel">
                  Cases par thème : {step.gridCellsPerTheme ?? 3}
                  <Slider value={step.gridCellsPerTheme ?? 3} min={1} max={8} step={1}
                    onChange={(_, v) => setStep(number, "gridCellsPerTheme", v as number)} />
                </label>
                <label className="stepFormSliderLabel">
                  Mémorisation : {Math.round((step.gridMemorizeDurationMs ?? 8000) / 1000)} s
                  <Slider value={Math.round((step.gridMemorizeDurationMs ?? 8000) / 1000)} min={3} max={30} step={1}
                    onChange={(_, v) => setStep(number, "gridMemorizeDurationMs", (v as number) * 1000)} />
                </label>
                <label className="stepFormSliderLabel">
                  Temps de réponse : {Math.round((step.gridAnswerDurationMs ?? 20000) / 1000)} s
                  <Slider value={Math.round((step.gridAnswerDurationMs ?? 20000) / 1000)} min={5} max={60} step={5}
                    onChange={(_, v) => setStep(number, "gridAnswerDurationMs", (v as number) * 1000)} />
                </label>
                <FormControl fullWidth>
                  <InputLabel>Type de question forcé</InputLabel>
                  <Select
                    value={step.gridForcedType ?? "ALL"}
                    label="Type de question forcé"
                    onChange={(e) => setStep(number, "gridForcedType", e.target.value)}
                  >
                    {getForcedQuestionTypeOptions().map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Points par bonne réponse"
                  type="number"
                  value={step.gridCorrectPoints ?? 1}
                  onChange={(e) => setStep(number, "gridCorrectPoints", Number(e.target.value))}
                />
                <TextField
                  label="Points par mauvaise réponse"
                  type="number"
                  value={step.gridWrongPoints ?? 0}
                  onChange={(e) => setStep(number, "gridWrongPoints", Number(e.target.value))}
                />
              </div>
            ) : (
              <div className="stepFormDynamicFields">
                <label className="stepFormSliderLabel">
                  Temps par tour : {Math.round((step.timerTurnDurationMs ?? 100000) / 1000)} s
                  <Slider value={Math.round((step.timerTurnDurationMs ?? 100000) / 1000)} min={30} max={180} step={10}
                    onChange={(_, v) => setStep(number, "timerTurnDurationMs", (v as number) * 1000)} />
                </label>
                <FormControl fullWidth>
                  <InputLabel>Type de question forcé</InputLabel>
                  <Select
                    value={step.timerForcedType ?? "ALL"}
                    label="Type de question forcé"
                    onChange={(e) => setStep(number, "timerForcedType", e.target.value)}
                  >
                    {getForcedQuestionTypeOptions().map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>{opt.title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Points par bonne réponse"
                  type="number"
                  value={step.timerCorrectPoints ?? 1}
                  onChange={(e) => setStep(number, "timerCorrectPoints", Number(e.target.value))}
                />
                <TextField
                  label="Points par mauvaise réponse"
                  type="number"
                  value={step.timerWrongPoints ?? 0}
                  onChange={(e) => setStep(number, "timerWrongPoints", Number(e.target.value))}
                />
                <TextField
                  label="Bonus toutes les N bonnes réponses consécutives"
                  type="number"
                  value={step.timerStreakEveryN ?? 2}
                  onChange={(e) => setStep(number, "timerStreakEveryN", Number(e.target.value))}
                />
                <TextField
                  label="Points bonus"
                  type="number"
                  value={step.timerStreakBonusPoints ?? 1}
                  onChange={(e) => setStep(number, "timerStreakBonusPoints", Number(e.target.value))}
                />
              </div>
            )
          ) : (
            <FormControl fullWidth>
              <InputLabel>Choisir un quizz</InputLabel>
              <Select
                value={step.quizz}
                label="Choisir un quizz"
                onChange={(e) => setStep(number, "quizz", e.target.value)}
              >
                {compatibleQuizz.map((q) => (
                  <MenuItem key={q.quizz_id} value={q.quizz_id}>
                    {q.title}
                  </MenuItem>
                ))}
              </Select>
              {step.mode && compatibleQuizz.length === 0 && (
                <p className="filler">Aucun quizz de ce mode disponible.</p>
              )}
            </FormControl>
          )}
        </>
      )}
      {step.mode === "DUEL" && (
        <label className="stepFormSliderLabel">
          Temps par joueur : {Math.round((step.duelTimePerPlayerMs ?? 60000) / 1000)} s
          <Slider
            value={Math.round((step.duelTimePerPlayerMs ?? 60000) / 1000)}
            min={15}
            max={180}
            step={5}
            onChange={(_, v) => setStep(number, "duelTimePerPlayerMs", (v as number) * 1000)}
          />
        </label>
      )}

      {(!isFirst || (teamsActive && step.mode !== "TEAM_FORMATION")) && (
        <div className="stepFormTogglesRow">
          {/* Rien à remettre à zéro à la toute première étape de l'émission. */}
          {!isFirst && (
            <label className="stepFormToggle">
              <input
                type="checkbox"
                className="coloredAnswer"
                checked={step.resetPoint}
                onChange={()=>{}}
                onClick={() => setStep(number, "resetPoint", !step.resetPoint)}
              />
              Reset des points
            </label>
          )}
          {/* Rien à dissoudre tant qu'aucune étape de formation d'équipes n'a tourné avant celle-ci. */}
          {teamsActive && step.mode !== "TEAM_FORMATION" && (
            <label className="stepFormToggle">
              <input
                type="checkbox"
                className="coloredAnswer"
                checked={step.dissolveTeamsAfter ?? false}
                onChange={()=>{}}
                onClick={() => setStep(number, "dissolveTeamsAfter", !step.dissolveTeamsAfter)}
              />
              Dissoudre les équipes après cette étape (reset les points)
            </label>
          )}
        </div>
      )}

      {!MODES_WITHOUT_QUIZZ.has(step.mode) && (
        <div className="stepFormCountsRow">
          <TextField
            label={teamsActive ? "Entrées (équipes)" : "Entrées"}
            type="number"
            value={step.inputCount}
            disabled
            helperText={isFirst ? "= nombre de joueurs de l'émission" : `= ${teamsActive ? "équipes" : "joueurs"} conservés à l'étape précédente`}
            onChange={(e) => setStep(number, "inputCount", parseInt(e.target.value))}
          />
          <TextField
            label={teamsActive ? "Sorties (équipes)" : "Sorties"}
            type="number"
            value={step.outputCount}
            helperText={`${teamsActive ? "équipes" : "joueurs"} conservés après cette épreuve`}
            onChange={(e) => setStep(number, "outputCount", parseInt(e.target.value))}
          />
        </div>
      )}

      <div className="stepFormDeleteRow">
        <Button className="Button" onClick={() => onDelete(number)}>Supprimer cette étape</Button>
      </div>
    </div>
  );
}
