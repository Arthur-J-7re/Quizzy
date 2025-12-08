import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "./GameQuestionAnswer.css"
import { Question } from "shared-types";



export default function VfAnswer( { question, socket, room_id, username, canAnswer }: { question: Question, socket: any, room_id : string, username: string, canAnswer: boolean }) {
    const [flash, setFlash] = useState(false);
    const [answering, setAnswering] = useState(true);
    const [selectedAnswer, setSelectedAnswer] =  useState("");
    const [answer,setAnswer] = useState("");
    
    const sendAnswer = () =>{
        socket.emit("answerToQuestion", {question : question, answer : selectedAnswer, room_id : room_id, username: username});
    }

    
    

    useEffect(() => {
        socket.on("good answer", ()=> {
            setFlash(true);
            setTimeout(() => {
                setAnswering(false);
                setFlash(false);
            }, 500);
        });
        socket.on("wrong answer", ({answer} : {answer : boolean})=> {
            setFlash(true);
            setAnswer(answer ? "vrai" : "faux");
            setTimeout(() => {
                setAnswering(false);
                setFlash(false);
            }, 500);
        });
    },[socket])

    

    return (
        answering ?

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                <div className={selectedAnswer === "vrai" ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected') :'gameAnswerQcm'} onClick={() => {setSelectedAnswer("vrai")}}> 
                    Vrai
                </div>
                <div className={selectedAnswer === "faux" ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected') :'gameAnswerQcm'} onClick={() => {setSelectedAnswer("faux")}}> 
                    Faux
                </div>
            </div>
            {canAnswer && 
            <Button className="buttonSendAnswer" onClick={()=>sendAnswer()}>Valider votre réponse</Button>}
        </div>

        : 

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                
                <div className={answer === "vrai" ? 'gameAnswerQcmShow goodAnswer': (selectedAnswer === "vrai" ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')} > 
                    Vrai
                </div>
                <div className={answer === "faux" ? 'gameAnswerQcmShow goodAnswer': (selectedAnswer === "faux" ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')} > 
                    Faux
                </div>
                
            </div>
            <Button className="buttonSendAnswer" onClick={()=>sendAnswer()}>Valider votre réponse</Button>
        </div>
    )
}