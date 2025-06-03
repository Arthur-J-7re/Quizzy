import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"
import CarreAnswer from "./CarreAnswer";
import DuoAnswer from "./DuoAnswer";
import CashAnswer from "./CashAnswer";

export default function DccAnswer( { question, socket, room_id, username }: { question: any, socket: any, room_id : string, username: string }) {
    const [selectedMode, setSelectedMode] = useState("");

    useEffect(() => {
        console.log("on demande le mode")
        socket.emit("getDccMode", ({room_id:  room_id, username: username}));
    }, []);

    useEffect(() => {
        socket.on("DccMode", (mode : any) => {
            console.log(mode);
            if (mode){
                setSelectedMode(mode);
            }
        })
    });

    useEffect(()=>{
        setSelectedMode("");
    },[question])

    const handleSelectedMode = (mode : string) => {
        socket.emit("setMode", ({mode: mode, username : username, room_id:room_id}));
        setSelectedMode(mode)
    }

    const renderDCC = () => {
        switch (selectedMode){
            default:
                return (
                    <div className="modeSelectorDcc">
                        <div className="intitule">{question.title}</div>
                        <Button className="modeSelectorDccButton" onClick={() => handleSelectedMode("Duo")}>Duo</Button>
                        <Button className="modeSelectorDccButton" onClick={() => handleSelectedMode("Carre")}>Carre</Button>
                        <Button className="modeSelectorDccButton" onClick={() => handleSelectedMode("Cash")}>Cash</Button>
                    </div>
                )
            case "Duo":
                return (<DuoAnswer question={question} socket={socket} room_id={room_id} username={username}/>)
            case "Carre":
                return (<CarreAnswer question={question} socket={socket} room_id={room_id} username={username}/>)
            case "Cash":
                return (<CashAnswer question={question} socket={socket} room_id={room_id} username={username}/>)
        }

    }

    return (
        <div>
            <Button onClick={() => {handleSelectedMode("")}}> reset Mode</Button>
            {renderDCC()}
        </div>
    )
}