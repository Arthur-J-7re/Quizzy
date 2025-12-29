import room from "./room";
import { Socket } from "socket.io";

export const current: { [name: string |number]: string } = {};


export default function roomSocket (io : any, socket : Socket & {user_id : number}) {
    socket.on("createRoom",async (data) => {
        console.log("création de room");
        await room.create(data, socket, io);
    })

    socket.on("infoRoom", (roomId : string) => {
        console.log("demande des infos de la room ", roomId);
        room.getInfo(roomId, socket);
    })

    socket.on("tryConnect", (data)=>{
        room.connect(data, socket, io)
    })

    socket.on("autoConnect",async (data)=>{
        console.log(data)
        await room.autoConnect(data, socket, io)
    })

    socket.on("ping", (data)=>{
        room.ping(data, socket, io);
    })
}