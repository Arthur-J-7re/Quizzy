
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"

import GameQuestionAnswer from "../GameQuestionAnswer";
import { PointResult } from "../../Result/PointResult";
import { Question } from "shared-types";


export default function PointReceiver({ socket, room_id, username }: {socket: any, room_id : string, username: string }) {
    const [question, setQuestion] = useState<Question>();
    const [receive, setReceive] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [canAnswer, setCanAnswer] = useState(false)
    useEffect(()=>{
        if (socket){
            socket.on("newQuestion", ({question, canAnswer} : {question : Question, canAnswer : boolean}) => {console.log("newQuestion arrived", question);setQuestion(question);setCanAnswer(canAnswer) ;setReceive(true); setResult(null)})
            socket.on("PointsResult", (data : any) => {console.log("on recoit le scoreboard",(data));setResult(data)})
        }

    }, [socket])
    if (result){ 
        return (
            <PointResult list={result}/>
        )
    } else {
        
        return (
        <>
            {receive && question? <GameQuestionAnswer question={question} socket={socket} room_id={room_id} canAnswer={canAnswer} username={username}/>:""}
        </>
    );
    } 
}