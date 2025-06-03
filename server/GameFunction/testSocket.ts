import getter from "../function/getter";
import room from "./room";
import { Socket } from "socket.io";

export const current: { [name: string |number]: string } = {};

export function normalizeText(str: string): string {
    return str
        .normalize("NFD")                  // décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, "")   // enlève les diacritiques (accents)
        .replace(/\s+/g, "")               // enlève tous les espaces
        .toLowerCase();                    // met tout en minuscule
}

export default function testSocket (io : any, socket : Socket & {user_id : number}) {
    socket.on("getQuestionTest",async ()=>{
        console.log("getQuestionTest appelé");
        const question = await getter.getQuestionById(25);
        //const question = {"_id":{"$oid":"6807c494dd38dffad0bb9849"},"author":{"$numberInt":"5"},"mode":"DCC","title":"À quel pays est rattaché l'archipel des galapagos","private":true,"played":{"$numberInt":"0"},"succeed":{"$numberInt":"0"},"tags":["Géographie"],"__t":"DCC","carre":[{"content":"Chili","answer_num":"1","_id":{"$oid":"67f58e800df69a5dcf83fe63"}},{"content":"Équateur","answer_num":"2","_id":{"$oid":"67f58e800df69a5dcf83fe64"}},{"content":"Papouasie-Nouvelle-Guinée","answer_num":"3","_id":{"$oid":"67f58e800df69a5dcf83fe65"}},{"content":"Royaume-Uni","answer_num":"4","_id":{"$oid":"67f58e800df69a5dcf83fe66"}}],"cash":["Équateur","équateur","Equateur","equateur","l'équateur","l'equateur"],"duo":{"$numberInt":"1"},"answer":{"$numberInt":"2"},"report":[],"question_id":{"$numberInt":"4"},"__v":{"$numberInt":"0"},"quizz":[]}
        //const question = {"_id":{"$oid":"6807c431dd38dffad0bb9848"},"author":{"$numberInt":"5"},"mode":"FREE","title":"Quand est mort le Pape François ?","private":true,"quizz":[],"played":{"$numberInt":"0"},"succeed":{"$numberInt":"0"},"tags":["Histoire"],"__t":"Free","answers":["21/04/2025","le 21 avril 2025","21 avril 2025"],"report":[],"question_id":{"$numberInt":"24"},"__v":{"$numberInt":"0"}}
        socket.emit("newQuestion", {question : question})
    })
    socket.on("answerToQcm", (data : any) => {
        data.answer === data.question.answer ? 
        socket.emit("show Answer", {answer : data.question.answer}) :
        socket.emit("show Answer", {answer : data.question.answer})
    })

    socket.on("answerToFree", (data : any)=>{
        let success = false;
        let normalizedUserAnswer = normalizeText(data.answer);

        data.question.answers.forEach((answer: string) => {
            const normalizedExpectedAnswer = normalizeText(answer);

            if (normalizedUserAnswer === normalizedExpectedAnswer) {
                success = true;
            }
        });

        if (success) {
            socket.emit("good answer");
        } else {
            socket.emit("wrong answer", { answer: data.question.answers[0] });
        }
    })

    socket.on("getDccMode", (data) => {
        const {room_id, username} = data;
        room.getDccMode(room_id, username)
    })

    socket.on("setMode", (data) => {
        const {room_id, username, mode} = data;
        console.log("on set le mode ", mode , "pour", socket.username);
        room.setDccMode(room_id, username, mode)
    })

    socket.on("answerToDccCash", (data : any)=>{
        let success = false;
        let normalizedUserAnswer = normalizeText(data.answer);

        data.question.cash.forEach((answer: string) => {
            const normalizedExpectedAnswer = normalizeText(answer);

            if (normalizedUserAnswer === normalizedExpectedAnswer) {
                success = true;
            }
        });

        if (success) {
            socket.emit("good answer");
        } else {
            socket.emit("wrong answer", { answer: data.question.cash[0] });
        }
    })

    socket.on("answerToDccCarre", (data : any) => {
        data.answer === data.question.answer ? 
        socket.emit("show Answer", {answer : data.question.answer}) :
        socket.emit("show Answer", {answer : data.question.answer})
    })

    socket.on("answerToDccDuo", (data : any) => {
        data.answer === data.question.answer ? 
        socket.emit("show Answer", {answer : data.question.answer}) :
        socket.emit("show Answer", {answer : data.question.answer})
    })

    socket.on("answerToVf", (data)=>{
        if ((data.answer === "vrai" && data.question.truth) || (data.answer === "faux" && (!data.question.truth)) ){
            socket.emit("good answer")
        } else {
            socket.emit("wrong answer", (data.question.truth))
        }
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
        await room.autoConnect(data, socket)
    })

    socket.on("answerToQuestion", (data) => {
        room.answer(data, socket);
    })

    socket.on("ping", (data)=>{
        room.ping(data, socket, io);
    })

    socket.on("startGame", (data)=> {
        console.log("on reçoit le start");
        room.start(data, io);
    })
}