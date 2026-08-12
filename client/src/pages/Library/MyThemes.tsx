import { useCallback, useContext, useEffect, useState } from "react";
import { Button, MenuItem, Select } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Banner } from "../../component/Banner/Banner";
import { AuthContext } from "../../context/authentContext";
import { CardArea } from "../../component/Card/CardArea/CardArea";
import ThemeCard from "../../component/Card/EntityCard/ThemeCard";
import FolderGrid from "../../component/FolderGrid/FolderGrid";
import makeRequest from "../../tools/requestScheme";
import { getThemeFolderOptions } from "../../tools/props/Props";
import "../CommonCss.css";
import "../Profil/profil.css";
import "../../component/Card/Card.css";
import "./Library.css";

/** Page "Mes thèmes" : filtre par le facet dossier fixe (Pick&Ban/Grid/Timer/Joueur/sans dossier). */
export function MyThemes() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Reflété dans l'URL (?folder=) pour qu'un retour arrière depuis
    // l'édition d'un thème restaure le filtre qu'on avait quitté (cf.
    // MyQuestions, même piège avec l'ancien /profil fixe).
    const [folder, setFolder] = useState<string>(searchParams.get("folder") ?? "");

    useEffect(() => {
        const next: Record<string, string> = {};
        if (folder !== "") next.folder = folder;
        setSearchParams(next, { replace: true });
    }, [folder, setSearchParams]);

    const [themes, setThemes] = useState<any[]>([]);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [moveTarget, setMoveTarget] = useState<string>("");

    const folderOptions = getThemeFolderOptions().filter((opt) => opt.value !== "");

    const loadThemes = useCallback(async () => {
        const params = new URLSearchParams();
        if (folder !== "") params.set("folder", folder);
        const list = await makeRequest(`/theme?${params.toString()}`);
        setThemes(list ?? []);
    }, [folder]);

    useEffect(() => { loadThemes(); }, [loadThemes]);

    const buttonPressedTheme = (themeCard: ThemeCard) => {
        navigate(`/modify-a-theme/${themeCard.getId()}`, { state: { theme: themeCard.getContent() } });
    };

    const toggleSelect = (themeCard: ThemeCard) => {
        const id = themeCard.getId();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    /** Déplacement d'un ou plusieurs thèmes — partagé entre le drag & drop (un seul id) et le mode sélection (plusieurs). */
    const moveThemesToFolder = useCallback(async (ids: number[], target: string) => {
        if (ids.length === 0) return;
        const targets = themes.filter((t) => ids.includes(t.theme_id));
        await Promise.all(targets.map((t) =>
            makeRequest("/theme/update", "PUT", {
                ...t,
                folder: target === "" || target === "none" ? undefined : target,
            })
        ));
        setSelectedIds(new Set());
        loadThemes();
    }, [themes, loadThemes]);

    const themeCards = themes.map((theme: any) =>
        new ThemeCard(
            theme,
            selectionMode ? toggleSelect : buttonPressedTheme,
            Number(auth?.user?.id),
            selectionMode && selectedIds.has(theme.theme_id),
            selectionMode ? undefined : `/modify-a-theme/${theme.theme_id}`,
            true
        )
    );

    if (!auth?.user) {
        return (
            <div>
                <Banner />
                <div className="PleaseLogin">
                    <h1>Veuillez-vous inscrire pour voir vos thèmes</h1>
                    <Button className="linkLogin" onClick={() => navigate("/login")}>Page de connection !</Button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <p className="libraryHint">Glissez une carte sur un dossier pour l'y ranger.</p>
                <div className="libraryFolderRow">
                    <FolderGrid
                        options={[
                            { value: "", label: "Toutes" },
                            { value: "none", label: "Sans dossier" },
                            ...folderOptions.map((opt) => ({ value: opt.value, label: opt.title })),
                        ]}
                        active={folder}
                        onSelect={setFolder}
                        onDropItem={(target, id) => moveThemesToFolder([id], target)}
                    />
                </div>

                <div className="librarySelectionRow">
                    <Button className="Button" onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}>
                        {selectionMode ? "Annuler la sélection" : "Déplacer plusieurs thèmes vers un dossier"}
                    </Button>
                    {selectionMode && (
                        <>
                            <span className="librarySelectionCount">{selectedIds.size} sélectionné(s)</span>
                            <Select size="small" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} displayEmpty>
                                <MenuItem value="">Choisir un dossier…</MenuItem>
                                <MenuItem value="none">Sans dossier</MenuItem>
                                {folderOptions.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>{opt.title}</MenuItem>
                                ))}
                            </Select>
                            <Button
                                className="Button"
                                disabled={selectedIds.size === 0 || moveTarget === ""}
                                onClick={() => { moveThemesToFolder([...selectedIds], moveTarget); setSelectionMode(false); }}
                            >
                                Déplacer
                            </Button>
                        </>
                    )}
                </div>

                <CardArea
                    title={`Vos thèmes (${themes.length})`}
                    emptyText="Aucun thème ne correspond à ce filtre"
                    cards={themeCards}
                    link="/create-a-theme"
                    draggable={false}
                    setUsedCard={() => {}}
                />
            </div>
        </div>
    );
}

export default MyThemes;
