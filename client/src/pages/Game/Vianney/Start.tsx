import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputLabel, Select, MenuItem, Button, Switch, FormControl,Checkbox, TextField} from "@mui/material";
import { useSocket } from "../../../context/socketContext";

export function Start () {
    const [listName, setListName] = useState<String[]>([]); 
    
    const removeName = (name : String) =>{
        setListName(listName.filter((nom) => nom != name))
    }

    const addName = (name : String) => {
        setListName([...listName, name])
    }

    const displayName = (name: String) => {
        return (
            <div>
                {name} <Button onClick={()=>{removeName(name)}} >X</Button>
            </div>
        )
    }

    const socket = useSocket();
    const startgame = () => {
        console.log("start")
        if (socket){
            console.log("on envoie")
            socket.emit("startvianney", listName)
        }
    }
    const Refresh = () => {
        console.log("refresh")
        if (socket){
            console.log("refresh")
            socket.emit("refresh")
        }
    }
    return (
        <div className="flex-center border qv">
            <input 
                type="text" 
                className='tagInput'
                onKeyDown={(e) => {
                    const inputElement = e.target as HTMLInputElement;
                    if (e.key === "Enter" && inputElement.value.trim()) {
                    addName(inputElement.value.trim());
                    inputElement.value = "";
                    }
                }} 
                placeholder="Ajouter un tag"
                /> 
            <div>
                {listName.map((name) => 
                    displayName(name)
                )}
            </div>


            <Button onClick={() => {startgame()}}>Commencer la partie</Button>
            <Button onClick={()=>{Refresh()}}>Reprendre la partie</Button>

        </div>
    )
}