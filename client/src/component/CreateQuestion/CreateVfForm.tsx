import React from 'react';
import { Button } from '@mui/material';
import { Switch } from '@mui/material';
import {Socket} from "socket.io-client";

interface CreateVfFormProps {
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
    }

    const sendVf = async () => {
        if (socket instanceof Socket && validateVf()){
            
    
            socket.emit("createVFQuestion", vfData);
        }
    };
    

    return (
        <div className='formContainer'>
            <div className='title'>
                <label className='sign-label'>Intitulé de la question</label>
                <input
                    type='text'
                    id="title"
                    value={vfData.title || ''}
                    onChange={(e) => setTitle(e.target.value )}
                    required
                />
            </div>
            <div className='privateswitch'>
                <label className='sign-label' onClick={() => setPrivate(false)}>Question public</label>
                <Switch
                    type='checkbox'
                    checked={vfData.private}
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
            <Button className='SendButton' onClick={()=>sendVf()}>Finaliser la création de la question</Button>
        </div>
    
    )

}