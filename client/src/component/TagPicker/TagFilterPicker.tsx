import { useEffect, useState } from "react";
import { Switch } from "@mui/material";
import { tryRequest } from "../../tools/requestScheme";
import "./TagFilterPicker.css";

type TagMode = "choose" | "block";

/**
 * Sélecteur de tags pour les modes Points/BR (salon dynamique) : repliable,
 * tous les tags cochés par défaut. Un switch bascule entre deux
 * interprétations mutuellement exclusives des cases cochées :
 * - Choisir (fond bleu) : la manche pioche parmi les tags cochés (au moins un).
 * - Bloquer (fond rouge) : la manche exclut les tags cochés.
 * Décocher tout dans un mode revient à ne pas filtrer du tout sur ce mode
 * (plus intuitif qu'un "aucun résultat possible" silencieux).
 */
export default function TagFilterPicker({
    onChange,
}: {
    onChange: (next: { requiredTagNames: string[]; excludedTagNames: string[] }) => void;
}) {
    const [allTags, setAllTags] = useState<{ tag_id: number; name: string; questionCount: number }[]>([]);
    const [collapsed, setCollapsed] = useState(true);
    const [mode, setMode] = useState<TagMode>("choose");
    const [wanted, setWanted] = useState<Set<string>>(new Set());
    const [blocked, setBlocked] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fun = async () => {
            // Déjà trié du plus utilisé au moins utilisé côté serveur (tagManager.getAllTags).
            const tags = await tryRequest<{ tag_id: number; name: string; questionCount: number }[]>("/tag", "GET", {}, []) ?? [];
            setAllTags(tags);
            // Tous cochés par défaut en mode "Choisir" : aucune restriction tant
            // que l'utilisateur ne décoche rien lui-même.
            setWanted(new Set(tags.map((t) => t.name)));
        };
        fun();
    }, []);

    useEffect(() => {
        onChange({
            requiredTagNames: mode === "choose" ? [...wanted] : [],
            excludedTagNames: mode === "block" ? [...blocked] : [],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, wanted, blocked]);

    const activeSet = mode === "choose" ? wanted : blocked;
    const setActiveSet = mode === "choose" ? setWanted : setBlocked;

    const toggleTag = (name: string) => {
        setActiveSet((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    return (
        <div className="tagFilterPicker">
            <button
                type="button"
                className="tagFilterToggle"
                onClick={() => setCollapsed((c) => !c)}
            >
                Filtrer par tag {collapsed ? "▸" : "▾"}
            </button>

            {!collapsed && (
                <div className={`tagFilterPanel ${mode === "choose" ? "modeChoose" : "modeBlock"}`}>
                    <label className="tagFilterModeSwitch">
                        <span>Choisir</span>
                        <Switch
                            checked={mode === "block"}
                            onChange={(e) => setMode(e.target.checked ? "block" : "choose")}
                        />
                        <span>Bloquer</span>
                    </label>

                    {allTags.length === 0 ? (
                        <p className="tagFilterEmpty">Aucun tag existant pour le moment.</p>
                    ) : (
                        <div className="tagFilterList">
                            {allTags.map((tag) => (
                                <label key={tag.tag_id} className="tagFilterCheckbox">
                                    <input
                                        type="checkbox"
                                        checked={activeSet.has(tag.name)}
                                        onChange={() => toggleTag(tag.name)}
                                    />
                                    {tag.name} ({tag.questionCount})
                                </label>
                            ))}
                        </div>
                    )}
                    <p className="tagFilterHint">
                        {mode === "choose"
                            ? "La manche pioche parmi les tags cochés (aucun coché = toutes les questions)."
                            : "La manche exclut les tags cochés (aucun coché = aucune exclusion)."}
                    </p>
                </div>
            )}
        </div>
    );
}
