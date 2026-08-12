import { MenuItem, Select } from "@mui/material";
import { QuestionSearchBar } from "../QuestionSearchBar/QuestionSearchBar";
import FolderGrid from "../FolderGrid/FolderGrid";
import { getQuestionModeLabel } from "../../tools/text/text";
import type { QuestionPickerFilter } from "../../tools/hooks/useQuestionPicker";
import "./QuestionPicker.css";

/**
 * Sélecteur de questions (dossier/scope/type/texte) réutilisé par
 * CreateThemeForm / QuizzCreation / GridQuizzCreation (section "questions
 * génériques"). Purement présentationnel : la sélection reste possédée par
 * l'appelant (cf. useQuestionPicker).
 */
export default function QuestionPicker({
    results,
    folders,
    filter,
    onFilterChange,
    loading,
    selectedIds,
    onToggle,
}: {
    results: any[];
    folders: { folder_id: number; name: string }[];
    filter: QuestionPickerFilter;
    onFilterChange: (updater: (prev: QuestionPickerFilter) => QuestionPickerFilter) => void;
    loading: boolean;
    selectedIds: number[];
    onToggle: (question_id: number) => void;
}) {
    return (
        <div className="questionPicker">
            <div className="questionPickerFilters">
                <QuestionSearchBar
                    search={filter.search}
                    onSearchChange={(v) => onFilterChange((prev) => ({ ...prev, search: v }))}
                    typeFilter={filter.type}
                    onTypeFilterChange={(v) => onFilterChange((prev) => ({ ...prev, type: v }))}
                />
                <Select
                    size="small"
                    value={filter.scope}
                    onChange={(e) => onFilterChange((prev) => ({ ...prev, scope: e.target.value as QuestionPickerFilter["scope"] }))}
                >
                    <MenuItem value="mine">Mes questions</MenuItem>
                    <MenuItem value="public">Questions publiques</MenuItem>
                    <MenuItem value="all">Toutes</MenuItem>
                </Select>
                <input
                    className="questionPickerTagsInput"
                    placeholder="Tags (séparés par une virgule)"
                    value={filter.tags}
                    onChange={(e) => onFilterChange((prev) => ({ ...prev, tags: e.target.value }))}
                />
            </div>
            <FolderGrid
                options={[
                    { value: "", label: "Toutes" },
                    { value: "none", label: "Sans dossier" },
                    ...folders.map((f) => ({ value: String(f.folder_id), label: f.name })),
                ]}
                active={String(filter.folderId)}
                onSelect={(v) => onFilterChange((prev) => ({ ...prev, folderId: v === "" || v === "none" ? v : Number(v) }))}
            />
            {loading ? (
                <h2 className="filler">Chargement des questions...</h2>
            ) : results.length > 0 ? (
                <div className="quizzQuestionList">
                    {results.map((question: any) => (
                        <button
                            key={question.question_id}
                            type="button"
                            className={selectedIds.includes(question.question_id) ? "quizzQuestionChip picked" : "quizzQuestionChip"}
                            onClick={() => onToggle(question.question_id)}
                        >
                            {question.title}
                            <span className={"mode type-" + String(question.mode).toLowerCase()}>
                                {getQuestionModeLabel(question.mode)}
                            </span>
                        </button>
                    ))}
                </div>
            ) : (
                <h2 className="filler">Aucune question ne correspond à ces filtres.</h2>
            )}
        </div>
    );
}
