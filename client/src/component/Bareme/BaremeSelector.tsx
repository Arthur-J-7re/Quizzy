import { FormControl, Input, InputLabel, MenuItem, Select } from "@mui/material";
import { pointsForLevel } from "shared-types";
import "./BaremeSelector.css";

export type ScoringMode = "CLASSIC" | "DIFFICULTY";

const DIFFICULTY_TIERS: { label: string; color: string; level: number }[] = [
    { label: "Niveau 1-3", color: "green", level: 1 },
    { label: "Niveau 4-7", color: "orange", level: 4 },
    { label: "Niveau 8-10", color: "red", level: 8 },
];

/**
 * Choix du barème d'un mode "une question à la fois" : classique
 * (correctPoints/wrongPoints fixes) ou par niveau de difficulté (points
 * dérivés du niveau de la question, cf. shared-types/scoring.ts pointsForLevel).
 * Pensé pour être réutilisé par n'importe quelle création de quizz/salon
 * scoré à la question (actuellement branché sur le mode Points dynamique).
 */
export default function BaremeSelector({
    scoringMode,
    setScoringMode,
    correctPoints,
    setCorrectPoints,
    wrongPoints,
    setWrongPoints,
}: {
    scoringMode: ScoringMode;
    setScoringMode: (mode: ScoringMode) => void;
    correctPoints: number;
    setCorrectPoints: (n: number) => void;
    wrongPoints: number;
    setWrongPoints: (n: number) => void;
}) {
    return (
        <div className="baremeSelector">
            <FormControl fullWidth>
                <InputLabel id="select-bareme-mode-label">Barème</InputLabel>
                <Select
                    labelId="select-bareme-mode-label"
                    id="select-bareme-mode"
                    value={scoringMode}
                    label="Barème"
                    onChange={(e) => setScoringMode(e.target.value as ScoringMode)}
                >
                    <MenuItem value="CLASSIC">Classique</MenuItem>
                    <MenuItem value="DIFFICULTY">Par niveau de difficulté</MenuItem>
                </Select>
            </FormControl>

            {scoringMode === "CLASSIC" ? (
                <div className="baremeClassicRow">
                    <label className="baremeInlineLabel">
                        Points par bonne réponse
                        <Input type="number" value={correctPoints} onChange={(e) => setCorrectPoints(Number(e.target.value))} />
                    </label>
                    <label className="baremeInlineLabel">
                        Points par mauvaise réponse
                        <Input type="number" value={wrongPoints} onChange={(e) => setWrongPoints(Number(e.target.value))} />
                    </label>
                </div>
            ) : (
                <div className="baremeDifficultyLegend">
                    {DIFFICULTY_TIERS.map((tier) => (
                        <span key={tier.label} className="baremeDifficultyChip" style={{ backgroundColor: tier.color }}>
                            {tier.label} = {pointsForLevel(tier.level)} pt{pointsForLevel(tier.level) > 1 ? "s" : ""}
                        </span>
                    ))}
                    <p className="baremeDifficultyHint">Mauvaise réponse = 0 point.</p>
                </div>
            )}
        </div>
    );
}
