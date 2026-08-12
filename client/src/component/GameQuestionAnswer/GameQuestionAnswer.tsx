
import "./GameQuestionAnswer.css"
import QcmAnswer from "./QcmAnswer";
import FreeAnswer from "./FreeAnswer";
import DccAnswer from "./DCCAnswer/DccAnswer";
import VfAnswer from "./VfAnswer";
import {Question} from "shared-types"

function renderComponent(mode: string, question: Question, socket: any, room_id : string, username: string, canAnswer: boolean, answerEvent?: string) {
    switch (mode) {
        case "QCM":
            return <QcmAnswer question={question} socket={socket} room_id={room_id} username={username} canAnswer={canAnswer} answerEvent={answerEvent}/>;
        case "FREE":
            return <FreeAnswer question={question} socket={socket} room_id={room_id} username={username} canAnswer={canAnswer} answerEvent={answerEvent}/>;
        case "Free":
            return <FreeAnswer question={question} socket={socket} room_id={room_id} username={username} canAnswer={canAnswer} answerEvent={answerEvent}/>;
        case "DCC":
            return <DccAnswer question={question} socket={socket} room_id={room_id} username={username} canAnswer={canAnswer} answerEvent={answerEvent}/>;
        case "VF":
            return <VfAnswer question={question} socket={socket} room_id={room_id} username={username} canAnswer={canAnswer} answerEvent={answerEvent}/>
        default:
            return <div>Mode non supporté</div>;
    }
}

/**
 * `answerEvent` : nom de l'événement socket émis à la validation d'une
 * réponse. Par défaut "answerToQuestion" (ancien système de jeu, jamais
 * implémenté serveur). Grid et Pick & Ban passent respectivement
 * "grid:answer" / "pickban:answer" pour être réellement traités.
 */
export default function GameQuestionAnswer({ question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer:boolean, answerEvent?: string }) {
    return (
        <>
            {renderComponent(question.mode, question, socket, room_id, username, canAnswer, answerEvent)}
        </>
    );
}