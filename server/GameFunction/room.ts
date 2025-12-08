import { stringify } from "querystring";
import questions from "../Collection/questions";
import ThreadPoints from "../Class/Thread/threadPoints";
import Thread from "../Class/Thread/Thread";
import { stat } from "fs";
import ThreadBr from "../Class/Thread/ThreadBr";

interface Step {mode : string,quizz : any, place : number, keep : boolean, last : boolean, played : boolean}

interface User  {name:string, role : string,socketId:string, id?:number, hasAnswered:boolean, answer:any , score:number, life : number, connected: boolean}
interface Room { room_id: number | string,name: string,creator:string, isPrivate: boolean, password:string,emission:any,currentQuestion: number,withRef : boolean, withPresentator: boolean,numberOfParticipantMax : number, player: {[name : string]: User}, defaultLife : number }

const rooms: {[roomId: string]: {room : Room, thread : Thread}} = {};

const create = async (data : any, socket : any, io : any) => {
    console.log("ça create avec cette data : ", data);
    if (data ){
        let id = Math.round(Math.random()*100000000000)
        while(rooms[id]){
            id = Math.round(Math.random()*100000000000);
        }
        if (data.emission){
            const newRoom = {...data,room_id : id, player:{},creator:data.creator, emission: data.emission, currentQuestion:0};
            const newThread = createThread(newRoom);
            if (newThread)
            rooms[id] = {room : newRoom, thread : newThread};
        }
        console.log("la room crée ressemble à ça", rooms[id]);
        socket.emit("roomCreated", ({
            roomId : String(id)
        }))
    }
}

const createThread = (room : Room) => {
    if (room && room.emission){
        if (room.emission.id){
            return 
        } else {
            switch(room.emission.title){
                case "randomPoints":
                    return new ThreadPoints(room)
                case "randomBr":
                    return new ThreadBr(room)
            }
        }
    }
}

const getInfo = async (roomId : string, socket : any) => {
    if (rooms[roomId]){
        //console.log(rooms[roomId]); 
        socket.emit("infoRoom", rooms[roomId].room);
        const question = rooms[roomId].thread.getCurrentQuestion();
        if (question){
            socket.emit("Starting game");
            await new Promise(r => setTimeout(r, 200));
            socket.emit("newQuestion", {question :question, canAnswer: false})
        }
    }
}

const connect = (data: any, socket: any, io : any) => {
    if (!rooms[data.room_id]){
        socket.emit("connexion", ({success : false, message: "No room with this id."}))
    } 
    if (data.password.length > 0){
        if (!rooms[data.room_id].room.isPrivate){
            socket.emit("connexion",({success : false, message: "This room doesn't need a password."}))
        }
        else if (rooms[data.room_id].room.password === data.password){
            joinRoom(socket,data, io);
        } else {
            socket.emit("connexion", ({success: false, message: "Mauvais mot de passe."}))
        }
    } 
    else {
        if (rooms[data.room_id].room.isPrivate){
            socket.emit("connexion", ({success:false, message : "This room need a password."}))
        } else {
            joinRoom(socket,data, io);
        }
    }
}

const autoConnect = async (data:any, socket: any, io : any) => {
    const {username, room_id}= data;
    const room = rooms[room_id];
    if (room){
        const player = room.room.player;
        if (player && player[username]){
            player[username].socketId = socket.id;
            player[username].connected = true;
            await socket.join(room_id);
            socket.room_id = data.room_id;
            socket.username = username;
            console.log(username, "connecté à la room ",room_id )
            if (player[username].role === "creator"){
                socket.emit("ownerOfRoom");
            }
        }
    }
}

const createUser = async (socket: any, data : any, io : any, room : Room, role : string) => {
    const user_id = data.userId;
        const name = data.player;
        let newUser;
        String(user_id) === user_id ? 
        newUser = {
            name : name, 
            role:role,
            socketId : socket.id,
            hasAnswered : false,
            answer : "",
            score : 0,
            life :room.defaultLife,
            connected: true
        } : 
        newUser = {
            name : name, 
            role:role,
            socketId : socket.id,
            id : user_id,
            hasAnswered : false,
            answer : "",
            score : 0,
            life : room.defaultLife,
            connected:true
        }  
        console.log("le newUser", newUser)
        if(newUser.name){
            room.player[name] = newUser;
            socket.room_id = data.room_id;
            socket.username = name;
            await socket.join(data.room_id);
            const roomSize = io.sockets.adapter.rooms.get(data.room_id)?.size || 0;
            console.log(`Il y a ${roomSize} joueurs connectés.`);
            socket.to(data.room_id).emit("aPlayerHasJoined", ({name : name}))
            socket.emit("connexion", ({success :true}))
        }
}

const joinRoom = async (socket : any, data : any, io : any) => {
    console.log("dans join room", data);
    const room = rooms[data.room_id];
    if (room && room.room.creator === data.player ){
        await createUser(socket, data, io, room.room, "creator");
        socket.emit("ownerOfRoom");
    }else if (room && Object.keys(room.room.player).length < room.room.numberOfParticipantMax){
        await createUser(socket,data,io,room.room,"player");
    } else {
        socket.emit("connexion", ({success : false, message : "Le salon est plein" + Object.keys(room.room.player).length}))
    }  
}

const start = async (data : any, io : any) => {
    console.log("dans le start de room.ts", data);
    if (data && data.username && data.room_id){
        console.log("on cherche le thread");
        console.log(rooms,rooms[data.room_id]);
        const thread = rooms[data.room_id].thread;
        console.log("ça envoie chez thread");
        thread.start(data.username);
    }
}

const answer = (data : any, socket: any) => {
    //console.log("answer de room avec ", data);
    const id = socket.room_id;
    //console.log("l'id dans la socket c'est ", id, "alors que dans data c'est", data.room_id)
    if (!(data.room_id && data.room_id === id && data.answer && data.question && data.username)){
        return;
    }
    if (rooms[id]){
        console.log("on envoie vers answer de tehread");
        rooms[id].thread.answer(data);
    } 
}

const ping = async (data : any,socket :any, io : any) => {
    console.log("on tente de ping");
    let id = data.room_id;
    if (id && rooms[id]){
        socket.to(id).emit("ping", ({name : data.username}));
        console.log("le ping est partie pour la room : ", id)
    }
}

const getDccMode = async (room_id : string, username : string) =>{
    const room = rooms[room_id];
    if (room){
        const retour = room.thread.getDccMode(username)
        console.log("le mode est",retour);
        return retour
    }
}

const setDccMode = async (room_id :string, username:string, mode: string) => {
    const room = rooms[room_id];
    if (room){
        room.thread.setDccMode(username, mode)
    }
}

const getGameMode = (room_id : number) => {
    var room = rooms[room_id];
    if (room){
        const mode = room.thread.getGameMode();
        console.log("room : ",mode)
        return mode;
    }
}

export default {create, getInfo, connect,ping,start,answer, autoConnect, getDccMode, setDccMode, getGameMode};