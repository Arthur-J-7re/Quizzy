import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import RoomLink from "../../../tools/RoomLink";
import { useSocket } from "../../../context/socketContext";
import { AuthContext } from "../../../context/authentContext";
import { Button, TextField } from "@mui/material";
import Room from "./Room";


export default function RoomHub (){
    const {id} = useParams();
    if (!id){
        return(<div>Cette page n'existe pas</div>)
    } else {
        console.log(id);
    }
    const socket = useSocket();
    const auth = useContext(AuthContext);
    const [name, setName] = useState(auth?.user ? auth.user.Username : "");
    const [inGame, setInGame] = useState(false);
    const [password, setPassword] = useState("");
    const [roomName,setRoomName] = useState("");
    const [roomPrivate, setRoomPrivate] = useState(false);
    const [roomInfo, setRoomInfo] = useState<any>();

    useEffect(() => {
        if (socket){
            socket.emit("infoRoom", id)
        }
        if (socket){
            socket.on("infoRoom", (data) => {
                console.log("infoRoom : ", data);
                setRoomInfo(data);
                setRoomName(data.name);
                setRoomPrivate(data.isPrivate);
            });
            socket.on("connexion", (data)=>{
                if (data.success){
                    console.log("on set le ingame");
                    setInGame(true)
                } else {
                    alert(data.message)
                }
            })
        }
    },[socket]);

    console.log("roomHub montée");

    const joinRoom = () => {
        if (socket){
            socket.emit("tryConnect", ({
                id: id,
                player : name,
                userId : auth?.user ? auth.user.id : "not connected",
                password: password
            }))
        }
    }
    if (auth)


    if (socket){ 
        if (roomName){
            if (!inGame) {
                return (
                    <div>
                        <div>{roomName}</div>
                        {
                            roomPrivate ? <TextField type="password" value={password} onChange={(e) => setPassword(e.target.value)}></TextField>: ""
                        }
                        
                        {
                            auth.user ? <div>le nom {auth.user?.Username}</div>: <TextField type="text" label="choisissez votre nom" value={name} onChange={(e) => setName(e.target.value)} ></TextField>
                        }
                        <Button onClick={() => joinRoom()}>Rejoindre la partie</Button>
                        <RoomLink roomId={id} />
                    </div> 
                        
                )
            } else {
                {console.log("on utilise le composant Room")}
                return (<Room roomInfo={roomInfo} Username={name}></Room>)
            }
        } else {
            return (<div>Il n'y a pas de salon avec cette id</div>)
        }
    } else {
        return (<div>pas de socket</div>)
    }
    
}