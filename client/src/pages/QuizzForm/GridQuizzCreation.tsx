import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, FormControl, InputLabel, MenuItem, Select, Slider, Switch, TextField } from "@mui/material";
import { GRID_COLORS, NEUTRAL_COLOR } from "shared-types";
import { Banner } from "../../component/Banner/Banner";
import { QuizzModeNav } from "../../component/QuizzModeNav/QuizzModeNav";
import { AuthContext } from "../../context/authentContext";
import makeRequest, { tryRequest } from "../../tools/requestScheme";
import Toast from "../../tools/toast/toast";
import { getForcedQuestionTypeOptions } from "../../tools/props/Props";
import { useQuestionPicker } from "../../tools/hooks/useQuestionPicker";
import { useEntityByIdResolver } from "../../tools/hooks/useEntityByIdResolver";
import QuestionPicker from "../../component/QuestionPicker/QuestionPicker";
import PublicationBlockedNotice from "../../component/PublicationStatus/PublicationBlockedNotice";
import "../CommonCss.css";
import "../../component/Card/Card.css";
import "./GridQuizzForm.css";

interface ThemeSummary {
    theme_id: number;
    title: string;
    questions: number[];
}

/**
 * Résout le quizz existant (état de navigation, ou repli par id via l'URL —
 * ouverture directe/nouvel onglet) avant de monter le vrai formulaire : celui-ci
 * peut alors dériver tous ses champs de `existingQuizz` sans se soucier de son
 * arrivée asynchrone (il ne monte qu'une fois la résolution terminée).
 */
export function GridQuizzCreation() {
    const location = useLocation();
    const isModifying = location.pathname.startsWith("/modify-a-grid-quizz");
    const { entity: existingQuizz, loading, ready } = useEntityByIdResolver({
        isModifying,
        entityKey: "quizz",
        idParamName: "quizz_id",
        byIdsUrl: (id) => `/quizz/by-ids?ids=${id}`,
        createRoute: "/create-a-grid-quizz",
    });

    if (!ready) {
        return (
            <>
                <Banner />
                <div className="gridQuizzPage">
                    <div className="gridQuizzContent">
                        <h1>{loading ? "Chargement du quizz…" : "Ce quizz n'existe pas ou n'est pas accessible."}</h1>
                    </div>
                </div>
            </>
        );
    }

    return <GridQuizzCreationForm existingQuizz={existingQuizz} isModifying={isModifying} />;
}

