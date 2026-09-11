import { useCallback, useContext, useEffect, useState } from "react";
import { Button, Select, MenuItem } from "@mui/material";
import { Banner } from "../../component/Banner/Banner";
import { AuthContext } from "../../context/authentContext";
import { CardArea } from "../../component/Card/CardArea/CardArea";
import QuestionCard from "../../component/Card/EntityCard/QuestionCard";
import TagEditor from "../../component/CreateQuestion/TagEditor";
import AnswerListEditor from "../../component/CreateQuestion/AnswerListEditor";
import QcmChoiceGrid from "../../component/CreateQuestion/QcmChoiceGrid";
import makeRequest from "../../tools/requestScheme";
import "../CommonCss.css";
import "../Profil/profil.css";
import "../../component/Card/Card.css";
import "../Library/Library.css";
import "../QuestionForm/QuestionForm.css";
// .tagList/.tag/.carre/.answerQcm/.title (TagEditor, QcmChoiceGrid,
// AnswerListEditor) sont définis ici, pas dans QuestionForm.css : sans cet
// import, cette page dépendait de facto d'une autre page (la création de
// question) ayant déjà chargé cette feuille de style avant elle dans la
// même session SPA — d'où un rendu non centré quand ce n'était pas le cas.
import "../../component/CreateQuestion/CreateQuestionCss.css";
import "./AdminBacklog.css";

const PAGE_SIZE = 40;

/** Motifs fréquents en un clic : remplissent le champ, toujours modifiable/complétable à la main ensuite. */
const CANNED_REASONS = [
    "Faute d'orthographe ou de formulation",
    "Réponse incorrecte ou ambiguë",
    "Doublon d'une question déjà existante",
    "Contenu inapproprié",
    "Hors-sujet par rapport aux tags",
];

