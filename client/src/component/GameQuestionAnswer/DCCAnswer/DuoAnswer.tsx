import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"
import { Question } from "shared-types";



export default function DuoAnswer( { question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer: boolean, answerEvent?: string }) {
    const [flash, setFlash] = useState(false);
    const [answering, setAnswering] = useState(true);
    const [selectedAnswer, setSelectedAnswer] =  useState(0);
    const [answer,setAnswer] = useState(0);

    const sendAnswer = () =>{
        socket.emit(answerEvent ?? "answerToQuestion", {question : question, answer : {value : selectedAnswer, mode : "DUO"}, room_id : room_id, username: username});
    }

    useEffect(() => {
        socket.on("show Answer", ()=> {
            setFlash(true);
            setTimeout(() => {
                setAnswering(false);
                setFlash(false);
            }, 500);
            if (question.mode === "DCC") setAnswer(question.answer);
        });
    },[socket])

    if (question.mode !== "DCC"){
        return null;
    }

    // Les 2 propositions (texte + id) et leur ordre d'affichage viennent du
    // serveur : identiques pour tous les joueurs de la room, et calculées
    // sans jamais exposer `answer` avant la révélation.
    const duo = question.duoChoices ?? [];

    return (
        answering ?

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                {duo.map((elem) =>
                <div key={elem.id} className={selectedAnswer === elem.id ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected') :'gameAnswerQcm'} onClick={() => {setSelectedAnswer(elem.id)}}>
                    {elem.value}
                </div>
                )}
            </div>
            {canAnswer &&
            <Button className="buttonSendAnswer" onClick={()=>sendAnswer()}>Valider votre réponse</Button>}
        </div>

        :

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                {duo.map((elem) =>
                <div key={elem.id} className={answer === elem.id ? 'gameAnswerQcmShow goodAnswer': (selectedAnswer === elem.id ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')} >
                    {elem.value}
                </div>
                )}
            </div>
        </div>
    )
}
