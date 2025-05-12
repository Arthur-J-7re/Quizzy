import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "./GameQuestionAnswer.css"
import QcmAnswer from "./QcmAnswer";
import FreeAnswer from "./FreeAnswer";
import DccAnswer from "./DCCAnswer/DccAnswer";
import VfAnswer from "./VfAnswer";


function renderComponent(mode: string, question: any, socket: any) {
    switch (mode) {
        case "QCM":
            return <QcmAnswer question={question} socket={socket} />;
        case "FREE":
            return <FreeAnswer question={question} socket={socket} />;
        case "DCC":
            return <DccAnswer question={question} socket={socket} />;
        case "VF":
            return <VfAnswer question={question} socket={socket}/>
        default:
            return <div>Mode non supporté</div>;
    }
}

export default function GameQuestionAnswer({ question, socket }: { question: any, socket: any }) {
    return (
        <>
            {renderComponent(question.mode, question, socket)}
        </>
    );
}