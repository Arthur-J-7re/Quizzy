import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputLabel, Select, MenuItem, Button, Switch, FormControl,Checkbox, TextField} from "@mui/material";
import { useSocket } from "../../../context/socketContext";
import { setDefaultHighWaterMark } from "stream";
import { Start } from "./Start";
import { VianneyGame } from "./VianneyGame";
export function Vianney () {
    const socket = useSocket();
    const [started,setStarted] = useState(false);
    const [data, setData] = useState();

    useEffect(()=>{
        if( socket){
            socket.on("started", (data)=>{
                console.log(data);
                setStarted(true);
                setData(data);
            })
            socket.on("refresh", (data)=>{
                setStarted(true);
                setData(data)
            })
        }

    }, [socket])
    return (
        <>{started ? <VianneyGame data={data} /> : <Start/>}</>
    )
}