function GridQuizzCreationForm({ existingQuizz, isModifying }: { existingQuizz: any; isModifying: boolean }) {
    const navigate = useNavigate();
    const auth = useContext(AuthContext);

    const [title, setTitle] = useState(existingQuizz?.title || "");
    const [isPrivate, setPrivate] = useState<boolean>(existingQuizz?.private ?? true);
    // Cf. ROADMAP.md, Phase 3 : la publication demandée peut rester bloquée
    // si des questions référencées ne sont pas approuvées.
    const [blockedCount, setBlockedCount] = useState(0);
    useEffect(() => {
        if (isPrivate || !existingQuizz?.quizz_id) {
            setBlockedCount(0);
            return;
        }
        let cancelled = false;
        makeRequest(`/quizz/${existingQuizz.quizz_id}/publication-status`)
            .then((status) => { if (!cancelled) setBlockedCount(status.blockedCount ?? 0); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [isPrivate, existingQuizz?.quizz_id]);
    const [width, setWidth] = useState(existingQuizz?.width || 5);
    const [height, setHeight] = useState(existingQuizz?.height || 4);
    const [cellsPerTheme, setCellsPerTheme] = useState(existingQuizz?.cellsPerTheme || 3);
    const [memorizeSeconds, setMemorizeSeconds] = useState(existingQuizz?.memorizeDurationMs ? existingQuizz.memorizeDurationMs / 1000 : 8);
    const [answerSeconds, setAnswerSeconds] = useState(existingQuizz?.answerDurationMs ? existingQuizz.answerDurationMs / 1000 : 20);
    const [forcedType, setForcedType] = useState(existingQuizz?.forcedType || "ALL");
    const [correctPoints, setCorrectPoints] = useState(existingQuizz?.scoring?.correctPoints ?? 1);
    const [wrongPoints, setWrongPoints] = useState(existingQuizz?.scoring?.wrongPoints ?? 0);

    const [availableThemes, setAvailableThemes] = useState<ThemeSummary[]>([]);
    const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>(
        existingQuizz?.themes?.map((t: ThemeSummary) => t.theme_id) || []
    );
    const [themeSearch, setThemeSearch] = useState("");
    const [neutralQuestions, setNeutralQuestions] = useState<number[]>(existingQuizz?.neutralQuestions || []);
    const questionPicker = useQuestionPicker();

    const [messageInfo, setMessageInfo] = useState("");
    const [showMessage, setShowMessage] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const load = async () => {
            const themes = await tryRequest<ThemeSummary[]>("/theme/available-themes", "GET", {}, []);
            setAvailableThemes((themes ?? []).filter((t) => (t.questions?.length ?? 0) > 0));
        };
        load();
    }, []);

    const totalCells = width * height;

    /** Un thème avec moins de questions que ce qu'il faut par case serait injouable :
     * on ne le propose donc jamais, plutôt que de prévenir après coup. */
    const eligibleThemes = useMemo(
        () => availableThemes.filter((t) => t.questions.length >= cellsPerTheme),
        [availableThemes, cellsPerTheme]
    );
    const hiddenBySize = availableThemes.length - eligibleThemes.length;
    const visibleThemes = useMemo(() => {
        const q = themeSearch.trim().toLowerCase();
        if (!q) return eligibleThemes;
        return eligibleThemes.filter((t) => t.title.toLowerCase().includes(q));
    }, [eligibleThemes, themeSearch]);

    const selectedThemes = useMemo(
        () => availableThemes.filter((t) => selectedThemeIds.includes(t.theme_id)),
        [availableThemes, selectedThemeIds]
    );
    const themedCells = selectedThemes.length * cellsPerTheme;
    const neutralCells = Math.max(0, totalCells - themedCells);

    /** Si on augmente "cases par thème", certaines sélections en place peuvent devenir trop petites. */
    useEffect(() => {
        const eligibleIds = new Set(eligibleThemes.map((t) => t.theme_id));
        setSelectedThemeIds((prev) => {
            const next = prev.filter((id) => eligibleIds.has(id));
            return next.length === prev.length ? prev : next;
        });
    }, [eligibleThemes]);

    const toggleTheme = useCallback((theme_id: number) => {
        setSelectedThemeIds((prev) =>
            prev.includes(theme_id) ? prev.filter((id) => id !== theme_id) : [...prev, theme_id]
        );
    }, []);

    const toggleNeutralQuestion = useCallback((question_id: number) => {
        setNeutralQuestions((prev) =>
            prev.includes(question_id) ? prev.filter((id) => id !== question_id) : [...prev, question_id]
        );
    }, []);

    /** Les règles qui rendraient une partie injouable, vérifiées avant envoi. */
    const problems = useMemo(() => {
        const list: string[] = [];
        if (title.trim().length === 0) list.push("Il faut un titre.");
        if (selectedThemes.length < 2) list.push("Sélectionnez au moins 2 thèmes (un par joueur).");
        if (themedCells > totalCells) {
            list.push(
                `${selectedThemes.length} thèmes × ${cellsPerTheme} cases = ${themedCells} cases, ` +
                `mais la grille n'en compte que ${totalCells}.`
            );
        }
        if (neutralCells > 0 && neutralQuestions.length === 0) {
            list.push(
                `${neutralCells} case(s) resteront sans thème : ajoutez des questions génériques ` +
                `ou agrandissez la part des thèmes.`
            );
        }
        return list;
    }, [title, selectedThemes, themedCells, totalCells, neutralCells, neutralQuestions, cellsPerTheme]);

    const blocking = problems;

    const sendData = async () => {
        setError("");
        if (blocking.length > 0) return;
        try {
            const data = {
                mode: "GRID",
                creator: auth?.user?.id,
                title: title.trim(),
                private: isPrivate,
                tags: [],
                width,
                height,
                cellsPerTheme,
                memorizeDurationMs: memorizeSeconds * 1000,
                answerDurationMs: answerSeconds * 1000,
                themes: selectedThemes,
                neutralQuestions,
                forcedType,
                scoring: { correctPoints, wrongPoints },
            };
            if (isModifying) {
                await makeRequest("/quizz/update", "PUT", { ...data, quizz_id: existingQuizz.quizz_id });
                setMessageInfo("Quizz Grid mis à jour avec succès");
            } else {
                await makeRequest("/quizz/create", "POST", data);
                setMessageInfo("Quizz Grid créé avec succès");
            }
            setShowMessage(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "La sauvegarde a échoué.");
        }
    };

    const deleteQuizzHandler = async () => {
        const confirmation = window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce quizz ?");
        if (confirmation) {
            const retour = await makeRequest("/quizz", "DELETE", { quizz_id: existingQuizz.quizz_id });
            if (retour.success) {
                navigate(-1);
            }
        }
    };

    /** Aperçu : une case par thème dans l'ordre, le reste en neutre. */
    const previewCells = useMemo(() => {
        const cells: string[] = [];
        selectedThemes.forEach((_, i) => {
            for (let c = 0; c < cellsPerTheme; c++) {
                cells.push(GRID_COLORS[i % GRID_COLORS.length]);
            }
        });
        while (cells.length < totalCells) cells.push(NEUTRAL_COLOR);
        return cells.slice(0, totalCells);
    }, [selectedThemes, cellsPerTheme, totalCells]);

    return (
        <div className="gridQuizzPage">
            <Banner />
            {!isModifying && <QuizzModeNav />}
            <div className="gridQuizzContent">
                <h1>{isModifying ? "Modifier le quizz « Grid »" : "Créer un quizz « Grid »"}</h1>
                <p className="gridIntro">
                    Chaque joueur reçoit un thème et une couleur. Les couleurs sont affichées
                    quelques secondes au début, puis masquées : à chacun de retenir où sont ses
                    points forts pour viser les bonnes cases.
                </p>

                <section className="gridSection">
                    <h2>Général</h2>
                    <TextField
                        label="Titre du quizz"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                    />
                    <label className="gridInlineLabel">
                        Privé
                        <Switch checked={isPrivate} onChange={() => setPrivate((p) => !p)} />
                    </label>
                    <PublicationBlockedNotice blockedCount={blockedCount} entityLabel="quizz" />
                </section>

                <section className="gridSection">
                    <h2>La grille</h2>
                    <div className="gridSliders">
                        <label>
                            Largeur : {width}
                            <Slider value={width} min={2} max={8} step={1}
                                onChange={(_, v) => setWidth(v as number)} />
                        </label>
                        <label>
                            Hauteur : {height}
                            <Slider value={height} min={2} max={8} step={1}
                                onChange={(_, v) => setHeight(v as number)} />
                        </label>
                        <label>
                            Cases par thème : {cellsPerTheme}
                            <Slider value={cellsPerTheme} min={1} max={8} step={1}
                                onChange={(_, v) => setCellsPerTheme(v as number)} />
                        </label>
                    </div>

                    <div className="gridCounts">
                        <span><strong>{totalCells}</strong> cases au total</span>
                        <span><strong>{Math.min(themedCells, totalCells)}</strong> à thème</span>
                        <span><strong>{neutralCells}</strong> génériques</span>
                    </div>

                    <div className="gridPreview" style={{ gridTemplateColumns: `repeat(${width}, 1fr)` }}>
                        {previewCells.map((color, i) => (
                            <div key={i} className="gridPreviewCell" style={{ backgroundColor: color }} />
                        ))}
                    </div>
                </section>

                <section className="gridSection">
                    <h2>Thèmes ({selectedThemes.length} sélectionné{selectedThemes.length > 1 ? "s" : ""})</h2>
                    <p className="gridHint">
                        Un thème = un joueur. Sélectionnez-en au moins autant que de joueurs attendus.
                        Seuls les thèmes avec au moins {cellsPerTheme} question{cellsPerTheme > 1 ? "s" : ""} sont proposés,
                        pour éviter de répéter des questions sur la grille.
                    </p>
                    {availableThemes.length === 0 ? (
                        <p className="filler">
                            Aucun thème avec des questions.{" "}
                            <a href="/create-a-theme">Créez-en un d'abord</a>.
                        </p>
                    ) : (
                        <>
                            <TextField
                                className="gridSearchField"
                                label="Rechercher un thème"
                                size="small"
                                value={themeSearch}
                                onChange={(e) => setThemeSearch(e.target.value)}
                                fullWidth
                            />
                            {hiddenBySize > 0 && (
                                <p className="gridHint">
                                    {hiddenBySize} thème{hiddenBySize > 1 ? "s" : ""} masqué{hiddenBySize > 1 ? "s" : ""} car
                                    il{hiddenBySize > 1 ? "s ont" : " a"} moins de {cellsPerTheme} question{cellsPerTheme > 1 ? "s" : ""}.
                                </p>
                            )}
                            {visibleThemes.length === 0 ? (
                                <p className="filler">Aucun thème ne correspond.</p>
                            ) : (
                                <div className="gridThemeList">
                                    {visibleThemes.map((theme) => {
                                        const rank = selectedThemeIds.indexOf(theme.theme_id);
                                        const picked = rank >= 0;
                                        return (
                                            <button
                                                key={theme.theme_id}
                                                type="button"
                                                className={picked ? "gridThemeChip picked" : "gridThemeChip"}
                                                style={picked ? { borderColor: GRID_COLORS[rank % GRID_COLORS.length] } : undefined}
                                                onClick={() => toggleTheme(theme.theme_id)}
                                            >
                                                {picked && (
                                                    <span className="gridThemeDot"
                                                        style={{ backgroundColor: GRID_COLORS[rank % GRID_COLORS.length] }} />
                                                )}
                                                {theme.title}
                                                <em>{theme.questions.length} q.</em>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </section>

                {neutralCells > 0 && (
                    <section className="gridSection">
                        <h2>Questions génériques ({neutralQuestions.length})</h2>
                        <p className="gridHint">
                            Elles remplissent les {neutralCells} case(s) sans thème, en gris sur la grille.
                        </p>
                        <QuestionPicker
                            results={questionPicker.results}
                            folders={questionPicker.folders}
                            filter={questionPicker.filter}
                            onFilterChange={questionPicker.setFilter}
                            loading={questionPicker.loading}
                            selectedIds={neutralQuestions}
                            onToggle={toggleNeutralQuestion}
                        />
                    </section>
                )}

                <section className="gridSection">
                    <h2>Rythme</h2>
                    <div className="gridSliders">
                        <label>
                            Mémorisation : {memorizeSeconds} s
                            <Slider value={memorizeSeconds} min={3} max={30} step={1}
                                onChange={(_, v) => setMemorizeSeconds(v as number)} />
                        </label>
                        <label>
                            Temps de réponse : {answerSeconds} s
                            <Slider value={answerSeconds} min={5} max={60} step={5}
                                onChange={(_, v) => setAnswerSeconds(v as number)} />
                        </label>
                    </div>
                    <FormControl fullWidth>
                        <InputLabel>Type de question forcé</InputLabel>
                        <Select
                            value={forcedType}
                            label="Type de question forcé"
                            onChange={(e) => setForcedType(e.target.value)}
                        >
                            {getForcedQuestionTypeOptions().map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.title}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </section>

                <section className="gridSection">
                    <h2>Barème</h2>
                    <TextField
                        label="Points par bonne réponse"
                        type="number"
                        value={correctPoints}
                        onChange={(e) => setCorrectPoints(Number(e.target.value))}
                    />
                    <TextField
                        label="Points par mauvaise réponse"
                        type="number"
                        value={wrongPoints}
                        onChange={(e) => setWrongPoints(Number(e.target.value))}
                    />
                </section>

                {problems.length > 0 && (
                    <ul className="gridProblems">
                        {problems.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                )}
                {error && <div className="login-error">{error}</div>}

                <div className="gridActions">
                    <Button className="Button" onClick={() => navigate(-1)}>Annuler</Button>
                    {isModifying && (
                        <Button className="Button" onClick={deleteQuizzHandler}>Supprimer le quizz</Button>
                    )}
                    <Button className="Button" disabled={blocking.length > 0} onClick={sendData}>
                        {isModifying ? "Sauvegarder le quizz" : "Créer le quizz"}
                    </Button>
                </div>
            </div>

            {showMessage && (
                <Toast message={messageInfo} onClose={() => { setShowMessage(false); navigate(-1); }} />
            )}
        </div>
    );
}

export default GridQuizzCreation;
