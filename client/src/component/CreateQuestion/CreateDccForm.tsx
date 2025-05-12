import React from 'react';
import Button from '@mui/material/Button';
import { Switch } from '@mui/material';
import "./CreateQuestionCss.css"
import makeRequest from '../../tools/requestScheme';

interface CreatefreeFormProps {
    question_id : number;
    endTask : () => void;
    setMessageInfo : (message : string) => void;
    setShowMessage : (bool : boolean) => void;
    title: string;
    setTitle: React.Dispatch<React.SetStateAction<string>>;
    isPrivate : boolean;
    setPrivate: React.Dispatch<React.SetStateAction<boolean>>;
    changePrivate: () => void;
    tags: string[];
    setTags: React.Dispatch<React.SetStateAction<string[]>>;
    addTag: (tag: string) => void;
    removeTag: (tag: string) => void;
    answers: string[];
    setAnswers: React.Dispatch<React.SetStateAction<string[]>>
    addAnswer: (answer: string) => void;
    removeAnswer: (answer: string) => void;
    carre: { ans1: string; ans2: string; ans3: string; ans4: string };
    setCarre: React.Dispatch<React.SetStateAction<{ ans1: string; ans2: string; ans3: string; ans4: string }>>;
    duoContain: (nombre: number) => boolean;
    manageDuo: (nombre: number) => void; 
    resetDuo: (nombre : number) => void;   
    dccData:{user_id: string; mode : string;title: string; tags: string[];private: boolean; carre: { ans1: string; ans2: string; ans3: string; ans4: string };duo: number, answer: number; cash : string[] };
    setDccData: React.Dispatch<React.SetStateAction<CreatefreeFormProps["dccData"]>>;
  }

