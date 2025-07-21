import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputLabel, Select, MenuItem, Button, Switch, FormControl,Checkbox, TextField, Input} from "@mui/material";
import { useSocket } from "../../context/socketContext";

import makeRequest from "../../tools/requestScheme";
import { AuthContext } from "../../context/authentContext";
import "../../style/common.css"
import "./createRoom.css"



const Mode = ['Points', 'BR', 'Personalise']

export default function CreateRoom () {
    console.log("allô?")
    const [name, setName] = useState("");

    const [withRef, setWithRef] = useState(false);
    const [mode,setMode] = useState("Points");
    const [numberOfLife, setLife] = useState(3)
    const [quizzIdForModePoints, setQuizzIdForModePoints] = useState<string>("");
    const [withPresentator, setWithPresentator] = useState(false);
    const [numberOfParticipantMax, setNumberOfParticipantMax] = useState(10);
    const [isPrivate, setIsPrivate] = useState(false);
    const [availableQuizz, setAvailableQuizz] = useState<any[]>();
    const [password, setPassword] = useState("");
    const [selectedEmission, setSelectedEmission] = useState();

    

    const socket = useSocket();
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    const [username, setUsername] = useState(auth?.user?.Username ? auth.user.Username : "")

    useEffect(() => {
        if (socket){
            socket.on("roomCreated", (data)=>{
                console.log("on recoit : ", data);
                navigate(`/play/room/${data.roomId}`);

            })
        }
    }, [socket])

    useEffect(() => {
        const fun = async() => {
            let responseQuizz;
            let responseEmmission;
            let responseTag;
            if (auth?.user){
                responseQuizz = await makeRequest(`/quizz/available-quizz?id=${auth.user.id}`);
            } else {
                responseQuizz = await makeRequest('/quizz/available-quizz');
            }
            console.log(responseQuizz)
            if (responseQuizz.length > 0){
                setQuizzIdForModePoints(responseQuizz[0].quizz_id)
            }
            setAvailableQuizz(responseQuizz)
        }
        fun();

    }, []);

    const createEmission = async (mode : string) => {
        if (mode === "Points"){
            return {
                title: "randomPoints",
                creator: null,
                id : null,
                numberOfStep: 1,
                steps: [{
                    title: "Points",
                    quizz: quizzIdForModePoints,
                    mode: mode
                }]
            }
        } else if (mode === "BR"){
            return {
                title: "randomBr",
                creator: null,
                id : null,
                numberOfStep: 1,
                steps: [{
                    title: "Endurance",
                    quizz: quizzIdForModePoints,
                    mode: mode,
                    other :{lp: numberOfLife}
                }]
            }
        }
    }

    const handleCreate = async () =>{
        console.log("on tente de créer une room", username);
        if (socket){
            if (name.trim().length>0){
            const selectedQuizz = availableQuizz?.find(q => q.quizz_id === quizzIdForModePoints);
            socket.emit("createRoom", {
                name : name,
                isPrivate: isPrivate,
                creator: username,
                password: password,
                withPresentator: withPresentator,
                withRef: withRef,
                numberOfParticipantMax: numberOfParticipantMax,
                emission: selectedEmission ? selectedEmission : await createEmission(mode),
            })
            } else {
                alert("il faut un nom pour le salon");
            }
        }
    }
    
    const handleChangePrivate = () => {
        console.log("ça switch ou quoi la team", isPrivate);
        if (isPrivate){
            setIsPrivate(false);
        } else {
            setIsPrivate(true);
        }
    } 

    const handlePresentator = () => {
        if (withPresentator){
            setWithPresentator(false)
        } else {
            setWithPresentator(true)
        }
    }

    const handleRef = () => {
        if (withRef){
            setWithRef(false)
        } else {
            setWithRef(true)
        }
    }

     
    const renderMore = () => {
        switch (mode) {
            case "Personalise": 
                return <div>Choisissez une emission</div>
            case "BR":
                return (
                    <div className="flex-center row">
                    <FormControl>
                        <InputLabel id="select-quizz-label">Choisissez un quizz</InputLabel>
                        <Select
                            labelId="select-quizz-label"
                            id="select-quizz"
                            value={quizzIdForModePoints}
                            label="Choose a quizz"
                            onChange={(e) => setQuizzIdForModePoints(e.target.value)}
                        >
                            {availableQuizz?.map((quizz: any) => (
                            <MenuItem key={quizz.quizz_id} value={quizz.quizz_id}>
                                {quizz.title}
                            </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl>
                        <Input type="number" value={numberOfLife} onChange={(e)=>setLife(Number(e.target.value))}/>
                    </FormControl>
                    </div>

                ) 
            case "Points":
                return (
                    <FormControl>
                        <InputLabel id="select-quizz-label">Choisissez un quizz</InputLabel>
                        <Select
                            labelId="select-quizz-label"
                            id="select-quizz"
                            value={quizzIdForModePoints}
                            label="Choose a quizz"
                            onChange={(e) => setQuizzIdForModePoints(e.target.value)}
                        >
                            {availableQuizz?.map((quizz: any) => (
                            <MenuItem key={quizz.quizz_id} value={quizz.quizz_id}>
                                {quizz.title}
                            </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ) 
            default:
                break;

        }
    }
    

    useEffect(()=>{
        console.log(withPresentator,withRef)
    }, [withPresentator,withRef])




    return (
        <div className="flex-center gap border qv innergap">
            <div className="qv flex-center">
                <TextField className="qv" type="text" autoComplete="off" label="Nom de votre salon"value={name} onChange={(e) => setName(e.target.value)} required></TextField>
            </div>
            { !(auth?.user) && <TextField type="text" label="Votre nom dans la partie"value={username} onChange={(e) => setUsername(e.target.value)} required></TextField>}
            <div className="flex-center border center row largeGap innergap sx">
                <div><label>Salon privé ?</label>
                <Switch
                    type='checkboxe'
                    checked={isPrivate}
                    className='isPrivate'
                    onClick={() => handleChangePrivate()}/>
                </div>
                
                {isPrivate ? <TextField type="password" label="mot de passe du salon"value={password} onChange={(e) => setPassword(e.target.value)}required></TextField> : ""}
            </div>
            <div className="flex-center twoArea row largeGap innergap qv border">
                <div className="half flex-center qv">
                    <TextField type="number center qv" label="Nbr participants Max." value={numberOfParticipantMax} onChange={(e)=>setNumberOfParticipantMax(Number(e.target.value))}/>
                </div>
                <div className="half opt">
                    <div>
                        <label> - Avec un Présentateur (ne participe pas au jeu)</label>
                        <Checkbox
                            checked={withPresentator}
                            onClick={() => handlePresentator()}
                            />
                    </div>
                    <div>
                        <label>- Avec un arbitre pour les réponses libre </label>
                        <Checkbox
                            checked={withRef}
                            onClick={() =>handleRef()}
                            />
                    </div>
                </div>
            </div>
            <div className="qv border flex-center row innergap">
                <div className="flex-center quarter">
                <Select
                id="demo-simple-select"
                value={mode || "mode"}
                label="Mode"
                onChange={(e) => {setMode(e.target.value)}}
                >
                {Mode.map((mode: string) => (
                    <MenuItem key={mode} value={mode} >
                    {mode}
                    </MenuItem>
                ))}
                </Select></div>
                <div className="flex-center tquarter border innergap">{renderMore()}</div>
            </div>
            <div className="topgap">
                <Button className="createRoomButton innergap" variant="contained" onClick={() => handleCreate()}>Créer le salon</Button>
            </div>
            
        </div>
    )
} 