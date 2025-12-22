
import { useState, useEffect } from "react";
import "../GameQuestionAnswer.css"
import PointReceiver from "./PointReceiver";
import BattleRoyalReceiver from "./BattleRoyalReceiver";


export default function QuestionReceiver({ socket, room_id, username }: {socket: any, room_id : string, username: string }) {
    const [mode, setMode] = useState("");
    socket.emit("Wich mode", room_id);
    useEffect(()=>{
        if (socket){
            socket.on("Mode", (mode : any) => {console.log(mode);setMode(mode)})
        }

    }, [socket])
    switch (mode){
        case "Points":
            return <PointReceiver socket={socket} room_id={room_id} username={username}/>
        case "BR":
            return <BattleRoyalReceiver socket={socket} room_id={room_id} username={username}/>
    }
}