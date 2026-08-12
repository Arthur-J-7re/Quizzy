import { MenuItem, Select, TextField } from "@mui/material";
import { getQuestionFilter } from "../../tools/props/Props";
import "./QuestionSearchBar.css";

const QUESTION_TYPE_OPTIONS = getQuestionFilter().possibleType;

interface QuestionSearchBarProps {
    search: string;
    onSearchChange: (value: string) => void;
    typeFilter: string;
    onTypeFilterChange: (value: string) => void;
}

/**
 * Barre de recherche de questions (texte + type) utilisée par les templates
 * Grid/Pick&Ban, réutilisée telle quelle pour le quizz classique et le profil.
 */
export function QuestionSearchBar({ search, onSearchChange, typeFilter, onTypeFilterChange }: QuestionSearchBarProps) {
    return (
        <div className="questionSearchBar">
            <TextField
                className="questionSearchField"
                label="Rechercher une question"
                size="small"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                fullWidth
            />
            <Select
                size="small"
                value={typeFilter}
                onChange={(e) => onTypeFilterChange(e.target.value)}
            >
                {QUESTION_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.title}</MenuItem>
                ))}
            </Select>
        </div>
    );
}

export default QuestionSearchBar;
