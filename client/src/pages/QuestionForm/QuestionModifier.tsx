import { useState, useEffect} from 'react';
import Button from '@mui/material/Button';
import { useSocket } from '../../context/socketContext';
import { CreateQCMForm } from '../../component/CreateQuestion/CreateQcmForm';
import { CreateFreeForm } from '../../component/CreateQuestion/CreateFreeForm';
import { CreateDCCForm } from '../../component/CreateQuestion/CreateDccForm';
import {CreateVfForm} from '../../component/CreateQuestion/CreateVfForm'
import { Banner } from '../../component/Banner/Banner';
import { Socket } from 'socket.io-client';
import { useContext } from "react";
import { useNavigate } from 'react-router-dom';
import { AuthContext } from "../../context/authentContext";
import Toast from '../../tools/toast/toast';
import { useLocation } from 'react-router-dom';
import "../CommonCss.css";
import makeRequest from '../../tools/requestScheme';

export function QuestionModifier () {
    const location = useLocation();
    const question = location.state?.question || {title : "", private : false, tags : [], mode : "QCM"};
    console.log(question);

    const [mode , _setMode] = useState(question.mode || "QCM");
    const [title, setTitle] = useState(question.title || "");
    const [goodNews, setGoodNews] = useState(false);
    const [tags, setTags] = useState<string[]>(question.tags || []);
    const [isPrivate, setPrivate] = useState(question.private || true);
    const [carre, setCarre] = useState({ans1 : "", ans2 : "", ans3: "", ans4: ""});

    
    
    
    const [answers, setAnswers] = useState<string[]>(question.answers || []);
    const [truth, setTruth] = useState(question.truth || true);
    const auth = useContext(AuthContext);
    const user_id = auth?.user?.id || "0";
    const [freeData, setFreeData] = useState({user_id : user_id,mode : mode,title: title, tags: tags, private:isPrivate, answers: answers});
    const [dccData, setDccData] = useState({user_id : user_id,mode : mode,title: title, tags: tags, private: isPrivate, carre: carre, duo: question.duo || 2, answer:question.answer || 1, cash: answers});
    const [qcmData, setQcmData] = useState({user_id : user_id,mode : mode,title: title, tags: tags, private: isPrivate, choices: carre, answer:question.answer|| 1});
    const [vfData, setVfData] = useState({user_id : user_id,mode : mode,title: title, tags: tags, private: isPrivate, truth: truth});
    
    const [messageInfo, setMessageInfo] = useState("");
    const [showMessage, setShowMessage] = useState(false);
    const navigate = useNavigate();
    //const socketRef = useRef(null);
    const socket = useSocket();
    useEffect(() => {
        if (location.pathname === "/modify-a-question" && question.title === ""){
            navigate("/create-a-question");
        }
        if (question.choices != null){
            setCarre(question.choices);
        } else if (question.carre != null){
            setCarre(question.carre);
        }

        if (question.answers != null){
            setAnswers(question.answers);
        } else if (question.cash != null){
            setAnswers(question.cash);
        }
    }, [question]); // Exécute cet effet uniquement quand `question` change
    useEffect(() => {
        if (socket instanceof Socket){
            socket.on("modified", ()=> {
                navigate("/profil");
            });
        }
        // Nettoyage : Déconnexion du socket lors du démontage du composant
        
    }, [socket]);

    const endTask = () => {navigate(-1)}
    
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

    const resetDuo = (nombre : number) => {
        if (dccData.duo == nombre){
            if (nombre == 1){
                setDccData({...dccData, duo : 2});
            } else {
                setDccData({...dccData, duo : 1});
            }
        }
    }
    
    const removeTag = (tagToRemove : string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));  
    };

    const changePrivate = () =>{
        setPrivate(!isPrivate);
    };


    useEffect(() => {
        setQcmData(prev => ({
            ...prev,
            title: title,
            tags: tags,
            choices: carre,
            private: isPrivate
        }));
        setFreeData(prev => ({
            ...prev,
            title: title,
            tags: tags,
            answers:answers,
            private: isPrivate
        }));
        setDccData(prev => ({
            ...prev,
            title: title,
            tags: tags,
            carre: carre,
            cash:answers,
            private: isPrivate
        }));
        setVfData(prev => ({
            ...prev,
            title: title,
            tags: tags,
            private: isPrivate
        }));
        
    }, [title, tags, carre, isPrivate, answers]);

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
            user_id: user_id
        }));
        setFreeData(prev => ({
            ...prev,
            user_id: user_id
        }));
        setDccData(prev => ({
            ...prev,
            user_id: user_id
        }));
        setVfData(prev => ({
            ...prev,
            user_id: user_id
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
            const response = await makeRequest("/question?question_id=" + question.question_id, "DELETE");
            if (response.success){
                navigate("/profil")
            }
        }
    } 

    const renderContent = () => {
        switch (mode) {
            case "QCM":
                return <CreateQCMForm 
                question_id={question.question_id}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag} 
                carre={carre} setCarre={setCarre} 
                qcmData={qcmData} setQcmData={setQcmData} />;
            case "Free":
                return <CreateFreeForm 
                question_id={question.question_id}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag} 
                answers={answers} setAnswers={setAnswers} addAnswer={addAnswer} removeAnswer={removeAnswer}
                freeData={freeData} setFreeData={setFreeData} />;
            case "DCC":
                return <CreateDCCForm 
                question_id={question.question_id}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag}
                answers={answers} setAnswers={setAnswers} addAnswer={addAnswer} removeAnswer={removeAnswer} 
                carre={carre} setCarre={setCarre} 
                duoContain={duoContain} manageDuo={manageDuo} resetDuo={resetDuo}
                dccData={dccData} setDccData={setDccData} />;
            case "VF":
                return <CreateVfForm
                question_id={question.question_id}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag} 
                truth={truth} setTruth={setTruth}
                vfData={vfData} setVfData={setVfData} />;
            default:
                return <CreateQCMForm 
                question_id={question.question_id}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag}
                carre={carre} setCarre={setCarre} 
                qcmData={qcmData} setQcmData={setQcmData} />;
          }
    };


    return (
        (auth && auth.user) ? 
            <>
            <Banner></Banner>
            <div className="Maincontainer">
                <div>
                {/*<div className="modeSelector">
                    <h3>Créer une question avec un format</h3>
                    <Button 
                    className = {(mode == "QCM")?"selectedMode":"notSelectedMode"}
                    onClick={() => setMode("QCM")}>
                    QCM
                    </Button>
                    
                    <Button 
                    className = {(mode == "FREE")?"selectedMode":"notSelectedMode"}
                    onClick={() => setMode("FREE")}>
                    réponse libre
                    </Button>
                    
                    <Button 
                    className = {(mode == "DCC")?"selectedMode":"notSelectedMode"}
                    onClick={() => setMode("DCC")}>
                    Duo/Carré/Cash
                    </Button>
                    <Button 
                    className = {(mode == "VF")?"selectedMode":"notSelectedMode"}
                    onClick={() => setMode("VF")}>
                    Vrai ou Faux
                    </Button>
                </div>*/}
                {renderContent()}
                </div>
                <div className='modeSelector'>
                    <Button onClick={() => deleteQuestion()}> supprimer la question</Button>
                </div>
                <div className={goodNews ? 'GreenText' : 'RedText'}>{
                    showMessage &&
                    <Toast message={messageInfo} onClose={()=>{setShowMessage(false); setGoodNews(false)}} />}
                </div>
                
            </div>
            
            </>
        : <>
            <Banner></Banner>
            <div className='PleaseLogin'>
                <h1>Veuillez-vous inscrire pour pouvoir modifier une question</h1>
                <Button className='linkLogin' onClick={() => navigate("/login")}>Page de connection !</Button>
            </div>
        </>
        
    )
};

