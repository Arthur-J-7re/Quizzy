import { Button } from "@mui/material";
import { Banner } from "../../../component/Banner/GameBanner"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react";
import "../../CommonCss.css";
import "../../Home/Home.css"
import { useSocket } from "../../../context/socketContext";
import GameQuestionAnswer from "../../../component/GameQuestionAnswer/GameQuestionAnswer";

export function Test () {

    const [question, setQuestion] = useState<any>();
    let receive = false;
    const [socketMontee, setSocketMontee] = useState(true);
    const socket = useSocket();
    useEffect(() => {
        if (socketMontee && socket){
            console.log("ça émit là ?");
            socket?.emit("getQuestionTest");
            setSocketMontee(false);
        }
    },[socket])
    useEffect(() => {
        console.log("aaaaaaahhhhhh");
        if (socket){
            console.log("y a la socket");
            socket.on("newQuestion", (data) => {console.log("reception de NewQuestion avec : ",data.question);setQuestion(data.question); console.log("après le question set"); receive = true})
        }
    }, [socket])

    useEffect(()=>{
        console.log("on reçoit visiblement ça : ", question)
    }, [question]);
    const navigate = useNavigate();
    return (
    <div className="homeContainer">
        <Banner></Banner>

        {question?.title ? <GameQuestionAnswer question={question} socket={socket}/> : ""}
    </div> 
    )
}