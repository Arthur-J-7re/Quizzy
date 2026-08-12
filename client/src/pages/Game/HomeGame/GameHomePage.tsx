import { Button } from "@mui/material";
import { Banner } from "../../../component/Banner/Banner"

import { useNavigate } from "react-router-dom"
import "../../CommonCss.css";
import "../../Home/Home.css"


export function GameHome () {
    const navigate = useNavigate();

    return (
    <div className="homeContainer">
        <Banner></Banner>

        <div className="hero-section">
            <h1 className="hero-title">Prêt à jouer ?</h1>
            <p className="hero-subtitle">Lance un salon pour tes amis, ou rejoins celui de quelqu'un d'autre.</p>
        </div>

        <div className="cards-container">
            <div className="feature-card create-card">
                <div className="card-icon">🎉</div>
                <h2 className="card-title">Créer un salon</h2>
                <p className="card-description">
                    Choisis un quizz, configure la partie et invite tes amis à te rejoindre.
                </p>
                <div className="card-actions">
                    <Button variant="contained" className="card-button primary-button" onClick={() => {navigate("/play/test")}}>
                        Créer un salon
                    </Button>
                </div>
            </div>

            <div className="feature-card play-card">
                <div className="card-icon">🔑</div>
                <h2 className="card-title">Rejoindre un salon</h2>
                <p className="card-description">
                    Tu as reçu un code de salon ? Entre-le pour rejoindre la partie en cours.
                </p>
                <div className="card-actions">
                    <Button variant="contained" className="card-button secondary-button" onClick={() => {navigate("/play/join")}}>
                        Rejoindre un salon
                    </Button>
                </div>
            </div>
        </div>
    </div>
)
}
