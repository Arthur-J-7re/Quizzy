import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"


export default function CarreAnswer( { question, socket, room_id, username, canAnswer }: { question: any, socket: any, room_id : string, username: string, canAnswer: boolean }) {
    const carre = (question? question.carre : {ans1 : "", ans2 : "", ans3 : "", ans4 : ""});
    const [flash, setFlash] = useState(false);
    const [answering, setAnswering] = useState(true);
    const [selectedAns, setSelectedAns] = useState(0);
    const sendAnswer = () =>{
        socket.emit("answerToQuestion", {question : question, answer : {value : selectedAns, mode : "CARRE"}, room_id : room_id, username: username});
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


    return (
        answering ?

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                <div className={selectedAns === 1 ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected') :'gameAnswerQcm'} onClick={() => {setSelectedAns(1)}}> 
                    {carre.ans1}
                </div>
                <div className={selectedAns === 2 ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected') :'gameAnswerQcm'} onClick={() => {setSelectedAns(2)}}> 
                    {carre.ans2}
                </div>
                <div className={selectedAns === 3 ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected'):'gameAnswerQcm'} onClick={() => {setSelectedAns(3)}}> 
                    {carre.ans3}
                </div>
                <div className={selectedAns === 4 ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected') :'gameAnswerQcm'} onClick={() => {setSelectedAns(4)}}> 
                    {carre.ans4}
                </div>
            </div>
            {canAnswer && 
            <Button className="buttonSendAnswer" onClick={()=>sendAnswer()}>Valider votre réponse</Button>}
        </div>

        : 

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                <div className={question.answer === 1 ? 'gameAnswerQcmShow goodAnswer': (selectedAns === 1 ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')} > 
                    {carre.ans1}
                </div>
                <div className={question.answer === 2 ? 'gameAnswerQcmShow goodAnswer': (selectedAns === 2 ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')}> 
                    {carre.ans2}
                </div>
                <div className={question.answer === 3 ? 'gameAnswerQcmShow goodAnswer': (selectedAns === 3 ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')}> 
                    {carre.ans3}
                </div>
                <div className={question.answer === 4 ? 'gameAnswerQcmShow goodAnswer': (selectedAns === 4 ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')} > 
                    {carre.ans4}
                </div>
            </div>

        </div>
    )
}