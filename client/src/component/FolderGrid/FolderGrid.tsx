import { useState } from "react";
import { Folder, FolderOpen } from "@mui/icons-material";
import "./FolderGrid.css";

export interface FolderGridOption {
    value: string;
    label: string;
}

/**
 * Affichage des dossiers façon gestionnaire de fichiers : une grosse icône +
 * le nom en dessous, plutôt qu'une simple liste de chips texte. Réutilisé par
 * MyQuestions/MyThemes (navigation) et QuestionPicker (filtre pendant la
 * création d'un thème/quizz).
 *
 * `onDropItem`, si fourni, transforme chaque tuile (sauf "Toutes", qui ne
 * désigne pas un dossier réel) en cible de dépôt : une carte glissée depuis
 * la grille (cf. Card.tsx `draggableEnabled`) peut y être lâchée pour y être
 * rangée.
 */
export default function FolderGrid({
    options,
    active,
    onSelect,
    onDropItem,
}: {
    options: FolderGridOption[];
    active: string;
    onSelect: (value: string) => void;
    onDropItem?: (folderValue: string, id: number) => void;
}) {
    const [dragOverValue, setDragOverValue] = useState<string | null>(null);

    return (
        <div className="folderGrid">
            {options.map((opt) => {
                const isActive = opt.value === active;
                const isDropTarget = Boolean(onDropItem) && opt.value !== "";
                const isDragOver = isDropTarget && dragOverValue === opt.value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        className={[
                            "folderTile",
                            isActive ? "active" : "",
                            isDragOver ? "dragOver" : "",
                        ].filter(Boolean).join(" ")}
                        onClick={() => onSelect(opt.value)}
                        onDragOver={isDropTarget ? (e) => { e.preventDefault(); setDragOverValue(opt.value); } : undefined}
                        onDragLeave={isDropTarget ? () => setDragOverValue((v) => (v === opt.value ? null : v)) : undefined}
                        onDrop={isDropTarget ? (e) => {
                            e.preventDefault();
                            setDragOverValue(null);
                            const id = Number(e.dataTransfer.getData("text/plain"));
                            if (Number.isFinite(id)) onDropItem!(opt.value, id);
                        } : undefined}
                    >
                        {isActive ? <FolderOpen className="folderTileIcon" /> : <Folder className="folderTileIcon" />}
                        <span className="folderTileLabel">{opt.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
