import getter from "../function/getter";
import room from "./room";
import { Socket } from "socket.io";

export const current: { [name: string |number]: string } = {};


export default function roomSocket (io : any, socket : Socket & {user_id : number}) {
    socket.on("getQuestionTest",async ()=>{
        console.log("getQuestionTest appelé");
        const question = await getter.getQuestionById(25);
        //const question = {"_id":{"$oid":"6807c494dd38dffad0bb9849"},"author":{"$numberInt":"5"},"mode":"DCC","title":"À quel pays est rattaché l'archipel des galapagos","private":true,"played":{"$numberInt":"0"},"succeed":{"$numberInt":"0"},"tags":["Géographie"],"__t":"DCC","carre":[{"content":"Chili","answer_num":"1","_id":{"$oid":"67f58e800df69a5dcf83fe63"}},{"content":"Équateur","answer_num":"2","_id":{"$oid":"67f58e800df69a5dcf83fe64"}},{"content":"Papouasie-Nouvelle-Guinée","answer_num":"3","_id":{"$oid":"67f58e800df69a5dcf83fe65"}},{"content":"Royaume-Uni","answer_num":"4","_id":{"$oid":"67f58e800df69a5dcf83fe66"}}],"cash":["Équateur","équateur","Equateur","equateur","l'équateur","l'equateur"],"duo":{"$numberInt":"1"},"answer":{"$numberInt":"2"},"report":[],"question_id":{"$numberInt":"4"},"__v":{"$numberInt":"0"},"quizz":[]}
        //const question = {"_id":{"$oid":"6807c431dd38dffad0bb9848"},"author":{"$numberInt":"5"},"mode":"FREE","title":"Quand est mort le Pape François ?","private":true,"quizz":[],"played":{"$numberInt":"0"},"succeed":{"$numberInt":"0"},"tags":["Histoire"],"__t":"Free","answers":["21/04/2025","le 21 avril 2025","21 avril 2025"],"report":[],"question_id":{"$numberInt":"24"},"__v":{"$numberInt":"0"}}
        socket.emit("newQuestion", {question : question})
    })

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