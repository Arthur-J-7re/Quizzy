import { useState } from "react";
import { Button, TextField } from "@mui/material";
import { Delete, Edit, Check, Close } from "@mui/icons-material";
import makeRequest from "../../tools/requestScheme";
import "./FolderManager.css";

export interface FolderSummary {
    folder_id: number;
    name: string;
}

/**
 * CRUD des dossiers de questions (créer/renommer/supprimer) — pas de vue
 * imbriquée, les dossiers sont à plat (cf. plan). Le filtre par dossier
 * (chips "Toutes"/"Sans dossier"/dossier) vit dans le composant appelant :
 * celui-ci ne gère que la gestion des dossiers eux-mêmes.
 */
export default function FolderManager({
    folders,
    onChanged,
}: {
    folders: FolderSummary[];
    onChanged: () => void;
}) {
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editingName, setEditingName] = useState("");

    const createFolder = async () => {
        const name = newName.trim();
        if (!name) return;
        await makeRequest("/folder/create", "POST", { name });
        setNewName("");
        onChanged();
    };

    const startRename = (folder: FolderSummary) => {
        setEditingId(folder.folder_id);
        setEditingName(folder.name);
    };

    const confirmRename = async (folder_id: number) => {
        const name = editingName.trim();
        if (name) {
            await makeRequest("/folder/update", "PUT", { folder_id, name });
        }
        setEditingId(null);
        onChanged();
    };

    const deleteFolder = async (folder_id: number) => {
        const confirmation = window.confirm(
            "Supprimer ce dossier ? Les questions qu'il contient repasseront en \"sans dossier\"."
        );
        if (!confirmation) return;
        await makeRequest("/folder/delete", "DELETE", { folder_id });
        onChanged();
    };

    return (
        <div className="folderManager">
            <div className="folderManagerNew">
                <TextField
                    size="small"
                    label="Nouveau dossier"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createFolder(); }}
                />
                <Button className="Button" onClick={createFolder} disabled={!newName.trim()}>Créer</Button>
            </div>
            {folders.length > 0 && (
                <ul className="folderManagerList">
                    {folders.map((folder) => (
                        <li key={folder.folder_id} className="folderManagerRow">
                            {editingId === folder.folder_id ? (
                                <>
                                    <TextField
                                        size="small"
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") confirmRename(folder.folder_id); }}
                                        autoFocus
                                    />
                                    <button type="button" className="folderManagerIconBtn" onClick={() => confirmRename(folder.folder_id)}>
                                        <Check fontSize="small" />
                                    </button>
                                    <button type="button" className="folderManagerIconBtn" onClick={() => setEditingId(null)}>
                                        <Close fontSize="small" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="folderManagerName">{folder.name}</span>
                                    <button type="button" className="folderManagerIconBtn" onClick={() => startRename(folder)}>
                                        <Edit fontSize="small" />
                                    </button>
                                    <button type="button" className="folderManagerIconBtn danger" onClick={() => deleteFolder(folder.folder_id)}>
                                        <Delete fontSize="small" />
                                    </button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
