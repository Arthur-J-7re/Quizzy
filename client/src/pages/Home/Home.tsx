import { Button } from "@mui/material";
import { Banner } from "../../component/Banner/Banner"
import { useNavigate } from "react-router-dom"
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext";
import "../CommonCss.css";
import "./Home.css"

export function Home () {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    return (
    <div className="homeContainer">
        <Banner></Banner>
        <div className="welcome">Bienvenue sur QUIZZY !! L'outil de création de quizz</div>
        <div className="presentation">Vous pouvez d'ores et déjà créer vos propres questions et quizz en vous connectant, pour ce qui est de jouer c'est encore en développement donc pas encore disponible {":'("}</div>
        <div className="boutonDisplay">
            <Button className="bouton" onClick={()=>{(auth && auth.user) ? navigate("/create-a-question") : navigate("/login")}}>Créer une question</Button>
            <Button className="bouton" onClick={() => {(auth && auth.user) ? navigate("/create-a-quizz") : navigate("/login")}}>Créer un quizz</Button>
            <Button className="bouton" onClick={() => {navigate("/play")}}>Jouer ?</Button>
        </div>
    </div> 
)
}