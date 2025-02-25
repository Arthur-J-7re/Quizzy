import React from 'react';
import Button from '@mui/material/Button';
import { Switch } from '@mui/material';
import {Socket} from "socket.io-client";

interface CreatefreeFormProps {
    question_id : Number;
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
    dccData:{user_id: string; title: string; tags: string[];private: boolean; carre: { ans1: string; ans2: string; ans3: string; ans4: string };duo: number, answer: number; cash : string[] };
    setDccData: React.Dispatch<React.SetStateAction<CreatefreeFormProps["dccData"]>>;
    socket: Socket | null;
  }

export function CreateDCCForm({
    question_id,
    setMessageInfo,
    setShowMessage,
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
    socket
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
        if (socket instanceof Socket && validateDcc()){
            console.log("duo carré cash envoyé");
            const formattedChoices = Object.entries(carre).map(([key,value], index) => ({
                content: value, // Texte du choix
                answer_num: (index + 1).toString() // ID de réponse sous forme de string
            }));
    
            const formattedDccData = {
                ...dccData,
                choices: formattedChoices
            };
            if (question_id === 0){
                socket.emit("createDCCQuestion", formattedDccData);
            } else {
                socket.emit("modificationDCCQuestion", ({question_id : question_id, data : formattedDccData}))
            }
        }
    };

    return (
    <div className='formContainer'>
        <div className='title'>
            <label className='sign-label'>Intitulé de la question</label>
            <input
                type='text'
                id="title"
                value={dccData.title || ''}
                onChange={(e) => setTitle(e.target.value )}
                required
            />
        </div>
        <div className='privateswitch'>
            <label className='sign-label' onClick={() => setPrivate(false)}>Question public</label>
            <Switch
                type='checkbox'
                checked={dccData.private}
                onClick={() => changePrivate()}
            />
            <label className='sign-label' onClick={() => setPrivate(true)}>Question privée</label>
        </div>
        <div className='Carre'>
            <h3>Complétez les différentes propositions et cochez la bonne réponse</h3>
            <div className='answerQcm'>
                <input 
                    type='checkbox' 
                    checked={dccData.answer == 1}
                    onClick={() => {setDccData({...dccData, answer:1})}}
                ></input>
                <label className='sign-label'>Réponse 1</label>
                <input
                    type='text'
                    id="answer1"
                    value={dccData.carre.ans1 || ''}
                    onChange={(e) => setCarre({...carre, ans1: e.target.value })}
                    required
                />
                <input 
                type='checkbox' 
                checked={duoContain(1)}
                onClick={() => manageDuo(1)}
                ></input>
            </div>
            <div className='answerQcm'>
                <input 
                    type='checkbox' 
                    checked={dccData.answer == 2}
                    onClick={() => {setDccData({...dccData, answer:2})}}
                ></input>
                <label className='sign-label'>Réponse 2</label>
                <input
                    type='text'
                    id="answer2"
                    value={dccData.carre.ans2 || ''}
                    onChange={(e) => setCarre({...carre, ans2: e.target.value })}
                    required
                />
                <input 
                type='checkbox' 
                checked={duoContain(2)}
                onClick={() => manageDuo(2)}
                ></input>
            </div>
            <div className='answerQcm'>
                <input 
                    type='checkbox' 
                    checked={dccData.answer == 3}
                    onClick={() => {setDccData({...dccData, answer:3})}}
                ></input>
                <label className='sign-label'>Réponse 3</label>
                <input
                    type='text'
                    id="answer3"
                    value={dccData.carre.ans3 || ''}
                    onChange={(e) => setCarre({...carre, ans3: e.target.value })}
                    required
                />
                <input 
                type='checkbox' 
                checked={duoContain(3)}
                onClick={() => manageDuo(3)}
                ></input>
            </div>
            <div className='answerQcm'>
                <input 
                    type='checkbox' 
                    checked={dccData.answer == 4}
                    onClick={() => {setDccData({...dccData, answer:4})}}
                ></input>
                <label className='sign-label'>Réponse 4</label>
                <input
                    type='text'
                    id="answer4"
                    value={dccData.carre.ans4 || ''}
                    onChange={(e) => setCarre({...carre, ans4: e.target.value })}
                    required
                />
                <input 
                type='checkbox' 
                checked={duoContain(4)}
                onClick={() => manageDuo(4)}
                ></input>
            </div>
        </div>
        <div className='answersList'>
            <div>
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
                <span key={tag} onClick={() => removeTag(tag)} style={{ margin: "5px", cursor: "pointer", background: "#ddd", padding: "5px", borderRadius: "5px" }}>
                    {tag} ❌
                </span>
                ))}
            </div>
            {tags.length < 5 ? (
                <input 
                type="text" 
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