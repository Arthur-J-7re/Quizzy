import React from 'react';
import { Button } from '@mui/material';
import { Switch } from '@mui/material';
import "./CreateQuestionCss.css"
import makeRequest from '../../tools/requestScheme';

interface CreateQCMFormProps {
    question_id: number,
    endTask : () => void,
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
    carre: { ans1: string; ans2: string; ans3: string; ans4: string };
    setCarre: React.Dispatch<React.SetStateAction<{ ans1: string; ans2: string; ans3: string; ans4: string }>>;
    qcmData: {user_id: string;mode : string;title: string; tags: string[];private: boolean; choices: { ans1: string; ans2: string; ans3: string; ans4: string }; answer: number };
    setQcmData: React.Dispatch<React.SetStateAction<CreateQCMFormProps["qcmData"]>>;
}
  

export function CreateQCMForm({
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
    carre,
    setCarre,
    qcmData,
    setQcmData,
  }: CreateQCMFormProps) {

    const validateQcm = () => {
        if (!qcmData.title.trim()) {
            setMessageInfo("Il faut un intitulé à la question !");
            setShowMessage(true);
            return false;
        }

        if (tags.length === 0) {
            setMessageInfo("veuillez renseigner au moins une catégorie pour la question.");
            setShowMessage(true);
            return false;
        }
    
        if (!qcmData.choices.ans1.trim() || 
            !qcmData.choices.ans2.trim() || 
            !qcmData.choices.ans3.trim() || 
            !qcmData.choices.ans4.trim()) {
            setMessageInfo("Toutes les réponses doivent être remplies !");
            setShowMessage(true);
            return false;
        }
    
        return true;
    };

    

    const sendQcm = async () => {
        if (validateQcm()){
            if (question_id === 0){
                const response = await makeRequest("/question/create", "POST", qcmData);
                if (response.success){
                    endTask();
                };

            } else {
                const response = await  makeRequest("/question/update", "PUT", {data : qcmData, question_id : question_id});
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
                    value={title || ''}
                    className='titre'
                    onChange={(e) => setTitle(e.target.value )}
                    autoComplete="off"
                    required
                />
            </div>
            <div className='privateswitch'>
                <label className='questionCreation-label' onClick={() => setPrivate(false)}>Question public</label>
                <Switch
                    type='checkboxe'
                    checked={qcmData.private}
                    className='isPrivate'
                    onClick={() => changePrivate()}
                />
                <label className='questionCreation-label' onClick={() => setPrivate(true)}>Question privée</label>
            </div>
            <div className='carre'>
            <h3 className='questionCreationIndication'>Complétez les différentes propositions et cochez la bonne réponse</h3>
                <div className='answerQcm'> 
                    <div className='headerAns' onClick={() => setQcmData({...qcmData, answer:1})}>
                        <input 
                            type='checkbox' 
                            checked={qcmData.answer == 1}  
                            className='coloredAnswer'
                        ></input>
                        <label className='questionCreation-label'>Réponse 1</label>
                    </div>
                    <input
                        type='text'
                        autoComplete="off"
                        id="answer1" 
                        value={carre.ans1 || ''}
                        onChange={(e) => setCarre({...carre, ans1: e.target.value })}
                        required
                    />
                </div>
                <div className='answerQcm'>
                    <div className='headerAns' onClick={() => {setQcmData({...qcmData, answer:2})}}>
                    <input 
                        type='checkbox' 
                        checked={qcmData.answer == 2}
                        className='coloredAnswer'
                    ></input>
                    <label className='questionCreation-label'>Réponse 2</label>
                    </div>
                    <input
                        type='text'
                        autoComplete="off"
                        id="answer2"
                        value={carre.ans2 || ''}
                        onChange={(e) => setCarre({...carre, ans2: e.target.value })}
                        required
                    />
                </div>
                <div className='answerQcm'>
                    <div className='headerAns' onClick={() => setQcmData({...qcmData, answer:3})}>
                    <input 
                        type='checkbox' 
                        checked={qcmData.answer == 3}
                        className='coloredAnswer'
                    ></input>
                    <label className='questionCreation-label'>Réponse 3</label>
                    </div>
                    <input
                        type='text'
                        id="answer3"
                        autoComplete="off"
                        value={carre.ans3 || ''}
                        onChange={(e) => setCarre({...carre, ans3: e.target.value })}
                        required
                    />
                </div>
                <div className='answerQcm'>
                    <div className='headerAns' onClick={() => setQcmData({...qcmData, answer:4})}>
                    <input 
                        type='checkbox' 
                        checked={qcmData.answer == 4}
                        className='coloredAnswer'
                        
                    ></input>
                    <label className='questionCreation-label'>Réponse 4</label>
                    </div>
                    <input
                        type='text'
                        id="answer4"
                        autoComplete="off"
                        value={carre.ans4 || ''}
                        onChange={(e) => setCarre({...carre, ans4: e.target.value })}
                        required
                    />
                </div>
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
            <Button className='SendButton' onClick={()=>sendQcm()}>Finaliser la création de la question</Button>
        </div>
    
    )

}