import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "./GameQuestionAnswer.css"
import { Socket } from "socket.io-client";
import { Question } from "shared-types";


export default function FreeAnswer( { question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: Socket, room_id : string, username: string, canAnswer: boolean, answerEvent?: string }) {
    const [flash, setFlash] = useState(false);
    const [answering, setAnswering] = useState(true);
    const [selectedAns, setSelectedAns] = useState("");
    const [answer, setAnswer] =  useState("");
    const sendAnswer = () =>{
        socket.emit(answerEvent ?? "answerToQuestion", {question : question, answer : selectedAns, room_id : room_id, username: username});
    }
    

    useEffect(() => {
        socket.on("good answer", ()=> {
            setFlash(true);
            setTimeout(() => {
                setAnswering(false);
                setFlash(false);
            }, 500);
        });
        socket.on("wrong answer", ({answer} : {answer : string})=> {
            setFlash(true);
            setAnswer(answer);
            setTimeout(() => {
                setAnswering(false);
                setFlash(false);
            }, 500);
        });
    },[socket])

    // Cf. QcmAnswer : même instance réutilisée d'une question à l'autre,
    // sans quoi la saisie/le flash précédents restaient affichés.
    useEffect(() => {
        setAnswering(true);
        setSelectedAns("");
        setAnswer("");
        setFlash(false);
    }, [question.question_id])

    const renderAnswer = () => {
        if (answer === ""){
            return (
            <div className="freeShowArea"><div className="goodAnswerFree">
                {selectedAns}
            </div></div>)
        } else {
            return (
                <div className="freeShowArea">
                <div className="wrongAnswerFree">{selectedAns}</div>
                <div className="goodAnswerFree">{answer}</div>
                </div>
            )
        }

    }


    return (
        answering ?

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                <div className={flash ? "freeAnswerInputArea flash" : "freeAnswerInputArea"}>
                    <input className={"freeAnswerInput "}onChange={(e) => setSelectedAns(e.target.value)} value={selectedAns}></input>
                </div>
            </div>
            {canAnswer && 
            <Button className="buttonSendAnswer"onClick={()=>sendAnswer()}>Valider votre réponse</Button>}
        </div>

        : 

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="freeAnswerShow">
                {renderAnswer()}
            </div>
            <div className="answerQcmCarreArea">
                
            </div>

        </div>
    )
}