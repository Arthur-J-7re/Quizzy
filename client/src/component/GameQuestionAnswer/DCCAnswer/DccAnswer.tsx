import { Button } from "@mui/material";
import { useEffect, useState } from "react";
import "../GameQuestionAnswer.css"
import CarreAnswer from "./CarreAnswer";
import DuoAnswer from "./DuoAnswer";
import CashAnswer from "./CashAnswer";
import { Question } from "shared-types";

/** Mode local (casse historique du sélecteur) <- mode forcé posé par le serveur (casse "fil"). */
const FORCED_MODE_LABEL: Record<string, string> = {
    CARRE: "Carre",
    DUO: "Duo",
    CASH: "Cash",
};

export default function DccAnswer( { question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer : boolean, answerEvent?: string }) {
    const forcedMode = (question as any).forcedDccMode ? FORCED_MODE_LABEL[(question as any).forcedDccMode] : "";
    const [selectedMode, setSelectedMode] = useState(forcedMode);

    useEffect(()=>{
        setSelectedMode(forcedMode);
    },[question])

    const handleSelectedMode = (mode : string) => {
        setSelectedMode(mode)
    }

    const renderDCC = () => {
        switch (selectedMode){
            default:
                // Spectateur (canAnswer=false) sur un DCC non forcé : le joueur
                // actif n'a pas encore choisi son sous-mode (Duo/Carré/Cash),
                // donc rien de fiable à montrer à part l'intitulé — le
                // sélecteur ici ne refléterait qu'un choix local, jamais le
                // vrai sous-mode joué.
                if (!canAnswer) {
                    return (
                        <div className="modeSelectorDcc">
                            <div className="intitule">{question.title}</div>
                        </div>
                    )
                }
                return (
                    <div className="modeSelectorDcc">
                        <div className="intitule">{question.title}</div>
                        <Button className="modeSelectorDccButton" onClick={() => handleSelectedMode("Duo")}>Duo</Button>
                        <Button className="modeSelectorDccButton" onClick={() => handleSelectedMode("Carre")}>Carre</Button>
                        <Button className="modeSelectorDccButton" onClick={() => handleSelectedMode("Cash")}>Cash</Button>
                    </div>
                )
            case "Duo":
                return (<DuoAnswer question={question} socket={socket} room_id={room_id} username={username} canAnswer={canAnswer} answerEvent={answerEvent}/>)
            case "Carre":
                return (<CarreAnswer question={question} socket={socket} room_id={room_id} username={username} canAnswer={canAnswer} answerEvent={answerEvent}/>)
            case "Cash":
                return (<CashAnswer question={question} socket={socket} room_id={room_id} username={username} canAnswer={canAnswer} answerEvent={answerEvent}/>)
        }

    }

    return (
        <div>
            {!forcedMode && canAnswer && <Button onClick={() => {handleSelectedMode("")}}> reset Mode</Button>}
            {renderDCC()}
        </div>
    )
}
