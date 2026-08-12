import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"
import { Question } from "shared-types";


export default function CarreAnswer( { question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer: boolean, answerEvent?: string }) {
    const [flash, setFlash] = useState(false);
    const [answering, setAnswering] = useState(true);
    const [selectedAns, setSelectedAns] = useState(0);
    const sendAnswer = () =>{
        socket.emit(answerEvent ?? "answerToQuestion", {question : question, answer : {value : selectedAns, mode : "CARRE"}, room_id : room_id, username: username});
    }


    useEffect(() => {
        socket.on("show Answer", ()=> {
            setFlash(true);
            setTimeout(() => {
                setAnswering(false);
                setFlash(false);
            }, 500);
        });
    },[socket])

    if (question.mode !== "DCC"){
        return null;
    }
    const carre = question.carre;
    // Ordre d'affichage posé par le serveur (identique pour tous les joueurs
    // de la room) ; `question.answer` reste l'index canonique, non affecté.
    const order = question.choiceOrder ?? [1, 2, 3, 4];

    return (
        answering ?

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                {order.map((idx) => (
                    <div
                        key={idx}
                        className={selectedAns === idx ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected') :'gameAnswerQcm'}
                        onClick={() => {setSelectedAns(idx)}}
                    >
                        {(carre as any)[`ans${idx}`]}
                    </div>
                ))}
            </div>
            {canAnswer &&
            <Button className="buttonSendAnswer" onClick={()=>sendAnswer()}>Valider votre réponse</Button>}
        </div>

        :

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                {order.map((idx) => (
                    <div
                        key={idx}
                        className={question.answer === idx ? 'gameAnswerQcmShow goodAnswer': (selectedAns === idx ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')}
                    >
                        {(carre as any)[`ans${idx}`]}
                    </div>
                ))}
            </div>

        </div>
    )
}
