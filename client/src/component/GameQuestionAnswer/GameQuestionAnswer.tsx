
import "./GameQuestionAnswer.css"
import QcmAnswer from "./QcmAnswer";
import FreeAnswer from "./FreeAnswer";
import DccAnswer from "./DCCAnswer/DccAnswer";
import VfAnswer from "./VfAnswer";


function renderComponent(mode: string, question: any, socket: any, room_id : string, username: string) {
    switch (mode) {
        case "QCM":
            return <QcmAnswer question={question} socket={socket} room_id={room_id} username={username}/>;
        case "FREE":
            return <FreeAnswer question={question} socket={socket} room_id={room_id} username={username}/>;
        case "Free":
            return <FreeAnswer question={question} socket={socket} room_id={room_id} username={username}/>;
        case "DCC":
            return <DccAnswer question={question} socket={socket} room_id={room_id} username={username}/>;
        case "VF":
            return <VfAnswer question={question} socket={socket} room_id={room_id} username={username}/>
        default:
            return <div>Mode non supporté</div>;
    }
}

export default function GameQuestionAnswer({ question, socket, room_id, username }: { question: any, socket: any, room_id : string, username: string }) {
    return (
        <>
            {renderComponent(question.mode, question, socket, room_id, username)}
        </>
    );
}