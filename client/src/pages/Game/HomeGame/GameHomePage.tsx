import { Button, TextField } from "@mui/material";
import { Banner } from "../../../component/Banner/GameBanner"

import { useNavigate } from "react-router-dom"/*
import { useContext } from "react";
import { AuthContext } from "../../../context/authentContext";*/
import "../../CommonCss.css";
import "../../Home/Home.css"
import { useState } from "react";

export function GameHome () {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState("");
    return (
    <div className="homeContainer">
        <Banner></Banner>
        <div className="boutonDisplay">
            <Button className="bouton" onClick={() => {navigate("/play/test")}}>Créer un salon</Button>
            <div className="joinRoom">
                <Button className="bouton" onClick={() => {navigate("/play")}}>Rejoindre un salon</Button>
            </div>
        </div>
    </div> 
)
}