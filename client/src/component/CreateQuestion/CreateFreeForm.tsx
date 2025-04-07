import React from 'react';
import Button from '@mui/material/Button';
import { Switch } from '@mui/material';
import {Socket} from "socket.io-client";
import "./CreateQuestionCss.css"

interface CreatefreeFormProps {
    question_id: Number,
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
    freeData: {user_id: string; title: string; tags: string[];private: boolean; answers: string[] };
    setFreeData: React.Dispatch<React.SetStateAction<CreatefreeFormProps["freeData"]>>;
    socket: Socket | null;
  }

export function CreateFreeForm({
    question_id,
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
    freeData,
    socket
  }: CreatefreeFormProps)  {

    const validateFree = () => { 

        if (!freeData.title.trim()) {
            setMessageInfo("Il faut un intitulé à la question !");
            setShowMessage(true);
            return false;
        }

        if (freeData.answers.length === 0) {
            setMessageInfo("Il faut au moins une réponse !");
            setShowMessage(true);
            return false;
        }

        if (tags.length === 0) {
            setMessageInfo("veuillez renseigner au moins une catégorie pour la question.");
            setShowMessage(true);
            return false;
        }
    
        if (freeData.answers.some(answer => answer.trim() === "")) {
            setMessageInfo("Toutes les réponses doivent être remplies !");
            setShowMessage(true)
            return false;
        }
    
        return true;
    }
    

    const sendFree = async () => {
        if (socket instanceof Socket && validateFree()){
            if (question_id === 0){
            socket.emit("createFreeQuestion", freeData);
            } else {
                socket.emit("modificationFreeQuestion", ({question_id : question_id, data : freeData}));
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
                checked={freeData.private}
                className='isPrivate'
                onClick={() => changePrivate()}
            />
            <label className='questionCreation-label' onClick={() => setPrivate(true)}>Question privée</label>
        </div>
        <div className='answersList'>
            <div className='tagSpanDispencer'>
                {answers.map(answer => (
                <span key={answer} onClick={() => removeAnswer(answer)} className="answer" >
                    {answer} ❌
                </span>
                ))}
            </div>
            
            <input 
            type="text" 
            className='answerInput'
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
            <div className='tagSpanDispencer'>
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
        <Button className='SendButton' onClick={()=>sendFree()}>Finaliser la création de la question</Button>
    </div>

    
    )

}