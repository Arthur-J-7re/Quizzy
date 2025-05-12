import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import RoomLink from "../../../tools/RoomLink";
import { useSocket } from "../../../context/socketContext";
import { AuthContext } from "../../../context/authentContext";
import { TextField, Button } from "@mui/material";


export default function Room ({roomInfo, Username} : {roomInfo : any, Username : string}){
    console.log("roomInfo dans le composant : ", roomInfo)
    const {id} = useParams();
    if (!id){
        return(<div>Cette page n'existe pas</div>)
    }
    const socket = useSocket();
    const auth = useContext(AuthContext);
    const [username, setUsername] = useState(Username);
    const [password, setPassword] = useState("");
    const [roomName,setRoomName] = useState(roomInfo.name);
    const [roomPrivate, setRoomPrivate] = useState(false);

    useEffect(() => {
        /*if (socket){
            socket.emit("infoRoom", id)
        }*/
        if (socket){
            socket.on("infoRoom", (data) => {
                console.log("infoRoom : ", data);
                setRoomName(data.name);
                setRoomPrivate(data.isPrivate);
            })
            socket.on("ping", (data : any)=>{
                alert("vous avez été ping par : " + data.name);
                console.log("vous avez été ping par : ", data.name)
            })
            socket.on("aPlayerHasJoined", (data) => {
                alert(data.name + "est dans la partie");
            })
        }
    },[socket])

    const ping = () => {
        socket?.emit("ping", {id : id, username : username})
    }
    if (auth)



    if (roomName){
        return (
            <div>
                <div>{roomName}</div>
                <div>Votre nom inGame : {username}</div>
                <Button onClick={() => ping()}> ping les autres personne</Button>
                <RoomLink roomId={id} />
            </div> 
                
        )
    } else {
        return (<div>Il n'y a pas de salon avec cette id</div>)
    }
    
}