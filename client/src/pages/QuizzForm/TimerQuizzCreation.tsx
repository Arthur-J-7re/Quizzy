import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, FormControl, InputLabel, MenuItem, Select, Slider, Switch, TextField } from "@mui/material";
import { Banner } from "../../component/Banner/Banner";
import { QuizzModeNav } from "../../component/QuizzModeNav/QuizzModeNav";
import { AuthContext } from "../../context/authentContext";
import makeRequest, { tryRequest } from "../../tools/requestScheme";
import Toast from "../../tools/toast/toast";
import { getForcedQuestionTypeOptions } from "../../tools/props/Props";
import { useEntityByIdResolver } from "../../tools/hooks/useEntityByIdResolver";
import PublicationBlockedNotice from "../../component/PublicationStatus/PublicationBlockedNotice";
import "../CommonCss.css";
import "./TimerQuizzForm.css";

interface ThemeSummary {
    theme_id: number;
    title: string;
    questions: number[];
}

/**
 * Résout le quizz existant (état de navigation, ou repli par id via l'URL —
 * ouverture directe/nouvel onglet) avant de monter le vrai formulaire.
 */
export function TimerQuizzCreation() {
    const location = useLocation();
    const isModifying = location.pathname.startsWith("/modify-a-timer-quizz");
    const { entity: existingQuizz, loading, ready } = useEntityByIdResolver({
        isModifying,
        entityKey: "quizz",
        idParamName: "quizz_id",
        byIdsUrl: (id) => `/quizz/by-ids?ids=${id}`,
        createRoute: "/create-a-timer-quizz",
    });

    if (!ready) {
        return (
            <>
                <Banner />
                <div className="timerQuizzPage">
                    <div className="timerQuizzContent">
                        <h1>{loading ? "Chargement du quizz…" : "Ce quizz n'existe pas ou n'est pas accessible."}</h1>
                    </div>
                </div>
            </>
        );
    }

    return <TimerQuizzCreationForm existingQuizz={existingQuizz} isModifying={isModifying} />;
}

/**
 * Chacun son tour : un décompte personnel (par défaut 100s) tourne pendant le
 * passage d'un joueur, qui répond aux questions de son thème en enchaînant le
 * plus vite possible. Une mauvaise réponse ne fait que remettre la question
 * en fin de file, sans arrêter le tour.
 */