export function CreateDCCForm({
    question_id,
    endTask,
    setMessageInfo,
    setShowMessage,
    title,
    setTitle,
    setPrivate,
    changePrivate,
    tags,
    addTag,
    removeTag,
    answers,
    addAnswer,
    removeAnswer,
    carre,
    setCarre,
    duoContain,
    manageDuo,
    dccData,
    setDccData,
  }: CreatefreeFormProps)   {
    
    const validateDcc = () => {
        if (!dccData.title.trim()) {
            setMessageInfo("Il faut un intitulé à la question !");
            setShowMessage(true);
            return false;
        }

        if (answers.length === 0) {
            setMessageInfo("Il faut au moins une réponse !");
            setShowMessage(true);
            return false;
        }

        if (tags.length === 0) {
            setMessageInfo("veuillez renseigner au moins une catégorie pour la question.");
            setShowMessage(true);
            return false;
        }
    
        if (dccData.cash.some(answer => answer.trim() === "")) {
            setMessageInfo("Toutes les réponses Cash doivent être remplies !");
            setShowMessage(true);
            return false;
        }

        if (!dccData.carre.ans1.trim() || 
            !dccData.carre.ans2.trim() || 
            !dccData.carre.ans3.trim() || 
            !dccData.carre.ans4.trim()) {
            setMessageInfo("Toutes les réponses Carre doivent être remplies !");
            setShowMessage(true);
            return false;
        }
        return true;
    }
 
    const sendDcc = async () => {
        if (validateDcc()){
            if (question_id === 0){
                const response = await makeRequest("/question/create", "POST", dccData);
                if (response.success){
                    endTask();
                };

            } else {
                const response = await  makeRequest("/question/update", "PUT", {data : dccData, question_id : question_id});
                if (response.success){
                    endTask();
                };

            }
        }
    };

    return (
    <div className='formContainer'>
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
        <div className='carre'>
            <h3 className='questionCreationIndication'>Complétez les différentes propositions et cochez la bonne réponse (à gauche) <br/>
                et la réponse complétant le duo (à droite) </h3>
            <div className='answerQcm'>
                <div className='headerAns'>
                    <input 
                        type='checkbox' 
                        checked={dccData.answer == 1}
                        className='coloredAnswer'
                        onClick={() => {setDccData({...dccData, answer:1})}}
                    ></input>
                    <label className='questionCreation-label'>Réponse 1</label>
                    <input 
                        type='checkbox' 
                        checked={duoContain(1)}
                        className='coloredAnswer'
                        onClick={() => manageDuo(1)}
                    ></input>
                </div>
                <input
                    type='text'
                    id="answer1"
                    value={carre.ans1 || ''}
                    onChange={(e) => setCarre({...carre, ans1: e.target.value })}
                    required
                />
            </div>
            <div className='answerQcm'>
                <div className='headerAns'>
                    <input 
                        type='checkbox' 
                        checked={dccData.answer == 2}
                        className='coloredAnswer'
                        onClick={() => {setDccData({...dccData, answer:2})}}
                    ></input>
                    <label className='questionCreation-label'>Réponse 2</label>
                    <input 
                    type='checkbox' 
                    checked={duoContain(2)}
                    className='coloredAnswer'
                    onClick={() => manageDuo(2)}
                    ></input>
                </div>
                <input
                    type='text'
                    id="answer2"
                    value={carre.ans2 || ''}
                    onChange={(e) => setCarre({...carre, ans2: e.target.value })}
                    required
                />
            </div>
            <div className='answerQcm'>
                <div className='headerAns'>
                    <input 
                        type='checkbox' 
                        checked={dccData.answer == 3}
                        className='coloredAnswer'
                        onClick={() => {setDccData({...dccData, answer:3})}}
                    ></input>
                    <label className='questionCreation-label'>Réponse 3</label>
                    <input 
                    type='checkbox' 
                    checked={duoContain(3)}
                    className='coloredAnswer'
                    onClick={() => manageDuo(3)}
                    ></input>
                </div>
                <input
                    type='text'
                    id="answer3"
                    value={carre.ans3 || ''}
                    onChange={(e) => setCarre({...carre, ans3: e.target.value })}
                    required
                />
            </div>
            <div className='answerQcm'>
                <div className='headerAns'>
                    <input 
                        type='checkbox' 
                        checked={dccData.answer == 4}
                        className='coloredAnswer'
                        onClick={() => {setDccData({...dccData, answer:4})}}
                    ></input>
                    <label className='questionCreation-label'>Réponse 4</label>
                    <input 
                    type='checkbox' 
                    checked={duoContain(4)}
                    className='coloredAnswer'
                    onClick={() => manageDuo(4)}
                    ></input>
                </div>
                <input
                    type='text'
                    id="answer4"
                    value={carre.ans4 || ''}
                    onChange={(e) => setCarre({...carre, ans4: e.target.value })}
                    required
                />
            </div>
        </div>
        <div className='answersList'>
            <div className='tagSpanDispencer'>
                {answers.map(answer => (
                <span key={answer} onClick={() => removeAnswer(answer)} className="answer" style={{ margin: "5px", cursor: "pointer", background: "#ddd", padding: "5px", borderRadius: "5px" }}>
                    {answer} ❌
                </span>
                ))}
            </div>
            
            <input 
            type="text" 
            onKeyDown={(e) => {
                const inputElement = e.target as HTMLInputElement;
                if (e.key === "Enter" && inputElement.value.trim()) {
                addAnswer(inputElement.value.trim());
                inputElement.value = "";
                }
            }} 
            placeholder="Ajouter une réponse"
            />
            
        </div>
        
        <div className='tagList'>
            <div>
                {tags.map(tag => (
                <span key={tag} onClick={() => removeTag(tag)} className='tag'>
                    {tag} ❌
                </span>
                ))}
            </div>
            {tags.length < 5 ? (
                <input 
                type="text" 
                className='tagInput'
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
                <p style={{ color: "red" }}>Maximum 5 tags atteints</p>
            )}
        </div>
        <Button className='SendButton' onClick={()=>sendDcc()}>Finaliser la création de la question</Button>
    </div>
    )

}