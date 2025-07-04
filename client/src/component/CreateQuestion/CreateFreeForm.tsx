import React from 'react';
import Button from '@mui/material/Button';
import "./CreateQuestionCss.css"
import makeRequest from '../../tools/requestScheme';

interface CreatefreeFormProps {
    question_id: number,
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
    freeData: {user_id: string;mode : string; title: string; level: number;tags: string[];private: boolean; answers: string[] };
    setFreeData: React.Dispatch<React.SetStateAction<CreatefreeFormProps["freeData"]>>;
  }

export function CreateFreeForm({
    question_id,
    endTask,
    setMessageInfo,
    setShowMessage,
    tags,
    addTag,
    removeTag,
    answers,
    addAnswer,
    removeAnswer,
    freeData,
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
        if (validateFree()){
            if (question_id === 0){
                const response = await makeRequest("/question/create", "POST", freeData);
                if (response.success){
                    endTask();
                };

            } else {
                const response = await  makeRequest("/question/update", "PUT",{question_id : question_id, data :freeData});
                if (response.success){
                    endTask();
                };

            }
        }    
    };
 
    return (
    <div className='formContainer'>
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
        
        <Button className='SendButton' onClick={()=>sendFree()}>{question_id === 0 ? "Finaliser la création de" : "Sauvegarder"} la question</Button>
    </div>

    
    )

}