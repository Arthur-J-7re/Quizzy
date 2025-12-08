
import { useState, useEffect, useContext } from "react";
import "../GameQuestionAnswer.css"

import GameQuestionAnswer from "../GameQuestionAnswer";
import { PointResult } from "../../Result/PointResult";
import { UsernameContext } from "../../../context/usernameContext";
import { BattleRoyalRoundResult } from "../../Result/BattleRoyalRoundResult";
import { Answers, LifeBoard } from "../../../../../shared-types/type";
import { Question } from "shared-types";


export default function BattleRoyalReceiver({ socket, room_id, username }: {socket: any, room_id : string, username: string }) {
    const [question, setQuestion] = useState<Question>();
    const unameContext = useContext(UsernameContext);
    const [receive, setReceive] = useState(false);
    const [lifeboard,setLifeboard] = useState({});
    const [showRoundResult,setShowRoundResult] = useState(false);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState<any>(null);
    const [canAnswer, setCanAnswer] = useState(false)
    useEffect(()=>{
        if (socket){
            socket.on("newQuestion", ({question, canAnswer} : {question : Question, canAnswer : boolean}) => {console.log("newQuestion arrived", question);setQuestion(question);setCanAnswer(canAnswer) ;setReceive(true); setResult(null)})
            socket.on("PointsResult", (data : any) => {console.log("on recoit le scoreboard",(data));setResult(data)})
            socket.on("result of BR round",({newlifeboard ,newanswers} : {newlifeboard : LifeBoard, newanswers : Answers})=>{
                console.log(newlifeboard,newanswers)
                setLifeboard(newlifeboard);
                setAnswers(newanswers)
                setShowRoundResult(true);
                setTimeout(()=>setShowRoundResult(false),5000);
            })
        }

    }, [socket])

    if (result){ 
        return (
            <PointResult list={result}/>
        )
    }else if(showRoundResult){
        return (
            <BattleRoyalRoundResult lifeboard={lifeboard} answers={answers} username={unameContext?.getName() || ""}/>
        )
    } else {
        
        return (
        <>
            {receive && question? <GameQuestionAnswer question={question} socket={socket} room_id={room_id} canAnswer={canAnswer} username={username}/>:""}
        </>
    );
    } 
}