import room from "./room";
import { Socket } from "socket.io";
import logger from "../utils/logger";

export const current: { [name: string |number]: string } = {};


export default function roomSocket (io : any, socket : Socket & {user_id : number}) {
    socket.on("createRoom",async (data) => {
        logger.debug("création de room");
        await room.create(data, socket, io);
    })

    socket.on("infoRoom", (roomId : string) => {
        logger.debug("demande des infos de la room ", roomId);
        room.getInfo(roomId, socket);
    })

    socket.on("tryConnect", (data)=>{
        room.connect(data, socket, io)
    })

    socket.on("autoConnect",async (data)=>{
        logger.debug(data)
        await room.autoConnect(data, socket, io)
    })

    // Écran /show (grand écran public, sans compte ni pseudo) : rejoint la
    // room en simple spectateur, jamais en tant que joueur.
    socket.on("showJoin", async (data) => {
        const room_id = String(data?.room_id ?? "");
        if (!room_id) return;
        await room.showJoin(room_id, socket);
    })

    socket.on("ping", (data)=>{
        room.ping(data, socket, io);
    })

    socket.on("disconnect", () => {
        room.disconnect(socket, io);
    })
}