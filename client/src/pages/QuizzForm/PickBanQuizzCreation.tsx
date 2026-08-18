import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, FormControl, InputLabel, MenuItem, Select, Slider, Switch, TextField } from "@mui/material";
import { Banner } from "../../component/Banner/Banner";
import { QuizzModeNav } from "../../component/QuizzModeNav/QuizzModeNav";
import PickBanImagePreview from "../../component/PickBan/PickBanImagePreview";
import { AuthContext } from "../../context/authentContext";
import makeRequest, { tryRequest } from "../../tools/requestScheme";
import Toast from "../../tools/toast/toast";
import { getForcedQuestionTypeOptions } from "../../tools/props/Props";
import { useEntityByIdResolver } from "../../tools/hooks/useEntityByIdResolver";
import PublicationBlockedNotice from "../../component/PublicationStatus/PublicationBlockedNotice";
import "../CommonCss.css";
import "./PickBanQuizzForm.css";

interface ThemeSummary {
    theme_id: number;
    title: string;
    questions: number[];
}

/**
 * Résout le quizz existant (état de navigation, ou repli par id via l'URL —
 * ouverture directe/nouvel onglet) avant de monter le vrai formulaire.
 */
export function PickBanQuizzCreation() {
    const location = useLocation();
    const isModifying = location.pathname.startsWith("/modify-a-pickban-quizz");
    const { entity: existingQuizz, loading, ready } = useEntityByIdResolver({
        isModifying,
        entityKey: "quizz",
        idParamName: "quizz_id",
        byIdsUrl: (id) => `/quizz/by-ids?ids=${id}`,
        createRoute: "/create-a-pickban-quizz",
    });

    if (!ready) {
        return (
            <>
                <Banner />
                <div className="pickBanQuizzPage">
                    <div className="pickBanQuizzContent">
                        <h1>{loading ? "Chargement du quizz…" : "Ce quizz n'existe pas ou n'est pas accessible."}</h1>
                    </div>
                </div>
            </>
        );
    }

    return <PickBanQuizzCreationForm existingQuizz={existingQuizz} isModifying={isModifying} />;
}

/**
 * Le quizz décrit le vivier de thèmes proposé à la draft (chaque thème =
 * une case avec un titre, une image optionnelle, et 2-3 questions). Tout est
 * visible dès le départ : contrairement au mode Grid, il n'y a rien à cacher
 * avant que le thème soit réellement choisi et ses questions posées.
 */
