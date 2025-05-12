import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"
import CarreAnswer from "./CarreAnswer";
import DuoAnswer from "./DuoAnswer";
import CashAnswer from "./CashAnswer";

export default function DccAnswer( { question, socket }: { question: any, socket: any }) {
    const [selectedMode, setSelectedMode] = useState("");

    useEffect(() => {
        socket.emit("getDccMode");
    }, []);

    useEffect(() => {
        socket.on("DccMode", (mode : any) => {
            if (mode){
                setSelectedMode(mode);
            }
        })
    });

    const handleSelectedMode = (mode : string) => {
        socket.emit("setMode", (mode));
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
                return (<DuoAnswer question={question} socket={socket}/>)
            case "Carre":
                return (<CarreAnswer question={question} socket={socket}/>)
            case "Cash":
                return (<CashAnswer question={question} socket={socket}/>)
        }

    }

    return (
        <div>
            <Button onClick={() => {handleSelectedMode("")}}> reset Mode</Button>
            {renderDCC()}
        </div>
    )
}