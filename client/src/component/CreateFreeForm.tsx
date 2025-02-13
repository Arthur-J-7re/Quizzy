import React, { useState, useEffect, useRef} from 'react';
import Button from '@mui/material/Button';
import { Switch } from '@mui/material';
import { useSocket } from '../context/socketContext';
import {Socket, io} from "socket.io-client";

interface CreatefreeFormProps {
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
    freeData: { title: string; tags: string[];private: boolean; answers: string[] };
    setFreeData: React.Dispatch<React.SetStateAction<CreatefreeFormProps["freeData"]>>;
    socket: Socket | null;
  }

export function CreateFreeForm({
    setTitle,
    setPrivate,
    changePrivate,
    tags,
    addTag,
    removeTag,
    answers,
    setAnswers,
    addAnswer,
    removeAnswer,
    freeData,
    setFreeData,
    socket
  }: CreatefreeFormProps)  {

    const validateFree = () => {

        if (!freeData.title.trim()) {
            alert("Il faut un intitulé à la question !");
            return false;
        }

        if (freeData.answers.length === 0) {
            alert("Il faut au moins une réponse !");
            return false;
        }
    
        if (freeData.answers.some(answer => answer.trim() === "")) {
            alert("Toutes les réponses doivent être remplies !");
            return false;
        }
    
        return true;
    }
    

    const sendFree = async () => {
        if (socket instanceof Socket && validateFree()){
            socket.emit("createFreeQuestion", freeData);
        }
    };

    return (
    <div className='formContainer'>
        <div className='title'>
            <label className='sign-label'>Intitulé de la question</label>
            <input
                type='text'
                id="title"
                value={freeData.title || ''}
                onChange={(e) => setTitle(e.target.value )}
                required
            />
        </div>
        <div className='privateswitch'>
            <label className='sign-label' onClick={() => setPrivate(false)}>Question public</label>
            <Switch
                type='checkbox'
                checked={freeData.private}
                onClick={() => changePrivate()}
            />
            <label className='sign-label' onClick={() => setPrivate(true)}>Question privée</label>
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
        <Button className='SendButton' onClick={()=>sendFree()}>Finaliser la création de la question</Button>
    </div>

    
    )

}