function PickBanQuizzCreationForm({ existingQuizz, isModifying }: { existingQuizz: any; isModifying: boolean }) {
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
    const [columns, setColumns] = useState(existingQuizz?.columns || 6);
    const [draftSeconds, setDraftSeconds] = useState(existingQuizz?.draftTurnDurationMs ? existingQuizz.draftTurnDurationMs / 1000 : 20);
    const [answerSeconds, setAnswerSeconds] = useState(existingQuizz?.answerDurationMs ? existingQuizz.answerDurationMs / 1000 : 20);
    const [forcedType, setForcedType] = useState(existingQuizz?.forcedType || "ALL");
    const [correctPoints, setCorrectPoints] = useState(existingQuizz?.scoring?.correctPoints ?? 1);
    const [wrongPoints, setWrongPoints] = useState(existingQuizz?.scoring?.wrongPoints ?? 0);
    const [dccCash, setDccCash] = useState(existingQuizz?.scoring?.dccPoints?.cash ?? 5);
    const [dccCarre, setDccCarre] = useState(existingQuizz?.scoring?.dccPoints?.carre ?? 3);
    const [dccDuo, setDccDuo] = useState(existingQuizz?.scoring?.dccPoints?.duo ?? 1);
    const [allowBan, setAllowBan] = useState<boolean>(existingQuizz?.allowBan ?? true);

    const [availableThemes, setAvailableThemes] = useState<ThemeSummary[]>([]);
    const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>(
        existingQuizz?.themes?.map((t: ThemeSummary) => t.theme_id) || []
    );
    const [themeSearch, setThemeSearch] = useState("");
    const [imageByTheme, setImageByTheme] = useState<Record<number, string>>(
        existingQuizz?.themes?.reduce((acc: Record<number, string>, t: any) => {
            if (t.img) acc[t.theme_id] = t.img;
            return acc;
        }, {}) || {}
    );

    const [messageInfo, setMessageInfo] = useState("");
    const [showMessage, setShowMessage] = useState(false);
    const [error, setError] = useState("");
    const [showImagePreview, setShowImagePreview] = useState(false);

    useEffect(() => {
        const load = async () => {
            const themes = await tryRequest<ThemeSummary[]>("/theme/available-themes", "GET", {}, []);
            setAvailableThemes((themes ?? []).filter((t) => (t.questions?.length ?? 0) > 0));
        };
        load();
    }, []);

    const selectedThemes = useMemo(
        () => availableThemes.filter((t) => selectedThemeIds.includes(t.theme_id)),
        [availableThemes, selectedThemeIds]
    );
    const visibleThemes = useMemo(() => {
        const q = themeSearch.trim().toLowerCase();
        if (!q) return availableThemes;
        return availableThemes.filter((t) => t.title.toLowerCase().includes(q));
    }, [availableThemes, themeSearch]);

    const toggleTheme = useCallback((theme_id: number) => {
        setSelectedThemeIds((prev) =>
            prev.includes(theme_id) ? prev.filter((id) => id !== theme_id) : [...prev, theme_id]
        );
    }, []);

    const setImage = useCallback((theme_id: number, url: string) => {
        setImageByTheme((prev) => ({ ...prev, [theme_id]: url }));
    }, []);

    const previewImages = useMemo(
        () => selectedThemes.map((t) => imageByTheme[t.theme_id]).filter((url): url is string => Boolean(url)),
        [selectedThemes, imageByTheme]
    );

    const problems = useMemo(() => {
        const list: string[] = [];
        if (title.trim().length === 0) list.push("Il faut un titre.");
        if (selectedThemes.length < 2) {
            list.push("Sélectionnez au moins 2 thèmes : à moins de joueurs que de thèmes, le ban/give n'a aucun intérêt.");
        }
        const tooFew = selectedThemes.filter((t) => t.questions.length < 2);
        if (tooFew.length > 0) {
            list.push(
                "Ces thèmes ont moins de 2 questions, ajoutez-en pour une manche plus consistante : " +
                tooFew.map((t) => t.title).join(", ") + "."
            );
        }
        return list;
    }, [title, selectedThemes]);

    const blocking = problems.filter((p) => !p.includes("ajoutez-en"));

    const sendData = async () => {
        setError("");
        if (blocking.length > 0) return;
        try {
            const data = {
                mode: "PICKANDBAN",
                creator: auth?.user?.id,
                title: title.trim(),
                private: isPrivate,
                tags: [],
                columns,
                draftTurnDurationMs: draftSeconds * 1000,
                answerDurationMs: answerSeconds * 1000,
                allowBan,
                themes: selectedThemes.map((t) => ({
                    ...t,
                    img: imageByTheme[t.theme_id] || undefined,
                    imgOrString: Boolean(imageByTheme[t.theme_id]),
                })),
                forcedType,
                scoring: {
                    correctPoints,
                    wrongPoints,
                    dccPoints: { cash: dccCash, carre: dccCarre, duo: dccDuo },
                },
            };
            if (isModifying) {
                await makeRequest("/quizz/update", "PUT", { ...data, quizz_id: existingQuizz.quizz_id });
                setMessageInfo("Quizz Pick & Ban mis à jour avec succès");
            } else {
                await makeRequest("/quizz/create", "POST", data);
                setMessageInfo("Quizz Pick & Ban créé avec succès");
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

    return (
        <div className="pickBanQuizzPage">
            <Banner />
            {!isModifying && <QuizzModeNav />}
            <div className="pickBanQuizzContent">
                <h1>{isModifying ? "Modifier le quizz « Pick & Ban »" : "Créer un quizz « Pick & Ban »"}</h1>
                <p className="pbIntro">
                    La draft se joue par manches : tout le monde prend un thème pour soi
                    (dans l'ordre de passage), puis tout le monde en bannit un (si activé),
                    puis tout le monde en donne un à un autre participant désigné par
                    roulement — et on recommence tant qu'il reste des thèmes. Une fois la
                    draft terminée, chacun répond aux questions des thèmes obtenus pour
                    marquer des points.
                </p>

                <section className="pbSection">
                    <h2>Général</h2>
                    <TextField
                        label="Titre du quizz"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                    />
                    <label className="pbInlineLabel">
                        Privé
                        <Switch checked={isPrivate} onChange={() => setPrivate((p) => !p)} />
                    </label>
                    <PublicationBlockedNotice blockedCount={blockedCount} entityLabel="quizz" />
                    <label className="pbInlineLabel">
                        Autoriser le bannissement (manche "Ban" entre Pick et Give)
                        <Switch checked={allowBan} onChange={() => setAllowBan((p) => !p)} />
                    </label>
                </section>

                <section className="pbSection">
                    <h2>Rythme</h2>
                    <div className="pbSliders">
                        <label>
                            Colonnes d'affichage : {columns}
                            <Slider value={columns} min={2} max={10} step={1}
                                onChange={(_, v) => setColumns(v as number)} />
                        </label>
                        <label>
                            Temps par action de draft : {draftSeconds} s
                            <Slider value={draftSeconds} min={5} max={60} step={5}
                                onChange={(_, v) => setDraftSeconds(v as number)} />
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

                <section className="pbSection">
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
                    <p className="pbHint">Pour les questions Duo Carré Cash, le barème dépend du sous-mode joué :</p>
                    <TextField
                        label="Points Cash"
                        type="number"
                        value={dccCash}
                        onChange={(e) => setDccCash(Number(e.target.value))}
                    />
                    <TextField
                        label="Points Carré"
                        type="number"
                        value={dccCarre}
                        onChange={(e) => setDccCarre(Number(e.target.value))}
                    />
                    <TextField
                        label="Points Duo"
                        type="number"
                        value={dccDuo}
                        onChange={(e) => setDccDuo(Number(e.target.value))}
                    />
                </section>

                <section className="pbSection">
                    <div className="pbThemesHeader">
                        <h2>Thèmes ({selectedThemes.length} sélectionné{selectedThemes.length > 1 ? "s" : ""})</h2>
                        <Button className="Button" onClick={() => setShowImagePreview(true)}>
                            Voir l'aperçu
                        </Button>
                    </div>
                    <p className="pbHint">
                        Chaque thème sélectionné devient une case de la draft. Une image est
                        optionnelle — sans elle, seul le titre s'affiche.
                    </p>
                    {availableThemes.length === 0 ? (
                        <p className="filler">
                            Aucun thème avec des questions.{" "}
                            <a href="/create-a-theme">Créez-en un d'abord</a>.
                        </p>
                    ) : (
                        <>
                        <TextField
                            className="pbSearchField"
                            label="Rechercher un thème"
                            size="small"
                            value={themeSearch}
                            onChange={(e) => setThemeSearch(e.target.value)}
                            fullWidth
                        />
                        {visibleThemes.length === 0 ? (
                            <p className="filler">Aucun thème ne correspond.</p>
                        ) : (
                        <div className="pbThemeGrid">
                            {visibleThemes.map((theme) => {
                                const picked = selectedThemeIds.includes(theme.theme_id);
                                return (
                                    <div key={theme.theme_id} className={picked ? "pbThemeCard picked" : "pbThemeCard"}>
                                        <button type="button" className="pbThemeCardBody" onClick={() => toggleTheme(theme.theme_id)}>
                                            {imageByTheme[theme.theme_id] ? (
                                                <img src={imageByTheme[theme.theme_id]} alt="" className="pbThemeImg" />
                                            ) : (
                                                <div className="pbThemeImgPlaceholder">{theme.title}</div>
                                            )}
                                            <span className="pbThemeTitle">{theme.title}</span>
                                            <em>{theme.questions.length} question{theme.questions.length > 1 ? "s" : ""}</em>
                                        </button>
                                        {picked && (
                                            <TextField
                                                size="small"
                                                placeholder="URL d'image (optionnel)"
                                                value={imageByTheme[theme.theme_id] ?? ""}
                                                onChange={(e) => setImage(theme.theme_id, e.target.value)}
                                                fullWidth
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        )}
                        </>
                    )}
                </section>

                {problems.length > 0 && (
                    <ul className="pbProblems">
                        {problems.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                )}
                {error && <div className="login-error">{error}</div>}

                <div className="pbActions">
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
            {showImagePreview && (
                <PickBanImagePreview images={previewImages} onClose={() => setShowImagePreview(false)} />
            )}
        </div>
    );
}

export default PickBanQuizzCreation;
