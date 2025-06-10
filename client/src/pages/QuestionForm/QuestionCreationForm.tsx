import { useState, useEffect} from 'react';
import Button from '@mui/material/Button';
import { Switch } from '@mui/material';
import { CreateQCMForm } from '../../component/CreateQuestion/CreateQcmForm';
import { CreateFreeForm } from '../../component/CreateQuestion/CreateFreeForm';
import { CreateDCCForm } from '../../component/CreateQuestion/CreateDccForm';
import {CreateVfForm} from '../../component/CreateQuestion/CreateVfForm'
import { Banner } from '../../component/Banner/Banner';
import { useContext } from "react";
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from "../../context/authentContext";
import Toast from '../../tools/toast/toast';
import "../CommonCss.css";
import "./QuestionForm.css"


export function QuestionCreationForm () {
    const location = useLocation();
    const _question = location.state?.question;
    const [mode , setMode] = useState(_question?.mode ||"QCM");
    const [title, setTitle] = useState(_question?.title || "");
    const [level,setLevel] = useState(_question?.level || 1);
    const [goodNews, setGoodNews] = useState(false);
    const [tags, setTags] = useState<string[]>(_question?.tags || []);
    const [isPrivate, setPrivate] = useState(_question?.private ||true);
    const [carre, setCarre] = useState(_question?.carre || _question?.choices || {ans1 : "", ans2 : "", ans3: "", ans4: ""});
    const [answers, setAnswers] = useState<string[]>(_question?.cash ||_question?.answers || []);
    const [truth, setTruth] = useState(_question?.truth);
    const auth = useContext(AuthContext);
    const user_id = auth?.user?.id || "0";
    const [freeData, setFreeData] = useState({user_id : user_id,mode : "FREE",title: title, tags: tags, private:isPrivate, answers: answers});
    const [dccData, setDccData] = useState({user_id : user_id,mode : "DCC",title: title, tags: tags, private: isPrivate, carre: carre, duo: _question?.duo ||2, answer: _question?.answer ||1, cash: answers});
    const [qcmData, setQcmData] = useState({user_id : user_id,mode : "QCM",title: title, tags: tags, private: isPrivate, choices: carre, answer: _question?.answer || 1});
    const [vfData, setVfData] = useState({user_id : user_id,mode : "VF",title: title, tags: tags, private: isPrivate, truth: truth});

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

    const endTask = () => {navigate(-1)};

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
        
    }, [title, tags, carre, isPrivate, answers, mode]);

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

    const renderContent = () => {
        switch (mode) {
            case "QCM":
                return <CreateQCMForm 
                question_id={0}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag} 
                carre={carre} setCarre={setCarre} 
                qcmData={qcmData} setQcmData={setQcmData} />;
            case "FREE":
                return <CreateFreeForm 
                question_id={0}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag} 
                answers={answers} setAnswers={setAnswers} addAnswer={addAnswer} removeAnswer={removeAnswer}
                freeData={freeData} setFreeData={setFreeData} />;
            case "DCC":
                return <CreateDCCForm 
                question_id={0}
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
                question_id={0}
                endTask={endTask}
                setMessageInfo={setMessageInfo} setShowMessage={setShowMessage}
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag} 
                truth={truth} setTruth={setTruth}
                vfData={vfData} setVfData={setVfData} />;
            default:
                return <CreateQCMForm 
                question_id={0}
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
                {_question ?  "" : <div className="modeSelector">
                    <h3>Créer une question avec un format</h3>
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
                <div className='privateswitch'>
                    <label className='questionCreation-label' onClick={() => setPrivate(false)}>Question public</label>
                    <Switch
                        type='checkboxe'
                        checked={dccData.private}
                        className='isPrivate'
                        onClick={() => changePrivate()}
                    />
                    <label className='questionCreation-label' onClick={() => setPrivate(true)}>Question privée</label>
                </div>
                <div>
                    {/* faire le selecteur de difficulty level ici */}

                </div>
                {renderContent()}
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
                <h1>Veuillez-vous inscrire pour pouvoir créer une question</h1>
                <Button className='linkLogin' onClick={() => navigate("/login")}>Page de connexion !</Button>
            </div>
        </>
        
    )
};

