import React from 'react';
import { Button } from '@mui/material';
import { Switch } from '@mui/material';
import {Socket} from "socket.io-client";
import "./CreateQuestionCss.css"

interface CreateVfFormProps {
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
    truth: boolean, 
    setTruth: (bool : boolean)=>void;
    vfData: { user_id: string;title: string; tags: string[];private: boolean; truth: boolean };
    setVfData: React.Dispatch<React.SetStateAction<CreateVfFormProps["vfData"]>>;
    socket: Socket | null;
  }
  

export function CreateVfForm({
    question_id,
    setMessageInfo,
    setShowMessage,
    setTitle,
    setPrivate,
    changePrivate,
    tags,
    addTag,
    removeTag,
    truth,
    setTruth,
    vfData,
    socket
  }: CreateVfFormProps) {
  
    
    //const socket = useSocket();

    const validateVf = () => {
        if (!vfData.title.trim()) {
            setMessageInfo("Il faut un intitulé à la question !");
            setShowMessage(true);
            return false;
        }
        return true;
    }

    const sendVF = async () => {
        if (socket instanceof Socket && validateVf()){
            if (question_id===0){
                socket.emit("createVFQuestion", vfData);
            } else {
                socket.emit("modificationVFQuestion", ({question_id : question_id, data : vfData}));
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
                    className='titre'
                    value={vfData.title || ''}
                    onChange={(e) => setTitle(e.target.value )}
                    required
                />
            </div>
            <div className='privateswitch'>
                <label className='sign-label' onClick={() => setPrivate(false)}>Question public</label>
                <Switch
                    type='checkboxe'
                    checked={vfData.private}
                    className='isPrivate'
                    onClick={() => changePrivate()}
                />
                <label className='sign-label' onClick={() => setPrivate(true)}>Question privée</label>
            </div>
            <div className='VraiFaux'>
                <Button onClick={()=>setTruth(true)} className={"VFButton" + truth ? "checked" : ""} >Vrai</Button>
                <Button onClick={()=>setTruth(false)} className={"VFButton" + truth ? "" : "checked"}>Faux</Button>
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
            <Button className='SendButton' onClick={()=>sendVF()}>Finaliser la création de la question</Button>
        </div>
    
    )

}