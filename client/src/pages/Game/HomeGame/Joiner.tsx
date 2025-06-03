import { Button, TextField } from "@mui/material";
import { Banner } from "../../../component/Banner/GameBanner"

import { useNavigate } from "react-router-dom"/*
import { useContext } from "react";
import { AuthContext } from "../../../context/authentContext";*/
import "../../CommonCss.css";
import "../../Home/Home.css"
import { useState } from "react";


export function Joiner () {
    const navigate = useNavigate();
    const [room_id, setRoom_Id] = useState("")
    return (
    <div className="homeContainer">
        <Banner></Banner>
        <div className="boutonDisplay">
            <TextField value={room_id} onChange={(e) => {setRoom_Id(e.target.value)}}/>
            <Button onClick={() => {navigate(`/play/room/${room_id}`)}}>Rejoindre le salon</Button>
        </div>
    </div> 
)
}