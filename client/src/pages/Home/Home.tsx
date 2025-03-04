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
        <div className="boutonDisplay">
            <Button className="bouton" onClick={()=>{(auth && auth.user) ? navigate("/create-a-question") : navigate("/login")}}>Créer une question</Button>
            <Button className="bouton" onClick={() => {(auth && auth.user) ? navigate("/create-a-quizz") : navigate("/login")}}>Créer un quizz</Button>
        </div>
    </div> 
)
}