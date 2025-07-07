import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"


export default function CashAnswer( { question, socket, room_id, username, canAnswer }: { question: any, socket: any, room_id : string, username: string, canAnswer:boolean }) {
    const [flash, setFlash] = useState(false);
    const [answering, setAnswering] = useState(true);
    const [selectedAns, setSelectedAns] = useState("");
    const [answer, setAnswer] =  useState("");
    const sendAnswer = () =>{
        socket.emit("answerToQuestion", {question : question, answer :{value : selectedAns, mode : "CASH"} , room_id : room_id, username: username});
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
            <Button className="buttonSendAnswer" onClick={()=>sendAnswer()}>Valider votre réponse</Button>}
        </div>

        : 

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                {renderAnswer()}
            </div>
            <div className="answerQcmCarreArea">
                
            </div>

        </div>
    )
}