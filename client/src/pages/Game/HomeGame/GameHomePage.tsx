import { Button } from "@mui/material";
import { Banner } from "../../../component/Banner/GameBanner"
import { useNavigate } from "react-router-dom"/*
import { useContext } from "react";
import { AuthContext } from "../../../context/authentContext";*/
import "../../CommonCss.css";
import "../../Home/Home.css"

export function GameHome () {
    const navigate = useNavigate();
    return (
    <div className="homeContainer">
        <Banner></Banner>
        <div className="boutonDisplay">
            <Button className="bouton" onClick={() => {navigate("/play/test")}}>Créer un salon</Button>
            <Button className="bouton" onClick={() => {navigate("/play")}}>Rejoindre un salon</Button>
        </div>
    </div> 
)
}