function TimerQuizzCreationForm({ existingQuizz, isModifying }: { existingQuizz: any; isModifying: boolean }) {
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
    const [turnSeconds, setTurnSeconds] = useState(existingQuizz?.turnDurationMs ? existingQuizz.turnDurationMs / 1000 : 100);
    const [hostModeEnabled, setHostModeEnabled] = useState<boolean>(existingQuizz?.hostModeEnabled ?? false);
    const [forcedType, setForcedType] = useState(existingQuizz?.forcedType || "ALL");
    const [correctPoints, setCorrectPoints] = useState(existingQuizz?.scoring?.correctPoints ?? 1);
    const [wrongPoints, setWrongPoints] = useState(existingQuizz?.scoring?.wrongPoints ?? 0);
    const [streakEveryN, setStreakEveryN] = useState(existingQuizz?.scoring?.streakBonus?.everyN ?? 2);
    const [streakBonusPoints, setStreakBonusPoints] = useState(existingQuizz?.scoring?.streakBonus?.bonusPoints ?? 1);

    const [availableThemes, setAvailableThemes] = useState<ThemeSummary[]>([]);
    const [selectedThemeIds, setSelectedThemeIds] = useState<number[]>(
        existingQuizz?.themes?.map((t: ThemeSummary) => t.theme_id) || []
    );
    const [themeSearch, setThemeSearch] = useState("");

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

    const selectedThemes = useMemo(
        () => availableThemes.filter((t) => selectedThemeIds.includes(t.theme_id)),
        [availableThemes, selectedThemeIds]
    );
    const visibleThemes = useMemo(() => {
        const q = themeSearch.trim().toLowerCase();
        if (!q) return availableThemes;
        return availableThemes.filter((t) => t.title.toLowerCase().includes(q));
    }, [availableThemes, themeSearch]);

    const toggleTheme = (theme_id: number) => {
        setSelectedThemeIds((prev) =>
            prev.includes(theme_id) ? prev.filter((id) => id !== theme_id) : [...prev, theme_id]
        );
    };

    const problems = useMemo(() => {
        const list: string[] = [];
        if (title.trim().length === 0) list.push("Il faut un titre.");
        if (selectedThemes.length < 2) list.push("Sélectionnez au moins 2 thèmes (un par joueur).");
        return list;
    }, [title, selectedThemes]);

    const sendData = async () => {
        setError("");
        if (problems.length > 0) return;
        try {
            const data = {
                mode: "TIMER",
                creator: auth?.user?.id,
                title: title.trim(),
                private: isPrivate,
                tags: [],
                turnDurationMs: turnSeconds * 1000,
                themes: selectedThemes,
                hostModeEnabled,
                forcedType,
                scoring: {
                    correctPoints,
                    wrongPoints,
                    streakBonus: { everyN: streakEveryN, bonusPoints: streakBonusPoints },
                },
            };
            if (isModifying) {
                await makeRequest("/quizz/update", "PUT", { ...data, quizz_id: existingQuizz.quizz_id });
                setMessageInfo("Quizz Timer mis à jour avec succès");
            } else {
                await makeRequest("/quizz/create", "POST", data);
                setMessageInfo("Quizz Timer créé avec succès");
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
        <div className="timerQuizzPage">
            <Banner />
            {!isModifying && <QuizzModeNav />}
            <div className="timerQuizzContent">
                <h1>{isModifying ? "Modifier le quizz « Timer »" : "Créer un quizz « Timer »"}</h1>
                <p className="timerIntro">
                    Chacun son tour : chaque joueur a un temps limité (par défaut 100s) pour
                    répondre au maximum de questions de son thème. Une mauvaise réponse ne fait
                    que remettre la question en fin de file, le chrono continue de tourner.
                </p>

                <section className="timerSection">
                    <h2>Général</h2>
                    <TextField
                        label="Titre du quizz"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        fullWidth
                    />
                    <label className="timerInlineLabel">
                        Privé
                        <Switch checked={isPrivate} onChange={() => setPrivate((p) => !p)} />
                    </label>
                    <PublicationBlockedNotice blockedCount={blockedCount} entityLabel="quizz" />
                </section>

                <section className="timerSection">
                    <h2>Rythme</h2>
                    <label>
                        Temps par joueur : {turnSeconds} s
                        <Slider value={turnSeconds} min={30} max={180} step={10}
                            onChange={(_, v) => setTurnSeconds(v as number)} />
                    </label>
                    <label className="timerInlineLabel">
                        Avec un présentateur
                        <Switch checked={hostModeEnabled} onChange={() => setHostModeEnabled((p) => !p)} />
                    </label>
                    <p className="timerHint">
                        Le présentateur ne joue pas : il pose les questions à voix haute et juge
                        lui-même chaque réponse (boutons bonne/mauvaise réponse/passe), au lieu
                        d'une validation automatique. Ce quizz ne sera jouable que depuis une
                        émission ayant elle aussi l'option « avec un présentateur ».
                    </p>
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

                <section className="timerSection">
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
                    <TextField
                        label="Bonus toutes les N bonnes réponses consécutives"
                        type="number"
                        value={streakEveryN}
                        onChange={(e) => setStreakEveryN(Number(e.target.value))}
                    />
                    <TextField
                        label="Points bonus"
                        type="number"
                        value={streakBonusPoints}
                        onChange={(e) => setStreakBonusPoints(Number(e.target.value))}
                    />
                </section>

                <section className="timerSection">
                    <h2>Thèmes ({selectedThemes.length} sélectionné{selectedThemes.length > 1 ? "s" : ""})</h2>
                    <p className="timerHint">Un thème = un joueur. Sélectionnez-en au moins autant que de joueurs attendus.</p>
                    {availableThemes.length === 0 ? (
                        <p className="filler">
                            Aucun thème avec des questions.{" "}
                            <a href="/create-a-theme">Créez-en un d'abord</a>.
                        </p>
                    ) : (
                        <>
                            <TextField
                                className="timerSearchField"
                                label="Rechercher un thème"
                                size="small"
                                value={themeSearch}
                                onChange={(e) => setThemeSearch(e.target.value)}
                                fullWidth
                            />
                            {visibleThemes.length === 0 ? (
                                <p className="filler">Aucun thème ne correspond.</p>
                            ) : (
                                <div className="timerThemeList">
                                    {visibleThemes.map((theme) => {
                                        const picked = selectedThemeIds.includes(theme.theme_id);
                                        return (
                                            <button
                                                key={theme.theme_id}
                                                type="button"
                                                className={picked ? "timerThemeChip picked" : "timerThemeChip"}
                                                onClick={() => toggleTheme(theme.theme_id)}
                                            >
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

                {problems.length > 0 && (
                    <ul className="timerProblems">
                        {problems.map((p) => <li key={p}>{p}</li>)}
                    </ul>
                )}
                {error && <div className="login-error">{error}</div>}

                <div className="timerActions">
                    <Button className="Button" onClick={() => navigate(-1)}>Annuler</Button>
                    {isModifying && (
                        <Button className="Button" onClick={deleteQuizzHandler}>Supprimer le quizz</Button>
                    )}
                    <Button className="Button" disabled={problems.length > 0} onClick={sendData}>
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

export default TimerQuizzCreation;
