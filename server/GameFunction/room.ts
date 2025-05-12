import { stringify } from "querystring";


interface User  {name:string, socketId:string | number, id?:number, hasAnswered:boolean, answer:any , score:number}
interface Room { name: string,mode: string, isPrivate: boolean, password:string,questions: number[],withRefe : boolean, withPresentator: boolean,numberOfParticipantMax : number, player: {[name : string]: User} }
const rooms: {[roomId: string]: Room} = {};

const create = async (data : any, socket : any) => {
    if (data && data.quizzForModePoints && data.quizzForModePoints.questions){
        const id = Math.round(Math.random()*100000000000)
        rooms[id] = {...data, player:{}, questions:data.quizzForModePoints.questions};
        //console.log("la room crée ressemble à ça", rooms[id]);
        socket.emit("roomCreated", ({
            roomId : String(id)
        }))
    }
}

const getInfo = (roomId : string, socket : any) => {
    console.log(rooms[roomId]);
    socket.emit("infoRoom", rooms[roomId]);
}

const connect = (data: any, socket: any, io : any) => {
    if (!rooms[data.id]){
        socket.emit("connexion", ({success : false, message: "No room with this id."}))
    } 
    if (data.password.length > 0){
        if (!rooms[data.id].isPrivate){
            socket.emit("connexion",({success : false, message: "This room doesn't need a password."}))
        }
        else if (rooms[data.id].password === data.password){
            joinRoom(socket,data, io);
        } else {
            socket.emit("connexion", ({success: false, message: "Mauvais mot de passe."}))
        }
    } 
    else {
        if (rooms[data.id].isPrivate){
            socket.emit("connexion", ({success:false, message : "This room need a password."}))
        } else {
            joinRoom(socket,data, io);
        }
    }
}

const joinRoom = async (socket : any, data : any, io : any) => {
    console.log("dans join room");
    const room = rooms[data.id];
    if (room && Object.keys(room.player).length < room.numberOfParticipantMax){
        const user_id = data.userId;
        const name = data.player;
        let newUser;
        String(user_id) === user_id ? 
        newUser = {
            name : name, 
            socketId : socket.id,
            hasAnswered : false,
            answer : "",
            score : 0
        } : 
        newUser = {
            name : name, 
            socketId : socket.id,
            id : user_id,
            hasAnswered : false,
            answer : "",
            score : 0
        }  
        console.log("le newUser", newUser)
        room.player[name] = newUser;
        socket.room_id = data.id;
        await socket.join(data.id);
        const roomSize = io.sockets.adapter.rooms.get(data.id)?.size || 0;
        console.log(`Il y a ${roomSize} joueurs connectés.`);
        socket.to(data.id).emit("aPlayerHasJoined", ({name : name}))
        socket.emit("connexion", ({success :true}))
    } else {
        socket.emit("connexion", ({success : false, message : "Le salon est plein" + Object.keys(room.player).length}))
    }
        
}

const ping = async (data : any,socket :any, io : any) => {
    console.log("on tente de ping");
    let id = data.id;
    if (id && rooms[id]){
        socket.to(id).emit("ping", ({name : data.username}));
        console.log("le ping est partie pour la room : ", id)
    }
}

export default {create, getInfo, connect,ping};