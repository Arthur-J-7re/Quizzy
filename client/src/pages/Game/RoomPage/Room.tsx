import { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import RoomLink from "../../../tools/RoomLink";
import { useSocket } from "../../../context/socketContext";
import { AuthContext } from "../../../context/authentContext";
import { Button } from "@mui/material";
import QuestionReceiver from "../../../component/GameQuestionAnswer/Mode/QuestionReceiver";


export default function Room ({roomInfo, Username} : {roomInfo : any, Username : string}){

    console.log("roomInfo dans le composant : ", roomInfo)
    const {room_id} = useParams();
    if (!room_id){
        return(<div>Cette page n'existe pas</div>)
    }
    const socket = useSocket();
    const auth = useContext(AuthContext);
    const username = Username;

    const [roomName,setRoomName] = useState(roomInfo.name);
    const [player, setPlayer] = useState(Object.keys(roomInfo.player) || [Username]);
    const [room, setRoom] = useState({room_id:room_id, name: roomInfo.name, emission: roomInfo.emission, numberOfParticipantMax: roomInfo.numberOfParticipantMax });
    const [isCreator, setIsCreator] = useState(false);
    const [inGame, setInGame] = useState(false)

    useEffect(() => {
        if (socket){
            socket.emit("infoRoom", room_id)
        }
        if (socket){
            socket.on("infoRoom", (data) => {
                console.log("infoRoom : ", data);
                setRoomName(data.name);
                setPlayer(Object.keys(data.player))
                setRoom({room_id:data.room_id, name:data.name, emission: data.emission, numberOfParticipantMax: data.numberOfParticipantMax});
            })
            socket.on("ownerOfRoom", () => {
                console.log("y a le bouton là?");
                setIsCreator(true);
            })
            socket.on("aPlayerHasJoined", (data) => {
                console.log(data)
                setPlayer([...player,data.name]);
                alert(data.name + "est dans la partie");
            })
            socket.on("Starting game", () => {
                setInGame(true);
            })
        }
    },[socket])

    const startGame = () => {
        if (socket){ 
            console.log("ça start là", room);
            socket.emit("startGame", ({username : username, room_id: room.room_id}))
        }
    }

    const renderEmission = () => {
        return (
            <div>
                {room.emission.title}
            </div>
        )
    }

    const renderPlayerList = () => {
        return(
            <div className="flex-center border innergap qv left-column">
                {player.map((name : string)=>{
                    return (<p className={name === username ? "blue-name" : ""}>- {name} {name === username ? "(vous)" : ""}</p>)
                })}

            </div>
        )
    } 

    const renderPage = () => {
        return (
        <div className="flex-center border innergap gap qv fullHeight">
            <div>Bienvenue dans le Salon : {roomName}</div>
            <div>{renderEmission()}</div>
            <div className="flex-center row">
                <div className="flex-center third border innergap">
                    <div>Votre nom inGame : {username}</div>
                    {renderPlayerList()}
                    {isCreator && <Button onClick={()=>startGame()}>Commencer la partie</Button>}
                </div>
                <div className="tthird">
                    <RoomLink roomId={room_id} />
                </div>
            </div>
        </div> )
    }
    if (auth)



    if (roomName){
        return (
            inGame ? 
            <div>
                <QuestionReceiver socket={socket} room_id={room_id} username={username}/>
            </div>
            :
            renderPage()
        )
    } else {
        return (<div>Il n'y a pas de salon avec cette id</div>
            /*<Button onClick={() => nav("/createRoom")}>Créer votre propre salon</Button>*/
        )
    }
    
}