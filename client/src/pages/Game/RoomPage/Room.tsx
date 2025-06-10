import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import RoomLink from "../../../component/Tools/RoomLink";
import { useSocket } from "../../../context/socketContext";
import { AuthContext } from "../../../context/authentContext";
import { Button } from "@mui/material";
import QuestionReceiver from "../../../component/GameQuestionAnswer/QuestionReceiver";


export default function Room ({roomInfo, Username} : {roomInfo : any, Username : string}){
    console.log("roomInfo dans le composant : ", roomInfo)
    const {id} = useParams();
    if (!id){
        return(<div>Cette page n'existe pas</div>)
    }
    const socket = useSocket();
    const auth = useContext(AuthContext);
    const username = Username;

    const [roomName,setRoomName] = useState(roomInfo.name);
    const [room, setRoom] = useState({room_id:id, name: roomInfo.name, player: roomInfo.player });
    const [isCreator, setIsCreator] = useState(false);
    const [inGame, setInGame] = useState(false)

    useEffect(() => {
        /*if (socket){
            socket.emit("infoRoom", id)
        }*/
        if (socket){
            socket.on("infoRoom", (data) => {
                console.log("infoRoom : ", data);
                setRoomName(data.name);
                setRoom({room_id:data.room_id, name:data.name, player:data.player});
            })
            socket.on("ownerOfRoom", () => {
                console.log("y a le bouton là?");
                setIsCreator(true);
            })
            socket.on("ping", (data : any)=>{
                alert("vous avez été ping par : " + data.name);
                console.log("vous avez été ping par : ", data.name)
            })
            socket.on("aPlayerHasJoined", (data) => {
                alert(data.name + "est dans la partie");
            })
            socket.on("Starting game", (data) => {
                setInGame(true);
            })
        }
    },[socket])

    const ping = () => {
        socket?.emit("ping", {id : id, username : username})
    }

    const startGame = () => {
        if (socket){ 
            console.log("ça start là", room);
            socket.emit("startGame", ({username : username, room_id: room.room_id}))
        }
    }
    if (auth)



    if (roomName){
        return (
            inGame ? 
            <div>
                <QuestionReceiver socket={socket} room_id={id} username={username}/>
            </div>
            :
            <div>
                <div>{roomName}</div>
                <div>Votre nom inGame : {username}</div>
                <Button onClick={() => ping()}> ping les autres personne</Button>
                <RoomLink roomId={id} />
                {isCreator && <Button onClick={()=>startGame()}>Commencer la partie</Button>}
            </div> 
        )
    } else {
        return (<div>Il n'y a pas de salon avec cette id</div>
            /*<Button onClick={() => nav("/createRoom")}>Créer votre propre salon</Button>*/
        )
    }
    
}