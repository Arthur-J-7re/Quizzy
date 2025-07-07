import { Button } from "@mui/material";
import { Banner } from "../../../component/Banner/GameBanner"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react";
import "../../CommonCss.css";
import "../../Home/Home.css"
import { useSocket } from "../../../context/socketContext";
import GameQuestionAnswer from "../../../component/GameQuestionAnswer/GameQuestionAnswer";
import CreateRoom from "../../../component/CreateRoom/CreateRoom";

export function Test () {

    const [question, setQuestion] = useState<any>();
    const [receive, setReceive] = useState(false);
    const [socketMontee, setSocketMontee] = useState(true);
    const dev = true;
    const answer = false;
    const socket = useSocket();
    useEffect(() => {
        if (socketMontee && socket){
            socket?.emit("getQuestionTest");
            setSocketMontee(false);
        }
    },[socket])
    useEffect(() => {
        if (socket && answer){
            socket.on("newQuestion", (data) => {console.log("newQuestion arrived", data);setQuestion(data.question); setReceive(true)})
        }
    }, [socket])

    /*useEffect(()=>{
        console.log("on reçoit visiblement ça : ", question)
    }, [question]);*/
    const navigate = useNavigate();
    return (
    <div className="homeContainer">
        {dev ? <Banner></Banner> : "future timer"}

        {/*<CreateRoom />*/}
        {answer ? 
            receive ?
                <GameQuestionAnswer question={question} socket={socket} room_id={"0"} username={"test"}/>: "": <CreateRoom />
            
        }
    </div> 
    )
}