import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"



export default function DuoAnswer( { question, socket, room_id, username }: { question: any, socket: any, room_id : string, username: string }) {
    const [flash, setFlash] = useState(false);
    const [duo, setDuo] = useState<{id : number, value : string}[]>([{id : 0, value :""},{id : 0, value : ""}]);
    const [answering, setAnswering] = useState(true);
    const [selectedAnswer, setSelectedAnswer] =  useState(0);
    const [answer,setAnswer] = useState(0);
    
    const sendAnswer = () =>{
        socket.emit("answerToQuestion", {question : question, answer : {value : selectedAnswer, mode : "DUO"}, room_id : room_id, username: username});
    }

    useEffect(() => {
        const id1 = question.answer;
        let value1 = "";
        const id2 = question.duo;
        let value2 = "";
        for (let i = 1; i < 5; i++) {
            if (id1 === i) {
                value1 = (question.carre as any)["ans" + i];
            } else if (id2 === i) {
                value2 = (question.carre as any)["ans" + i];
            }
        }
        let rand = Math.floor(Math.random() * 2);
        if (rand === 0){
            setDuo([{id : id1, value : value1}, {id : id2, value : value2}]);
        } else {
            setDuo([{id : id2, value : value2}, {id: id1, value : value1}]);
        }
    }, [question])
    

    useEffect(() => {
        socket.on("show Answer", ()=> {
            setFlash(true);
            setTimeout(() => {
                setAnswering(false);
                setFlash(false);
            }, 500);
            setAnswer(question.answer)
        });
    },[socket])

    

    return (
        answering ?

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                {duo.map((elem : any) => 
                <div className={selectedAnswer === elem.id ? (flash ? "gameAnswerQcm gaSelected flash":'gameAnswerQcm gaSelected') :'gameAnswerQcm'} onClick={() => {setSelectedAnswer(elem.id)}}> 
                    {elem.value}
                </div>
                )}
            </div>
            <Button className="buttonSendAnswer" onClick={()=>sendAnswer()}>Valider votre réponse</Button>
        </div>

        : 

        <div className="answerQcmContainer">
            <div className="intitulé">{question.title}</div>
            <div className="answerArea">
                {duo.map((elem : any) => 
                <div className={answer === elem.id ? 'gameAnswerQcmShow goodAnswer': (selectedAnswer === elem.id ?'gameAnswerQcmShow wrongAnswer' :'gameAnswerQcmShow')} > 
                    {elem.value}
                </div>
                )}
            </div>
            <Button className="buttonSendAnswer" onClick={()=>sendAnswer()}>Valider votre réponse</Button>
        </div>
    )
}