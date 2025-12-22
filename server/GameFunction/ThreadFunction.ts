import getter from "../function/getter";
import room from "./room";
import { Socket } from "socket.io";


export default function threadSocket (io : any, socket : Socket & {user_id : number}) {
    socket.on("setMode", (data) => {
        const {room_id, username, mode} = data;
        console.log("on set le mode ", mode , "pour", socket.username);
        //room.setDccMode(room_id, username, mode)
    })

    socket.on("answerToQuestion", (data) => {
        room.answer(data, socket);
    })

    socket.on("startGame", (data)=> {
        console.log("on reçoit le start");
        room.start(data, io);
    })
}