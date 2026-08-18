import { useCallback, useContext, useEffect, useState } from "react";
import { Button } from "@mui/material";
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
import "./AdminBacklog.css";

const PAGE_SIZE = 40;

/** Backlog de modération (cf. ROADMAP.md, Phase 2) : réservé aux admins, la route serveur (requireRole) fait foi. */
export function QuestionBacklog() {
    const auth = useContext(AuthContext);

    const [questions, setQuestions] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<any | null>(null);

    const [title, setTitle] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [carre, setCarre] = useState({ ans1: "", ans2: "", ans3: "", ans4: "" });
    const [answer, setAnswer] = useState(1);
    const [answers, setAnswers] = useState<string[]>([]);
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState("");
    const [message, setMessage] = useState("");

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
        setTags(question.tags ?? []);
        setCarre(question.carre ?? question.choices ?? { ans1: "", ans2: "", ans3: "", ans4: "" });
        setAnswer(question.answer ?? 1);
        setAnswers(question.cash ?? question.answers ?? []);
        setRejecting(false);
        setReason("");
        setMessage("");
    };

    const addTag = (tag: string) => { if (!tags.includes(tag) && tags.length < 5) setTags([...tags, tag]); };
    const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));
    const addAnswer = (a: string) => { if (!answers.includes(a)) setAnswers([...answers, a]); };
    const removeAnswer = (a: string) => setAnswers(answers.filter((x) => x !== a));

    const settleReview = (question_id: number) => {
        setQuestions((prev) => prev.filter((q) => q.question_id !== question_id));
        setTotal((t) => Math.max(0, t - 1));
        setSelected(null);
    };

    const approve = async () => {
        if (!selected) return;
        const edits: Record<string, unknown> = { title, tags };
        if (selected.mode === "QCM") { edits.choices = carre; edits.answer = answer; }
        if (selected.mode === "DCC") { edits.carre = carre; edits.answer = answer; edits.cash = answers; }
        if (selected.mode === "FREE") { edits.answers = answers; }

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

    const questionCards = questions.map((q) => new QuestionCard(q, () => selectQuestion(q), Number(auth?.user?.id)));

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <h1>Backlog de modération ({total})</h1>
                <div className="adminBacklogLayout">
                    <div className="adminBacklogList">
                        <CardArea title="" cards={questionCards} emptyText="Aucune question en attente" link="" draggable={false} setUsedCard={() => {}} />
                        {questions.length < total && (
                            <Button className="Button" disabled={loading} onClick={() => fetchBacklog(questions.length)}>
                                {loading ? "Chargement…" : "Charger plus"}
                            </Button>
                        )}
                    </div>

                    {selected && (
                        <div className="adminBacklogReview">
                            <h2>Revue de la question</h2>
                            <div className="title">
                                <label className="questionCreation-label">Intitulé</label>
                                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>

                            {(selected.mode === "QCM" || selected.mode === "DCC") && (
                                <div className="carre">
                                    <QcmChoiceGrid carre={carre} setCarre={setCarre} selectedAnswer={answer} onSelectAnswer={setAnswer} />
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
                            {selected.mode === "VF" && <p>Vrai/Faux : {selected.truth ? "Vrai" : "Faux"}</p>}

                            <TagEditor tags={tags} addTag={addTag} removeTag={removeTag} />

                            {message && <p className="questionRejectionReason">{message}</p>}

                            <div className="adminBacklogActions">
                                <Button className="Button" onClick={() => approve()}>Approuver</Button>
                                <Button className="Button" onClick={() => setRejecting((v) => !v)}>Refuser</Button>
                            </div>
                            {rejecting && (
                                <div className="adminBacklogRejectRow">
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
                    )}
                </div>
            </div>
        </div>
    );
}

export default QuestionBacklog;
