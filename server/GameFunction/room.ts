import Room from "../Class/Room";
import createId from "../utils/createId";

const rooms = new Map<string, Room>();

const create = async (data : any, socket : any, io : any) => {
    console.log("ça create avec cette data : ", data);
    if (data){
        let roomId = createRoomId();
        if (data.emission){
            const newRoom = new Room(roomId, data.name, data.creator, data.isPrivate,
                data.password, data.emission, data.withRef, data.withPresentator, data.numberOfParticipantMax, {},
                deleteRoom
            );
            rooms.set(roomId, newRoom);
        }
        console.log("la room crée ressemble à ça", rooms.get(roomId)); 
        socket.emit("roomCreated", ({
            roomId : String(roomId)
        }))
    }
}

const createRoomId = () : string => {
    var roomId = createId();
    while (rooms.has(roomId)){
        roomId = createId();
    }
    return roomId;
}

const getInfo = async (roomId : string, socket : any) => {
    const room = rooms.get(roomId);
    if (room){
        //console.log(rooms[roomId]); 
        socket.emit("infoRoom", room.getInfo());
        const question = room.getThread().getCurrentQuestion();
        if (question){
            socket.emit("Starting game");
            await new Promise(r => setTimeout(r, 200));
            socket.emit("newQuestion", {question :question, canAnswer: false})
        }
    }
}

const connect = (data: any, socket: any, io : any) => {
    const room = rooms.get(data.room_id);
    if (!room){
        socket.emit("connexion", ({success : false, message: "No room with this id."}));
        return;
    } 
    if (data.password.length > 0){
        if (!room.isPrivate){
            socket.emit("connexion",({success : false, message: "This room doesn't need a password."}))
        }
        else if (room.password === data.password){
            joinRoom(socket,data, io);
        } else {
            socket.emit("connexion", ({success: false, message: "Mauvais mot de passe."}))
        }
    } 
    else {
        if (room.isPrivate){
            socket.emit("connexion", ({success:false, message : "This room need a password."}))
        } else {
            joinRoom(socket,data, io);
        }
    }
}

const autoConnect = async (data:any, socket: any, io : any) => {
    const {username, room_id}= data;
    const room = rooms.get(room_id);
    if (room){
        const player = room.players;
        if (player && player[username]){
            player[username].socketId = socket.id;
            player[username].connected = true;
            await socket.join(room_id);
            socket.data.room_id = data.room_id;
            socket.data.username = username;
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
        life :0,//à changer ici
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
        life : 0,//à changer ici
        connected:true
    }  
    console.log("le newUser", newUser)
    if(newUser.name){
        room.addPlayer(newUser);
        socket.data.room_id = data.room_id;
        socket.data.username = name;
        await socket.join(data.room_id);
        const roomSize = io.sockets.adapter.rooms.get(data.room_id)?.size || 0;
        console.log(`Il y a ${roomSize} joueurs connectés.`);
        socket.to(data.room_id).emit("aPlayerHasJoined", ({name : name}))
        socket.emit("connexion", ({success :true}))
    }
}

const joinRoom = async (socket : any, data : any, io : any) => {
    console.log("dans join room", data);
    const room = rooms.get(data.room_id);
    if (room && room.getCreator() === data.player ){
        await createUser(socket, data, io, room, "creator");
        socket.emit("ownerOfRoom");
    }else if (room && Object.keys(room.getPlayers()).length < room.numberOfParticipantMax){
        await createUser(socket,data,io,room,"player");
    } else if (room){
        socket.emit("connexion", ({success : false, message : "Le salon est plein" + Object.keys(room.getPlayers()).length}))
    }  
}

const start = async (data : any, io : any) => {
    console.log("dans le start de room.ts", data);
    if (data && data.username && data.room_id){
        console.log("on cherche le thread");
        console.log(rooms, rooms.get(data.room_id));
        const room = rooms.get(data.room_id);
        if (!room){
            return;
        }
        const thread = room.getThread();
        console.log("ça envoie chez thread");
        thread.start(data.username);
    }
}

const answer = (data : any, socket: any) => {
    const id = socket.room_id;
    if (!(data.room_id && data.room_id === id && data.answer && data.question && data.username)){
        return;
    }
    const room = rooms.get(data.room_id);
    if (room){
        console.log("on envoie vers answer de tehread");
        room.getThread().receive(data);
    } 
}

const deleteRoom = (room_id : string) => {
    rooms.delete(room_id);
}

const ping = async (data : any,socket :any, io : any) => {
    console.log("on tente de ping");
    let id = data.room_id;
    const room = rooms.get(id);
    if (id && room){
        socket.to(id).emit("ping", ({name : data.username}));
        console.log("le ping est partie pour la room : ", id)
    }
}

/*const getDccMode = async (room_id : string, username : string) =>{
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
}/**/


export default {create, getInfo, connect,ping,start,answer, autoConnect, /*getDccMode, setDccMode, getGameMode*/};