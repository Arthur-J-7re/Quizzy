import { useState, useEffect} from 'react';
import Button from '@mui/material/Button';
import { useSocket } from '../context/socketContext';
import { CreateQCMForm } from '../component/CreateQcmForm';
import { CreateFreeForm } from '../component/CreateFreeForm';
import { CreateDCCForm } from '../component/CreateDccForm';
import { private_createTypography } from '@mui/material';

export function QuestionCreationForm () {
    const [mode , setMode] = useState("QCM");
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState<string[]>([]);
    const [isPrivate, setPrivate] = useState(true);
    const [carre, setCarre] = useState({ans1 : "", ans2 : "", ans3: "", ans4: ""});
    const [answers, setAnswers] = useState<string[]>([]);

    const [freeData, setFreeData] = useState({title: title, tags: tags,private:isPrivate, answers: answers});
    const [dccData, setDccData] = useState({title: title, tags: tags,private: isPrivate ,carre: carre, duo:2, answer:1, cash:answers});
    const [qcmData, setQcmData] = useState({title: title,tags: tags,private: isPrivate, choices: carre, answer:1});
    //const socketRef = useRef(null);
    const socket = useSocket();
    useEffect(() => {
        
        
        // Nettoyage : Déconnexion du socket lors du démontage du composant
        
    }, [socket]);
    
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
        setQcmData(prev => ({
            ...prev,
            title: title,
            tags: tags,
            choices: carre,
            answers:answers,
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

    const renderContent = () => {
        switch (mode) {
            case "QCM":
                return <CreateQCMForm 
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag} 
                carre={carre} setCarre={setCarre} 
                qcmData={qcmData} setQcmData={setQcmData} socket={socket}/>;
            case "FREE":
                return <CreateFreeForm 
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag} 
                answers={answers} setAnswers={setAnswers} addAnswer={addAnswer} removeAnswer={removeAnswer}
                freeData={freeData} setFreeData={setFreeData} socket={socket}/>;
            case "DCC":
                return <CreateDCCForm 
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag}
                answers={answers} setAnswers={setAnswers} addAnswer={addAnswer} removeAnswer={removeAnswer} 
                carre={carre} setCarre={setCarre} 
                duoContain={duoContain} manageDuo={manageDuo} resetDuo={resetDuo}
                dccData={dccData} setDccData={setDccData} socket={socket}/>;
            default:
                return <CreateQCMForm 
                title={title} setTitle={setTitle} 
                isPrivate = {isPrivate} setPrivate={setPrivate} changePrivate={changePrivate}
                tags={tags} setTags={setTags} addTag={addTag} removeTag={removeTag}
                carre={carre} setCarre={setCarre} 
                qcmData={qcmData} setQcmData={setQcmData} socket={socket}/>;
          }
    };


    return (
        <div className="Maincontainer">
            <div className="modeSelector">
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
            </div>
            {renderContent()}
            
            
        </div>

        
    )
};

