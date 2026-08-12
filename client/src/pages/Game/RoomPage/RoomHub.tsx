import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import RoomLink from "../../../tools/RoomLink";
import { useSocket } from "../../../context/socketContext";
import { AuthContext } from "../../../context/authentContext";
import { Button, TextField } from "@mui/material";
import Room from "./Room";
//import { Clock } from "../../../component/Clock/Clock";
import { UsernameContext } from "../../../context/usernameContext";
import "./Room.css";


// Un joueur sans compte n'a rien qui survit à la fermeture de l'onglet : on
// mémorise son pseudo par salon pour pouvoir le reconnecter automatiquement
// (avec son score) s'il revient sur la même URL.
const roomUsernameKey = (room_id : string) => `quizzy_room_${room_id}_username`;

export default function RoomHub (){
    const {room_id} = useParams();
    const socket = useSocket();
    const auth = useContext(AuthContext);
    const uncontext = useContext(UsernameContext);
    const initialName = auth?.user
        ? auth.user.Username
        : (room_id ? localStorage.getItem(roomUsernameKey(room_id)) ?? "" : "");
    const [name, setName] = useState(initialName);
    // Figé au montage : sert uniquement à savoir si CE pseudo est déjà
    // enregistré dans le salon pour tenter une reconnexion automatique. Ne
    // doit pas suivre les frappes du joueur dans le champ "Choisissez votre
    // nom", sinon taper le pseudo de quelqu'un d'autre déclencherait une
    // tentative de reconnexion avant même d'avoir cliqué sur "Rejoindre".
    const [savedName] = useState(initialName);
    const [inGame, setInGame] = useState(false);
    const [password, setPassword] = useState("");
    const [roomName,setRoomName] = useState("");
    const [roomPrivate, setRoomPrivate] = useState(false);
    const [roomInfo, setRoomInfo] = useState<any>();
    // Distingue "pas encore connecté" de "salon inexistant" : sans ça, une
    // connexion socket qui échoue (CORS, tunnel down, réseau) affiche le même
    // message trompeur "Il n'y a pas de salon avec cette id".
    const [connected, setConnected] = useState(socket?.connected ?? false);
    const [connectError, setConnectError] = useState<string | null>(null);

    useEffect(() => {
        if (socket){
            socket.emit("infoRoom", room_id)
        }
        if (socket){
            socket.on("connect", () => {
                setConnected(true);
                setConnectError(null);
            });
            socket.on("disconnect", () => setConnected(false));
            socket.on("connect_error", (err) => {
                console.error("socket connect_error :", err.message);
                setConnectError(err.message);
            });
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

    useEffect(()=>{
        if (roomInfo && savedName){
            if (roomInfo.player[savedName]){
                // inGame passe à true via l'événement "connexion" (voir plus
                // haut) une fois que le serveur a confirmé la reprise —
                // autoConnect peut désormais être refusé (nom déjà repris par
                // un socket actif).
                socket?.emit("autoConnect", ({username : savedName, room_id:room_id}))
            }
        }
    },[roomInfo])

    console.log("roomHub montée");

    const joinRoom = () => {
        if (!auth?.user && room_id && name){
            localStorage.setItem(roomUsernameKey(room_id), name);
        }
        if (socket){
            socket.emit("tryConnect", ({
                room_id: room_id,
                player : name,
                userId : auth?.user ? auth.user.id : "not connected",
                password: password
            }))
        }
    }
    useEffect(()=>{
        if (uncontext){
            uncontext.setName(name);
        }
    },[name])

    if (!room_id){
        return (<div className="roomMissingPage">Cette page n'existe pas</div>)
    }

    if (connectError){
        return (<div className="roomMissingPage">Erreur de connexion au serveur : {connectError}</div>)
    }

    if (socket && connected){
        if (roomName){
            if (!inGame) {
                return (
                    <div className="roomPage">
                        <div className="roomContent">
                            <div className="roomJoinGrid">
                                <div className="roomJoinCard">
                                    <h1>{roomName}</h1>
                                    {roomPrivate && (
                                        <TextField
                                            type="password"
                                            label="Mot de passe du salon"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                    )}
                                    {auth?.user ? (
                                        <p className="roomJoinName">Votre nom dans la partie : <strong>{auth.user?.Username}</strong></p>
                                    ) : (
                                        <TextField
                                            type="text"
                                            label="Choisissez votre nom"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    )}
                                    <Button className="roomJoinButton" onClick={() => joinRoom()}>Rejoindre la partie</Button>
                                </div>
                                <RoomLink roomId={room_id} />
                            </div>
                        </div>
                    </div>
                )
            } else {
                return (<Room roomInfo={roomInfo} Username={name}></Room>)
            }
        } else {
            return (<div className="roomMissingPage">Il n'y a pas de salon avec cette id</div>)
        }
    } else {
        return (<div className="roomMissingPage">Connexion au serveur…</div>)
    }

}