import { useCallback, useContext, useEffect, useState } from "react";
import { Button, MenuItem, Select } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Banner } from "../../component/Banner/Banner";
import { AuthContext } from "../../context/authentContext";
import { CardArea } from "../../component/Card/CardArea/CardArea";
import QuestionCard from "../../component/Card/EntityCard/QuestionCard";
import { QuestionSearchBar } from "../../component/QuestionSearchBar/QuestionSearchBar";
import FolderManager, { type FolderSummary } from "../../component/FolderManager/FolderManager";
import FolderGrid from "../../component/FolderGrid/FolderGrid";
import makeRequest from "../../tools/requestScheme";
import { getQuestionFilter } from "../../tools/props/Props";
import "../CommonCss.css";
import "../Profil/profil.css";
import "../../component/Card/Card.css";
import "./Library.css";

const PAGE_SIZE = 40;

/** Page "Mes questions" : filtre/pagine côté serveur (cf. GET /question/search), au lieu de tout charger d'un coup comme l'ancien /profil. */
export function MyQuestions() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Filtres reflétés dans l'URL (?scope=&folder=&tags=&type=&search=) pour
    // que "retour arrière" depuis l'édition d'une question restaure la vue
    // qu'on avait quittée, au lieu de retomber systématiquement sur "Toutes".
    const [scope, setScope] = useState<"all" | "mine" | "public">(
        (searchParams.get("scope") as "all" | "mine" | "public") || "mine"
    );
    const [folderId, setFolderId] = useState<number | "none" | "">(() => {
        const raw = searchParams.get("folder");
        if (!raw) return "";
        if (raw === "none") return "none";
        const n = Number(raw);
        return Number.isFinite(n) ? n : "";
    });
    const [tagsInput, setTagsInput] = useState(searchParams.get("tags") ?? "");
    const [typeAndSearch, setTypeAndSearch] = useState(() => {
        const base = getQuestionFilter();
        return {
            ...base,
            type: searchParams.get("type") || base.type,
            searchText: searchParams.get("search") ?? base.searchText,
        };
    });

    useEffect(() => {
        const next: Record<string, string> = {};
        if (scope !== "mine") next.scope = scope;
        if (folderId !== "") next.folder = String(folderId);
        if (tagsInput) next.tags = tagsInput;
        if (typeAndSearch.type !== "all") next.type = typeAndSearch.type;
        if (typeAndSearch.searchText) next.search = typeAndSearch.searchText;
        setSearchParams(next, { replace: true });
    }, [scope, folderId, tagsInput, typeAndSearch, setSearchParams]);

    const [folders, setFolders] = useState<FolderSummary[]>([]);
    const [showFolderManager, setShowFolderManager] = useState(false);

    const [questions, setQuestions] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [moveTarget, setMoveTarget] = useState<number | "none" | "">("");

    const loadFolders = useCallback(async () => {
        const list = await makeRequest("/folder");
        setFolders(list ?? []);
    }, []);

    useEffect(() => { loadFolders(); }, [loadFolders]);

    const fetchQuestions = useCallback(async (skip: number) => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set("scope", scope);
        if (folderId !== "") params.set("folder_id", String(folderId));
        const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
        if (tags.length > 0) params.set("tags", tags.join(","));
        if (typeAndSearch.type !== "all") params.set("mode", typeAndSearch.type);
        if (typeAndSearch.searchText) params.set("search", typeAndSearch.searchText);
        params.set("skip", String(skip));
        params.set("limit", String(PAGE_SIZE));

        try {
            const { items, total } = await makeRequest(`/question/search?${params.toString()}`);
            setQuestions((prev) => (skip === 0 ? items : [...prev, ...items]));
            setTotal(total);
        } catch (e) {
            console.error("Erreur lors du chargement des questions", e);
        } finally {
            setLoading(false);
        }
    }, [scope, folderId, tagsInput, typeAndSearch]);

    useEffect(() => { fetchQuestions(0); }, [fetchQuestions]);

    const buttonPressedQuestion = (questionCard: QuestionCard) => {
        navigate(`/modify-a-question/${questionCard.getId()}`, { state: { question: questionCard.getContent() } });
    };

    const toggleSelect = (questionCard: QuestionCard) => {
        const id = questionCard.getId();
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const questionCards = questions.map((question: any) =>
        new QuestionCard(
            question,
            selectionMode ? toggleSelect : buttonPressedQuestion,
            Number(auth?.user?.id),
            selectionMode && selectedIds.has(question.question_id),
            selectionMode ? undefined : `/modify-a-question/${question.question_id}`,
            true
        )
    );

    /** Déplacement d'une ou plusieurs questions — partagé entre le drag & drop (un seul id) et le mode sélection (plusieurs). */
    const moveQuestionsToFolder = useCallback(async (ids: number[], target: number | "none" | "") => {
        if (ids.length === 0) return;
        const targets = questions.filter((q) => ids.includes(q.question_id));
        await Promise.all(targets.map((q) =>
            makeRequest("/question/update", "PUT", {
                question_id: q.question_id,
                data: {
                    ...q,
                    folder_id: target === "" || target === "none" ? undefined : target,
                },
            })
        ));
        setSelectedIds(new Set());
        fetchQuestions(0);
    }, [questions, fetchQuestions]);

    if (!auth?.user) {
        return (
            <div>
                <Banner />
                <div className="PleaseLogin">
                    <h1>Veuillez-vous inscrire pour voir vos questions</h1>
                    <Button className="linkLogin" onClick={() => navigate("/login")}>Page de connection !</Button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <div className="profilSearch libraryFilters">
                    <QuestionSearchBar
                        search={typeAndSearch.searchText}
                        onSearchChange={(v) => setTypeAndSearch((prev) => ({ ...prev, searchText: v }))}
                        typeFilter={typeAndSearch.type}
                        onTypeFilterChange={(v) => setTypeAndSearch((prev) => ({ ...prev, type: v }))}
                    />
                    <Select size="small" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
                        <MenuItem value="mine">Mes questions</MenuItem>
                        <MenuItem value="public">Questions publiques</MenuItem>
                        <MenuItem value="all">Toutes</MenuItem>
                    </Select>
                    <input
                        className="libraryTagsInput"
                        placeholder="Filtrer par tags (séparés par une virgule)"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                    />
                </div>

                <p className="libraryHint">Glissez une carte sur un dossier pour l'y ranger.</p>
                <div className="libraryFolderRow">
                    <FolderGrid
                        options={[
                            { value: "", label: "Toutes" },
                            { value: "none", label: "Sans dossier" },
                            ...folders.map((f) => ({ value: String(f.folder_id), label: f.name })),
                        ]}
                        active={String(folderId)}
                        onSelect={(v) => setFolderId(v === "" || v === "none" ? v : Number(v))}
                        onDropItem={(target, id) => moveQuestionsToFolder([id], target === "none" ? "none" : Number(target))}
                    />
                    <button type="button" className="libraryFolderManageToggle" onClick={() => setShowFolderManager((v) => !v)}>
                        {showFolderManager ? "Fermer la gestion des dossiers" : "Gérer les dossiers"}
                    </button>
                </div>

                {showFolderManager && (
                    <FolderManager folders={folders} onChanged={loadFolders} />
                )}

                <div className="librarySelectionRow">
                    <Button className="Button" onClick={() => { setSelectionMode((v) => !v); setSelectedIds(new Set()); }}>
                        {selectionMode ? "Annuler la sélection" : "Déplacer des questions vers un dossier"}
                    </Button>
                    {selectionMode && (
                        <>
                            <span className="librarySelectionCount">{selectedIds.size} sélectionnée(s)</span>
                            <Select size="small" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value as typeof moveTarget)} displayEmpty>
                                <MenuItem value="">Choisir un dossier…</MenuItem>
                                <MenuItem value="none">Sans dossier</MenuItem>
                                {folders.map((f) => (
                                    <MenuItem key={f.folder_id} value={f.folder_id}>{f.name}</MenuItem>
                                ))}
                            </Select>
                            <Button
                                className="Button"
                                disabled={selectedIds.size === 0 || moveTarget === ""}
                                onClick={() => { moveQuestionsToFolder([...selectedIds], moveTarget); setSelectionMode(false); }}
                            >
                                Déplacer
                            </Button>
                        </>
                    )}
                </div>

                <CardArea
                    title={`Vos questions (${total})`}
                    emptyText="Aucune question ne correspond à ces filtres"
                    cards={questionCards}
                    link="/create-a-question"
                    draggable={false}
                    setUsedCard={() => {}}
                />

                {questions.length < total && (
                    <Button className="Button" disabled={loading} onClick={() => fetchQuestions(questions.length)}>
                        {loading ? "Chargement…" : "Charger plus"}
                    </Button>
                )}
            </div>
        </div>
    );
}

export default MyQuestions;
