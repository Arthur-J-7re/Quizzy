
import { useState, useEffect } from "react";
import "./GameQuestionAnswer.css"

import GameQuestionAnswer from "./GameQuestionAnswer";
import { PointResult } from "../PointResult/PointResult";


export default function QuestionReceiver({ socket, room_id, username }: {socket: any, room_id : string, username: string }) {
    const [question, setQuestion] = useState<any>();
    const [receive, setReceive] = useState(false);
    const [result, setResult] = useState<any>(null);
    useEffect(()=>{
        if (socket){
            socket.on("newQuestion", (data : any) => {console.log("newQuestion arrived", data);setQuestion(data); setReceive(true); setResult(null)})
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
            {receive? <GameQuestionAnswer question={question} socket={socket} room_id={room_id} username={username}/>:""}
        </>
    );
    } 
}