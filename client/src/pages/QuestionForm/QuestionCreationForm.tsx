import { useState, useEffect} from 'react';
import Button from '@mui/material/Button';
import { MenuItem, Select } from '@mui/material';
import { CreateQCMForm } from '../../component/CreateQuestion/CreateQcmForm';
import { CreateFreeForm } from '../../component/CreateQuestion/CreateFreeForm';
import { CreateDCCForm } from '../../component/CreateQuestion/CreateDccForm';
import {CreateVfForm} from '../../component/CreateQuestion/CreateVfForm'
import { Banner } from '../../component/Banner/Banner';
import { useContext } from "react";
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { AuthContext } from "../../context/authentContext";
import Toast from '../../tools/toast/toast';
import "../CommonCss.css";
import "./QuestionForm.css"
import makeRequest from '../../tools/requestScheme';

const QUESTION_STATUS_LABELS: Record<string, string> = {
    private: "Privée",
    pending: "En attente de modération",
    approved: "Publique (validée)",
    rejected: "Refusée",
};

export function QuestionCreationForm () {
    const location = useLocation();
    const { question_id: questionIdParam } = useParams();
    // Ouverture directe (nouvel onglet, ctrl/cmd/molette-clic, lien partagé) :
    // pas de location.state dans ce cas, on résout la question depuis l'id de
    // l'URL plutôt que de se retrouver avec un formulaire de création vide.
    const [_question, setQuestionData] = useState<any>(location.state?.question);
    const [loadingQuestion, setLoadingQuestion] = useState(false);

    useEffect(() => {
        if (_question || !questionIdParam) return;
        setLoadingQuestion(true);
        makeRequest(`/question/by-ids?ids=${questionIdParam}`)
            .then((qs: any[]) => setQuestionData(qs?.[0]))
            .catch((e) => console.error("Erreur lors du chargement de la question", e))
            .finally(() => setLoadingQuestion(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [questionIdParam]);

    const questionId = _question?.question_id ||0;
    const [mode , setMode] = useState(_question?.mode ||"QCM");
    const [title, setTitle] = useState(_question?.title || "");
    const [level,setLevel] = useState(_question?.level || 1);
    const [goodNews, setGoodNews] = useState(false);
    const [tags, setTags] = useState<string[]>(_question?.tags || []);
    // Statut de modération (cf. ROADMAP.md, Phase 2) : jamais choisi ici, une
    // question démarre toujours "private" et ne devient publique qu'après
    // validation admin — cf. le bloc "Demander la publication" plus bas.
    const [status, setStatus] = useState<string>(_question?.status ?? "private");
    const [carre, setCarre] = useState(_question?.carre || _question?.choices || {ans1 : "", ans2 : "", ans3: "", ans4: ""});
    const [answers, setAnswers] = useState<string[]>(_question?.cash ||_question?.answers || []);
    const [truth, setTruth] = useState(_question?.truth);
    const auth = useContext(AuthContext);
    const user_id = auth?.user?.id || 0;

    // Les useState ci-dessus ne capturent `_question` qu'au premier rendu :
    // si elle arrive après coup (fetch async ci-dessus), il faut re-remplir
    // le formulaire explicitement une fois les données là.
    useEffect(() => {
        if (!_question) return;
        setMode(_question.mode || "QCM");
        setTitle(_question.title || "");
        setLevel(_question.level || 1);
        setTags(_question.tags || []);
        setStatus(_question.status ?? "private");
        setCarre(_question.carre || _question.choices || { ans1: "", ans2: "", ans3: "", ans4: "" });
        setAnswers(_question.cash || _question.answers || []);
        setTruth(_question.truth);
    }, [_question]);

    const [freeData, setFreeData] = useState({creator : user_id,mode : "FREE",title: title,level:level, tags: tags, answers: answers});
    const [dccData, setDccData] = useState({creator : user_id,mode : "DCC",title: title,level:level, tags: tags, carre: carre, duo: _question?.duo ||2, answer: _question?.answer ||1, cash: answers});
    const [qcmData, setQcmData] = useState({creator : user_id,mode : "QCM",title: title,level:level, tags: tags, choices: carre, answer: _question?.answer || 1});
    const [vfData, setVfData] = useState({creator : user_id,mode : "VF",title: title, level:level,tags: tags, truth: truth});

    const [messageInfo, setMessageInfo] = useState("");
    const [showMessage, setShowMessage] = useState(false);
    const navigate = useNavigate();
    //const socketRef = useRef(null);


    const addAnswer = (answer : string) => {
        if (!answers.includes(answer)) {
            setAnswers([...answers, answer]);
        }
    };

    const removeAnswer = (answerToRemove : string) => {
        setAnswers(answers.filter(answer => answer !== answerToRemove));  
    };
    const addTag = (tag : string) => {
        if (!tags.includes(tag) && tags.length < 5) {
            setTags([...tags, tag]);
        }
    };

    const duoContain = (nombre : number) =>{
        return (dccData.answer == nombre || dccData.duo == nombre);
    };
    
    const manageDuo = (nombre : number) => {
        if (dccData.answer !== nombre){
            setDccData({...dccData, duo:nombre})
        }
    };

    const removeTag = (tagToRemove : string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));  
    };

    const endTask = () => {navigate(-1)};

    const requestPublication = async () => {
        const response = await makeRequest(`/question/${_question.question_id}/request-publication`, "POST");
        if (response.success) {
            setStatus("pending");
        }
    };

    useEffect(() => {
        setQcmData(prev => ({
            ...prev,
            title: title,
            level:level,
            tags: tags,
            choices: carre,
        }));
        setFreeData(prev => ({
            ...prev,
            title: title,
            level:level,
            tags: tags,
            answers:answers,
        }));
        setDccData(prev => ({
            ...prev,
            title: title,
            level:level,
            tags: tags,
            carre: carre,
            cash:answers,
        }));
        setVfData(prev => ({
            ...prev,
            title: title,
            level:level,
            tags: tags,
        }));

    }, [title, tags, carre, answers, mode, level]);

    useEffect(() =>{
        if (dccData.duo==dccData.answer){
            if (dccData.answer == 1){
                setDccData(prev => ({
                    ...prev,
                    duo:2
                }));
            } else {
                setDccData(prev => ({
                    ...prev,
                    duo:1
                }));
            }
        }

    }, [dccData])

    useEffect(() => {
        setQcmData(prev => ({
            ...prev,
            creator: user_id
        }));
        setFreeData(prev => ({
            ...prev,
            creator: user_id
        }));
        setDccData(prev => ({
            ...prev,
            creator: user_id
        }));
        setVfData(prev => ({
            ...prev,
            creator: user_id
        }));
    }, [user_id])

    useEffect(() => {
        setVfData(prev => ({
            ...prev,
            truth:truth
        }));

    }, [truth]);

    const deleteQuestion = async () => {
        const confirmation = window.confirm("Êtes-vous sûr de vouloir supprimer définitivement la question ?");
        if (confirmation) {
            const response = await makeRequest("/question?question_id=" + _question.question_id, "DELETE");
            if (response.success){
                navigate(-1)
            }
        }
    } 

    const renderContent = () => {
        switch (mode) {
            case "QCM":
                return <CreateQCMForm
                question_id={questionId}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                tags={tags} addTag={addTag} removeTag={removeTag}
                carre={carre} setCarre={setCarre}
                qcmData={qcmData} setQcmData={setQcmData} />;
            case "FREE":
                return <CreateFreeForm
                question_id={questionId}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                tags={tags} addTag={addTag} removeTag={removeTag}
                answers={answers} addAnswer={addAnswer} removeAnswer={removeAnswer}
                freeData={freeData} />;
            case "DCC":
                return <CreateDCCForm
                question_id={questionId}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                tags={tags} addTag={addTag} removeTag={removeTag}
                answers={answers} addAnswer={addAnswer} removeAnswer={removeAnswer}
                carre={carre} setCarre={setCarre}
                duoContain={duoContain} manageDuo={manageDuo}
                dccData={dccData} setDccData={setDccData} />;
            case "VF":
                return <CreateVfForm
                question_id={questionId}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                tags={tags} addTag={addTag} removeTag={removeTag}
                truth={truth} setTruth={setTruth}
                vfData={vfData} />;
            default:
                return <CreateQCMForm
                question_id={questionId}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                tags={tags} addTag={addTag} removeTag={removeTag}
                carre={carre} setCarre={setCarre}
                qcmData={qcmData} setQcmData={setQcmData} />;
          }
    };


    if (questionIdParam && !_question) {
        return (
            <>
                <Banner></Banner>
                <div className="questionCreationPage">
                    <div className="questionCreationContent">
                        <h1>{loadingQuestion ? "Chargement de la question…" : "Cette question n'existe pas ou n'est pas accessible."}</h1>
                    </div>
                </div>
            </>
        );
    }

    return (
        (auth && auth.user) ?
            <>
            <Banner></Banner>
            <div className="questionCreationPage">
            <div className="questionCreationContent">
                <h1>{_question ? "Modifier la question" : "Créer une question"}</h1>
                <section className="questionSection">
                {_question ?  "" : <div className="modeSelector">
                    <h3>Créer une question avec un format</h3>
                    <div className="modeSelectorButtons">
                    <Button
                    className = {(mode == "QCM")?"first notOutlined selectedMode":"first notOutlined notSelectedMode"}
                    onClick={() => setMode("QCM")}>
                    QCM
                    </Button>

                    <Button
                    className = {(mode == "FREE")?"notOutlined selectedMode":"notOutlined notSelectedMode"}
                    onClick={() => setMode("FREE")}>
                    réponse libre
                    </Button>

                    <Button
                    className = {(mode == "DCC")?"notOutlined selectedMode":"notOutlined notSelectedMode"}
                    onClick={() => setMode("DCC")}>
                    Duo/Carré/Cash
                    </Button>
                    <Button
                    className = {(mode == "VF")?"last notOutlined selectedMode":"last notOutlined notSelectedMode"}
                    onClick={() => setMode("VF")}>
                    Vrai ou Faux
                    </Button>
                    </div>
                </div>}
                <div className='title'>
                    <label className='questionCreation-label'>Intitulé de la question</label>
                    <input
                        type='text'
                        id="title"
                        className='titre'
                        value={title || ''}
                        onChange={(e) => setTitle(e.target.value )}
                        required
                    />
                </div>
                {_question && (
                    <div className='questionStatusRow'>
                        <span className={`questionStatusBadge status-${status}`}>{QUESTION_STATUS_LABELS[status] ?? status}</span>
                        {status === "rejected" && _question.rejectionReason && (
                            <p className='questionRejectionReason'>Motif du refus : {_question.rejectionReason}</p>
                        )}
                        {(status === "private" || status === "rejected") && (
                            <Button className='Button' onClick={() => requestPublication()}>Demander la publication</Button>
                        )}
                    </div>
                )}
                <div className="levelSelectRow">
                    <label className="questionCreation-label" id="difficulty-level-label">Difficulté</label>
                    <Select
                        id="select-quizz"
                        labelId="difficulty-level-label"
                        value={level}
                        size="small"
                        onChange={(e) => setLevel(e.target.value)}
                    >

                        <MenuItem key={1} value={1} style={{ color: 'green'}}>
                        1
                        </MenuItem>
                        <MenuItem key={2} value={2} style={{ color: 'green' }}>
                        2
                        </MenuItem>
                        <MenuItem key={3} value={3} style={{ color: 'green' }}>
                        3
                        </MenuItem>
                        <MenuItem key={4} value={4} style={{ color: 'orange' }}>
                        4
                        </MenuItem>
                        <MenuItem key={5} value={5} style={{ color: 'orange' }}>
                        5
                        </MenuItem>
                        <MenuItem key={6} value={6} style={{ color: 'orange' }}>
                        6
                        </MenuItem>
                        <MenuItem key={7} value={7} style={{ color: 'orange' }}>
                        7
                        </MenuItem>
                        <MenuItem key={8} value={8} style={{ color: 'red' }}>
                        8
                        </MenuItem>
                        <MenuItem key={9} value={9} style={{ color: 'red' }}>
                        9
                        </MenuItem>
                        <MenuItem key={10} value={10} style={{ color: 'red' }}>
                        10
                        </MenuItem>


                    </Select>

                </div>
                </section>
                {renderContent()}
                {_question ? <div className='questionDeleteRow'>
                    <Button className="Button" onClick={() => deleteQuestion()}> supprimer la question</Button>
                </div> : ""}
                <div className={goodNews ? 'GreenText' : 'RedText'}>{
                    showMessage &&
                    <Toast message={messageInfo} onClose={()=>{setShowMessage(false); setGoodNews(false)}} />}
                </div>

            </div>
            </div>

            </>
        : <div className="questionCreationPage">
            <Banner></Banner>
            <div className='PleaseLogin'>
                <h1>Veuillez-vous inscrire pour pouvoir créer une question</h1>
                <Button className='linkLogin' onClick={() => navigate("/login")}>Page de connexion !</Button>
            </div>
        </div>
        
    )
};