/** Backlog de modération (cf. ROADMAP.md, Phase 2) : réservé aux admins, la route serveur (requireRole) fait foi. */
export function QuestionBacklog() {
    const auth = useContext(AuthContext);
    const myId = Number(auth?.user?.id);

    const [questions, setQuestions] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<any | null>(null);

    const [title, setTitle] = useState("");
    const [level, setLevel] = useState<number>(1);
    const [tags, setTags] = useState<string[]>([]);
    const [carre, setCarre] = useState({ ans1: "", ans2: "", ans3: "", ans4: "" });
    const [answer, setAnswer] = useState(1);
    const [duo, setDuo] = useState(2);
    const [truth, setTruth] = useState(true);
    const [answers, setAnswers] = useState<string[]>([]);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState("");
    const [message, setMessage] = useState("");
    const [claiming, setClaiming] = useState(false);

    const fetchBacklog = useCallback(async (skip: number) => {
        setLoading(true);
        try {
            const { items, total } = await makeRequest(`/admin/questions/backlog?skip=${skip}&limit=${PAGE_SIZE}`);
            setQuestions((prev) => (skip === 0 ? items : [...prev, ...items]));
            setTotal(total);
        } catch (e) {
            console.error("Erreur lors du chargement du backlog", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBacklog(0); }, [fetchBacklog]);

    const selectQuestion = (question: any) => {
        setSelected(question);
        setTitle(question.title);
        setLevel(question.level ?? 1);
        setTags(question.tags ?? []);
        setCarre(question.carre ?? question.choices ?? { ans1: "", ans2: "", ans3: "", ans4: "" });
        setAnswer(question.answer ?? 1);
        setDuo(question.duo ?? (question.answer === 1 ? 2 : 1));
        setTruth(question.truth ?? true);
        setAnswers(question.cash ?? question.answers ?? []);
        setRejecting(false);
        setReason("");
        setMessage("");
    };

    const addTag = (tag: string) => { if (!tags.includes(tag) && tags.length < 5) setTags([...tags, tag]); };
    const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));
    const addAnswer = (a: string) => { if (!answers.includes(a)) setAnswers([...answers, a]); };
    const removeAnswer = (a: string) => setAnswers(answers.filter((x) => x !== a));

    /** Coche affichée à la fois sur la bonne réponse et sur son duo (cf. CreateDccForm). */
    const duoContain = (n: number) => answer === n || duo === n;
    const manageDuo = (n: number) => { if (answer !== n) setDuo(n); };
    const selectDccAnswer = (n: number) => {
        setAnswer(n);
        // Le duo ne peut pas être la même proposition que la bonne réponse : on
        // le décale sur le premier autre choix disponible (cf. CreateQuestionForm).
        if (duo === n) setDuo(n === 1 ? 2 : 1);
    };

    const settleReview = (question_id: number) => {
        setQuestions((prev) => prev.filter((q) => q.question_id !== question_id));
        setTotal((t) => Math.max(0, t - 1));
        setSelected(null);
    };

    /** Reflète l'état de review dans la liste (badge "en review par...") sans refetch. */
    const applyReviewState = (question_id: number, patch: { reviewingBy?: number; reviewingByUsername?: string }) => {
        setQuestions((prev) => prev.map((q) => (q.question_id === question_id ? { ...q, ...patch } : q)));
        setSelected((prev: any) => (prev && prev.question_id === question_id ? { ...prev, ...patch } : prev));
    };

    const claimReview = async () => {
        if (!selected) return;
        setClaiming(true);
        try {
            await makeRequest(`/admin/questions/${selected.question_id}/claim`, "PUT");
            applyReviewState(selected.question_id, { reviewingBy: myId, reviewingByUsername: auth?.user?.Username });
            setMessage("");
        } catch (e: any) {
            setMessage(e?.message ?? "Impossible de prendre cette question en review.");
        } finally {
            setClaiming(false);
        }
    };

    const releaseReview = async () => {
        if (!selected) return;
        await makeRequest(`/admin/questions/${selected.question_id}/release`, "PUT");
        applyReviewState(selected.question_id, { reviewingBy: undefined, reviewingByUsername: undefined });
    };

    const approve = async () => {
        if (!selected) return;
        const edits: Record<string, unknown> = { title, level, tags };
        if (selected.mode === "QCM") { edits.choices = carre; edits.answer = answer; }
        if (selected.mode === "DCC") { edits.carre = carre; edits.answer = answer; edits.duo = duo; edits.cash = answers; }
        if (selected.mode === "FREE") { edits.answers = answers; }
        if (selected.mode === "VF") { edits.truth = truth; }

        const response = await makeRequest(`/admin/questions/${selected.question_id}/approve`, "PUT", edits);
        if (response.success) {
            settleReview(selected.question_id);
        } else {
            setMessage("L'approbation a échoué.");
        }
    };

    const reject = async () => {
        if (!selected) return;
        if (!reason.trim()) {
            setMessage("Un motif de refus est requis.");
            return;
        }
        const response = await makeRequest(`/admin/questions/${selected.question_id}/reject`, "PUT", { reason });
        if (response.success) {
            settleReview(selected.question_id);
        } else {
            setMessage("Le refus a échoué.");
        }
    };

    const questionCards = questions.map((q) => new QuestionCard(q, () => selectQuestion(q), myId));

    const reviewedByMe = selected?.reviewingBy === myId;
    const reviewedByOther = selected?.reviewingBy != null && !reviewedByMe;

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <h1>Backlog de modération ({total})</h1>
                <div className="adminBacklogList">
                    <CardArea title="" cards={questionCards} emptyText="Aucune question en attente" link="" draggable={false} setUsedCard={() => {}} />
                    {questions.length < total && (
                        <Button className="Button" disabled={loading} onClick={() => fetchBacklog(questions.length)}>
                            {loading ? "Chargement…" : "Charger plus"}
                        </Button>
                    )}
                </div>
            </div>

            {selected && (
                <div className="adminBacklogModalBackdrop" onClick={() => setSelected(null)}>
                    <div className="adminBacklogModal" onClick={(e) => e.stopPropagation()}>
                        <button className="adminBacklogModalClose" onClick={() => setSelected(null)} aria-label="Fermer">×</button>
                        <h2>Revue de la question</h2>

                        <div className="adminBacklogReviewBanner">
                            {reviewedByMe && (
                                <>
                                    <span className="adminBacklogReviewTag mine">Vous êtes en train de reviewer cette question</span>
                                    <Button size="small" onClick={() => releaseReview()}>Relâcher</Button>
                                </>
                            )}
                            {reviewedByOther && (
                                <span className="adminBacklogReviewTag other">
                                    En review par {selected.reviewingByUsername ?? "un autre admin"}
                                </span>
                            )}
                            {!selected.reviewingBy && (
                                <Button size="small" onClick={() => claimReview()} disabled={claiming}>
                                    {claiming ? "…" : "Prendre en review"}
                                </Button>
                            )}
                        </div>

                        <div className="title">
                            <label className="questionCreation-label">Intitulé</label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>

                        <div className="levelSelectRow">
                            <label className="questionCreation-label" id="backlog-difficulty-label">Difficulté</label>
                            <Select
                                labelId="backlog-difficulty-label"
                                value={level}
                                size="small"
                                onChange={(e) => setLevel(Number(e.target.value))}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                                    <MenuItem key={n} value={n} style={{ color: n <= 3 ? "green" : n <= 7 ? "orange" : "red" }}>
                                        {n}
                                    </MenuItem>
                                ))}
                            </Select>
                        </div>

                        {(selected.mode === "QCM" || selected.mode === "DCC") && (
                            <div className="carre">
                                {selected.mode === "DCC" && (
                                    <h3 className="questionCreationIndication">
                                        Cochez la bonne réponse (à gauche) et la réponse complétant le duo (à droite)
                                    </h3>
                                )}
                                <QcmChoiceGrid
                                    carre={carre}
                                    setCarre={setCarre}
                                    selectedAnswer={answer}
                                    onSelectAnswer={selected.mode === "DCC" ? selectDccAnswer : setAnswer}
                                    renderExtra={selected.mode === "DCC" ? (n) => (
                                        <input
                                            type="checkbox"
                                            checked={duoContain(n)}
                                            className="coloredAnswer duoCheckbox"
                                            readOnly
                                            onClick={(e) => { e.stopPropagation(); manageDuo(n); }}
                                        />
                                    ) : undefined}
                                />
                            </div>
                        )}
                        {(selected.mode === "FREE" || selected.mode === "DCC") && (
                            <AnswerListEditor
                                answers={answers}
                                addAnswer={addAnswer}
                                removeAnswer={removeAnswer}
                                placeholder={selected.mode === "DCC" ? "Ajouter une réponse Cash" : "Ajouter une réponse"}
                            />
                        )}
                        {selected.mode === "VF" && (
                            <div className="VraiFaux">
                                <Button onClick={() => setTruth(true)} className={truth ? "VFButtonchecked" : "VFButton"}>Vrai</Button>
                                <Button onClick={() => setTruth(false)} className={truth ? "VFButton" : "VFButtonchecked"}>Faux</Button>
                            </div>
                        )}

                        <TagEditor tags={tags} addTag={addTag} removeTag={removeTag} />

                        {message && <p className="questionRejectionReason">{message}</p>}

                        <div className="adminBacklogActions">
                            <Button className="Button" onClick={() => approve()}>Approuver</Button>
                            <Button className="Button" onClick={() => setRejecting((v) => !v)}>Refuser</Button>
                        </div>
                        {rejecting && (
                            <div className="adminBacklogRejectRow">
                                <div className="adminBacklogCannedReasons">
                                    {CANNED_REASONS.map((canned) => (
                                        <button
                                            key={canned}
                                            type="button"
                                            className="adminBacklogCannedReason"
                                            onClick={() => setReason(canned)}
                                        >
                                            {canned}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="Motif du refus"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                                <Button className="Button" onClick={() => reject()}>Confirmer le refus</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default QuestionBacklog;
