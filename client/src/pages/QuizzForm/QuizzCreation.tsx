import { Button, FormControl, InputLabel, MenuItem, Select, Slider, Switch, TextField } from "@mui/material";
import { Banner } from "../../component/Banner/Banner"
import { QuizzModeNav } from "../../component/QuizzModeNav/QuizzModeNav"
import { useNavigate, useLocation, useParams } from "react-router-dom"
import { useContext, useEffect, useState, useCallback } from "react";
import { AuthContext } from "../../context/authentContext";
import Toast from "../../tools/toast/toast";
import "../CommonCss.css";
import "../../component/Card/Card.css";
import "./QuizzForm.css";
import makeRequest from "../../tools/requestScheme";
import { getForcedQuestionTypeOptions } from "../../tools/props/Props";
import { getQuestionModeLabel } from "../../tools/text/text";
import { useQuestionPicker } from "../../tools/hooks/useQuestionPicker";
import QuestionPicker from "../../component/QuestionPicker/QuestionPicker";
import PublicationBlockedNotice from "../../component/PublicationStatus/PublicationBlockedNotice";


export function QuizzCreation () {
    const navigate = useNavigate();
    const location = useLocation();
    const { quizz_id: quizzIdParam } = useParams();
    // .startsWith plutôt qu'une égalité stricte : /modify-a-quizz/:quizz_id
    // (ouverture directe par id, ctrl/cmd/molette-clic) doit aussi compter.
    const isModifying = location.pathname.startsWith("/modify-a-quizz");
    // Précédence des opérateurs : `a && b || c` groupe comme `(a && b) || c`, donc
    // avec `b` une comparaison (un booléen), l'ancienne expression valait `true`
    // (pas le quizz) au premier rendu en édition — le cache de sélection du
    // picker de questions n'avait alors aucun id à résoudre via /question/by-ids.
    const [quizz, setQuizz] = useState(
        (location.state?.quizz && isModifying)
            ? location.state.quizz
            : { title: "", Private: false, questions: [], tags: [] }
    );
    const [creating, setCreating] = useState(!isModifying);
    const [loadingQuizz, setLoadingQuizz] = useState(false);
    const [quizzNotFound, setQuizzNotFound] = useState(false);

    // Ouverture directe (nouvel onglet, ctrl/cmd/molette-clic, lien partagé) :
    // pas de location.state dans ce cas, on résout le quizz depuis l'id de
    // l'URL — l'effet de resynchronisation plus bas s'occupe ensuite de
    // repeupler le formulaire dès que `quizz` change.
    useEffect(() => {
        if (quizz?.quizz_id || !quizzIdParam) return;
        setLoadingQuizz(true);
        makeRequest(`/quizz/by-ids?ids=${quizzIdParam}`)
            .then((qs: any[]) => {
                if (qs && qs[0]) setQuizz(qs[0]);
                else setQuizzNotFound(true);
            })
            .catch(() => setQuizzNotFound(true))
            .finally(() => setLoadingQuizz(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizzIdParam]);

    const auth = useContext(AuthContext);
    const user_id = auth?.user?.id || "0";
    const picker = useQuestionPicker();
    const [title, setTitle] = useState(quizz?.title || "");

    const [isPrivate, setPrivate] = useState(quizz?.private ?? true);
    // Cf. ROADMAP.md, Phase 3 : la publication demandée peut rester bloquée
    // si des questions référencées ne sont pas approuvées.
    const [blockedCount, setBlockedCount] = useState(0);
    useEffect(() => {
        if (isPrivate || !quizz?.quizz_id) {
            setBlockedCount(0);
            return;
        }
        let cancelled = false;
        makeRequest(`/quizz/${quizz.quizz_id}/publication-status`)
            .then((status) => { if (!cancelled) setBlockedCount(status.blockedCount ?? 0); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [isPrivate, quizz?.quizz_id]);
    const [answerSeconds, setAnswerSeconds] = useState(quizz?.answerDurationMs ? quizz.answerDurationMs / 1000 : 20);
    const [forcedType, setForcedType] = useState(quizz?.forcedType || "ALL");
    const [correctPoints, setCorrectPoints] = useState(quizz?.scoring?.correctPoints ?? 1);
    const [wrongPoints, setWrongPoints] = useState(quizz?.scoring?.wrongPoints ?? 0);
    const [selectedQuestions, setSelectedQuestions] = useState<any[]>([]);
    const [tags, setTags] = useState<string[]>(quizz?.tags || []);
    const [messageInfo, setMessageInfo] = useState("");
    const [showMessage, setShowMessage] = useState(false);
    const [endTaskToast, setEndTaskToast] = useState<() => void>(() => () => {});

    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
        event.dataTransfer.setData("index", index.toString());
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); // Permet le drop
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>, newIndex: number) => {
        event.preventDefault();
        const oldIndex = Number(event.dataTransfer.getData("index"));
        // Réorganise la liste des questions
        setSelectedQuestions((prevQuestions) => {
            const updatedQuestions = [...prevQuestions];
            const [movedQuestion] = updatedQuestions.splice(oldIndex, 1);
            updatedQuestions.splice(newIndex, 0, movedQuestion);
            return updatedQuestions;
        });
    };


    useEffect(() => {
        if (!isModifying || quizz?.quizz_id) return;
        if (quizzIdParam) {
            if (quizzNotFound) navigate("/create-a-quizz");
            return;
        }
        navigate("/create-a-quizz");
    }, [quizz?.quizz_id, isModifying, quizzIdParam, quizzNotFound, navigate]);

    useEffect(()=>{
        setTitle(quizz?.title || "");
        setTags(quizz?.tags || []);
        setPrivate(quizz?.private ?? true);
        setAnswerSeconds(quizz?.answerDurationMs ? quizz.answerDurationMs / 1000 : 20);
        setForcedType(quizz?.forcedType || "ALL");
        setCorrectPoints(quizz?.scoring?.correctPoints ?? 1);
        setWrongPoints(quizz?.scoring?.wrongPoints ?? 0);
        setCreating(quizz?.title ? false : true);
    }, [quizz]);

    // Résolution ponctuelle des questions déjà sélectionnées (édition), une
    // seule fois par quizz chargé (clé sur quizz_id) — indépendante du picker
    // et de son cache, qui eux évoluent avec les filtres : les rebrancher ici
    // écraserait la sélection/l'ordre à chaque changement de filtre.
    useEffect(() => {
        const ids: number[] = quizz?.questions ?? [];
        if (ids.length === 0) return;
        let cancelled = false;
        makeRequest(`/question/by-ids?ids=${ids.join(",")}`).then((qs: any[]) => {
            if (cancelled || !qs) return;
            const ordered = ids
                .map((id) => qs.find((q) => q.question_id === Number(id)))
                .filter((q): q is any => q !== undefined);
            setSelectedQuestions(ordered);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizz?.quizz_id]);


    /** Bascule une question (par id) entre le vivier du picker et la sélection du quizz. */
    const toggleQuestionById = useCallback((question_id: number) => {
        setSelectedQuestions(prev => {
            const found = prev.some(q => q.question_id === question_id);
            if (found) {
                return prev.filter(q => q.question_id !== question_id);
            }
            const question = picker.results.find((r: any) => r.question_id === question_id);
            return question ? [...prev, question] : prev;
        });
    }, [picker.results]);

    const removeSelectedQuestion = useCallback((question_id: number) => {
        setSelectedQuestions(prev => prev.filter(q => q.question_id !== question_id));
    }, []);

    const addTag = (tag : string) => {
        if (!tags.includes(tag) && tags.length < 5) {
            setTags([...tags, tag]);
        }
    };

    const removeTag = (tagToRemove : string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const changePrivate = () =>{
        setPrivate(!isPrivate);
    };

    const validateQuizz = () => {
        if (!title.trim()) {
            setMessageInfo("Il faut un nom pour le Quizz !");
            setShowMessage(true);
            return false;
        }

        if (selectedQuestions.length === 0) {
            setMessageInfo("Il faut au moins une question !");
            setShowMessage(true);
            return false;
        }


        return true;
    }

    const deleteQuizz = async () => {
        const confirmation = window.confirm("Êtes-vous sûr de vouloir supprimer définitivement la question ?");
        if (confirmation) {
            const response = await makeRequest("/quizz", "DELETE", {quizz_id : quizz.quizz_id});
            if (response.success){
                navigate(-1)
            }
        }
    };

    const endTask = () =>{
        setMessageInfo("quizz créé avec succès");
        setShowMessage(true);
        setEndTaskToast(() => () => navigate(-1));
    }

    const sendData = async () => {
        if (validateQuizz()) {
            const questionList = selectedQuestions.map((question) => question.question_id);
            if (creating){
                const retour = await makeRequest("/quizz/create", "POST", {
                    mode: "LIST",
                    creator: user_id,
                    title: title,
                    private: isPrivate,
                    tags: tags,
                    questions: questionList,
                    questionList: questionList,
                    answerDurationMs: answerSeconds * 1000,
                    forcedType: forcedType,
                    scoring: { correctPoints: correctPoints, wrongPoints: wrongPoints }
                });
                if (retour.success){
                    endTask();
                }
            } else {
                const retour = await makeRequest("/quizz/update", "PUT", {
                    mode: "LIST",
                    quizz_id: quizz.quizz_id,
                    creator: user_id,
                    title: title,
                    private: isPrivate,
                    tags: tags,
                    questions: questionList,
                    questionList: questionList,
                    answerDurationMs: answerSeconds * 1000,
                    forcedType: forcedType,
                    scoring: { correctPoints: correctPoints, wrongPoints: wrongPoints }
                });
                if (retour.success){
                    endTask();
                }
            }
        }
    };

    if (isModifying && quizzIdParam && !quizz?.quizz_id) {
        return (
            <div className="quizzCreationPage">
                <Banner></Banner>
                <div className="quizzCreationContent">
                    <h1>{loadingQuizz ? "Chargement du quizz…" : "Ce quizz n'existe pas ou n'est pas accessible."}</h1>
                </div>
            </div>
        );
    }

    return (
    (auth && auth.user) ?
    <div className="quizzCreationPage">
        <Banner></Banner>
        {creating && <QuizzModeNav />}
        <div className="quizzCreationContent">
            <h1>{creating ? "Créer un quizz « Liste »" : "Modifier le quizz"}</h1>
            <p className="quizzCreationIntro">
                Choisissez librement des questions et l'ordre dans lequel elles seront posées.
            </p>

            <section className="quizzSection">
                <h2>Général</h2>
                <TextField
                    label="Titre du quizz"
                    value={title || ''}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                />
                <label className="quizzInlineLabel">
                    Privé
                    <Switch
                        checked={isPrivate}
                        className='isPrivate'
                        onClick={() => changePrivate()}
                    />
                </label>
                <PublicationBlockedNotice blockedCount={blockedCount} entityLabel="quizz" />
                <label className="quizzSliderLabel" id="answerDurationLabel">
                    Temps de réponse par question : {answerSeconds} s
                    <Slider
                        value={answerSeconds}
                        min={5}
                        max={60}
                        step={5}
                        aria-labelledby="answerDurationLabel"
                        onChange={(_, v) => setAnswerSeconds(v as number)}
                    />
                </label>
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

            <section className="quizzSection">
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

            <section className="quizzSection">
                <h2>Questions disponibles</h2>
                <QuestionPicker
                    results={picker.results}
                    folders={picker.folders}
                    filter={picker.filter}
                    onFilterChange={picker.setFilter}
                    loading={picker.loading}
                    selectedIds={selectedQuestions.map((q) => q.question_id)}
                    onToggle={toggleQuestionById}
                />
            </section>

            <section className="quizzSection">
                <h2>Questions du quizz ({selectedQuestions.length})</h2>
                <p className="quizzHint">Glissez-déposez une question pour changer l'ordre dans lequel elles seront posées.</p>
                {selectedQuestions.length > 0 ? (
                    <div className="quizzQuestionList">
                        {selectedQuestions.map((question, index) => (
                            <div
                                key={question.question_id}
                                draggable
                                onDragStart={(event) => handleDragStart(event, index)}
                                onDragOver={handleDragOver}
                                onDrop={(event) => handleDrop(event, index)}
                                onClick={() => removeSelectedQuestion(question.question_id)}
                                style={{ cursor: "grab" }}
                                className="quizzQuestionChip picked"
                            >
                                {question.title}
                                <span className={"mode type-" + String(question.mode).toLowerCase()}>
                                    {getQuestionModeLabel(question.mode)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <h2 className="filler">Sélectionnez des questions pour votre quizz !</h2>
                )}
            </section>

            <section className="quizzSection">
                <h2>Tags ({tags?.length ?? 0}/5)</h2>
                <div className='quizzTagList'>
                    {tags?.map(tag => (
                    <span key={tag} onClick={() => removeTag(tag)} className="quizzTagChip">
                        {tag} ❌
                    </span>
                    ))}
                </div>
                {tags?.length < 5 ? (
                    <input
                    type="text"
                    className="quizzTagInput"
                    onKeyDown={(e) => {
                        const inputElement = e.target as HTMLInputElement;
                        if (e.key === "Enter" && inputElement.value.trim()) {
                        addTag(inputElement.value.trim());
                        inputElement.value = "";
                        }
                    }}
                    placeholder="Ajouter un tag"
                    />
                ) : (
                    <p className="quizzTagLimit">Maximum 5 tags atteints</p>
                )}
            </section>

            <div className="quizzActions">
                {!creating && <Button className="Button" onClick={() => deleteQuizz()}>Supprimer le quizz</Button>}
                <Button className="Button" onClick={() => sendData()}>{creating ? "Créer le quizz" : "Sauvegarder le quizz"}</Button>
            </div>
        </div>

        {showMessage &&
            <Toast message={messageInfo} onClose={()=>{setShowMessage(false); endTaskToast();}} />}
    </div>
    :
    <div className="quizzCreationPage">
        <Banner></Banner>
        <div className='PleaseLogin'>
            <h1>Veuillez-vous inscrire pour pouvoir créer un quizz</h1>
            <Button className='linkLogin' onClick={() => navigate("/login")}>Page de connexion !</Button>
        </div>
    </div>

)
};
