import React from 'react';
import { Button } from '@mui/material';
import { Switch } from '@mui/material';
import "./CreateQuestionCss.css"
import makeRequest from '../../tools/requestScheme';

interface CreateVfFormProps {
    question_id: number,
    endTask : ()=>void;
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
    truth: boolean, 
    setTruth: (bool : boolean)=>void;
    vfData: { user_id: string;mode : string;title: string; tags: string[];private: boolean; truth: boolean };
    setVfData: React.Dispatch<React.SetStateAction<CreateVfFormProps["vfData"]>>;
  }
  

export function CreateVfForm({
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
    truth,
    setTruth,
    vfData,
  }: CreateVfFormProps) {
  
    

    const validateVf = () => {
        if (!vfData.title.trim()) {
            setMessageInfo("Il faut un intitulé à la question !");
            setShowMessage(true);
            return false;
        }

        if (tags.length === 0) {
            setMessageInfo("veuillez renseigner au moins une catégorie pour la question.");
            setShowMessage(true);
            return false;
        }
        return true;
    }

    const sendVF = async () => {
        if (validateVf()){
            if (question_id === 0){
                const response = await makeRequest("/question/create", "POST", vfData);
                if (response.success){
                    endTask();
                };

            } else {
                const response = await  makeRequest("/question/update", "PUT", {data : vfData, question_id : question_id});
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
                    checked={vfData.private}
                    className='isPrivate'
                    onClick={() => changePrivate()}
                />
                <label className='questionCreation-label' onClick={() => setPrivate(true)}>Question privée</label>
            </div>
            <div className='VraiFaux'>
                <Button onClick={()=>setTruth(true)} className={truth ? "VFButtonchecked":"VFButton"} >Vrai</Button>
                <Button onClick={()=>setTruth(false)} className={truth ? "VFButton" : "VFButtonchecked"}>Faux</Button>
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
            <Button className='SendButton' onClick={()=>sendVF()}>Finaliser la création de la question</Button>
        </div>
    
    )

}