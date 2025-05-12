import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputLabel, Select, MenuItem, Button, Switch, FormControl,Checkbox, TextField, FormHelperText} from "@mui/material";
import { useSocket } from "../../context/socketContext";
import { Banner } from "../Banner/Banner";
import RoomLink from "../../tools/RoomLink";
import { Label } from "@mui/icons-material";
import makeRequest from "../../tools/requestScheme";
import { AuthContext } from "../../context/authentContext";

const Mode = ['Points', 'BR', 'Personalise']

export default function CreateRoom () {
    const [name, setName] = useState("");

    const [withRef, setWithRef] = useState(false);
    const [mode,setMode] = useState("Points");
    const [quizzIdForModePoints, setQuizzIdForModePoints] = useState<string>("");
    const [withPresentator, setWithPresentator] = useState(false);
    const [numberOfParticipantMax, setNumberOfParticipantMax] = useState(10);
    const [isPrivate, setIsPrivate] = useState(false);
    const [availableQuizz, setAvailableQuizz] = useState<any[]>();
    const [password, setPassword] = useState("");
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
      };
    

    const socket = useSocket();
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

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

    const handleCreate = () =>{
        console.log("on tente de créer une room");
        if (socket){
            if (name.trim().length>0){
            const selectedQuizz = availableQuizz?.find(q => q.quizz_id === quizzIdForModePoints);
            socket.emit("createRoom", {
                name : name,
                isPrivate: isPrivate,
                password: password,
                withPresentator: withPresentator,
                withRef: withRef,
                numberOfParticipantMax: numberOfParticipantMax,
                mode : mode,
                quizzForModePoints: selectedQuizz,
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

    const handleClose = () => {
        setAnchorEl(null);
    };
     
    const renderMore = () => {
        switch (mode) {
            case "Personalise": 
                return <div>Choisissez une emission</div>
            case "BR":
            case "Points":
                return (
                    <FormControl>
                        <InputLabel id="select-quizz-label">Choose a quizz</InputLabel>
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
        <div>
            <div>
                <TextField type="text" label="Nom de votre salon"value={name} onChange={(e) => setName(e.target.value)} required></TextField>
            </div>
            <div>
                <Switch
                    type='checkboxe'
                    checked={isPrivate}
                    className='isPrivate'
                    onClick={() => handleChangePrivate()}/>
                
                {isPrivate ? <TextField type="text" label="mot de passe du salon"value={password} onChange={(e) => setPassword(e.target.value)}required></TextField> : ""}
            </div>
            <div>
                <TextField type="number" label="Nbr participants Max." value={numberOfParticipantMax} onChange={(e)=>setNumberOfParticipantMax(Number(e.target.value))}/>
            </div>
            <div>
                <div>
                    <label>Avec un Présentateur (ne participe pas au jeu)</label>
                    <Checkbox
                        checked={withPresentator}
                        onClick={() => handlePresentator()}
                        />
                </div>
                <div>
                    <label>Avec un arbitre pour les réponses libre </label>
                    <Checkbox
                        checked={withRef}
                        onClick={() =>handleRef()}
                        />
                </div>
            </div>
            <div>
                <InputLabel id="demo-simple-select-label">Mode</InputLabel>
                <Select
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                value={mode || "mode"}
                label="Mode"
                onChange={(e) => {setMode(e.target.value); handleClose()}}
                >
                {Mode.map((mode: string) => (
                    <MenuItem key={mode} value={mode} >
                    {mode}
                    </MenuItem>
                ))}
                </Select>
                {renderMore()}
            </div>
            <div>
                <Button onClick={() => handleCreate()}>Créer le salon</Button>
            </div>
            
        </div>
    )
} 