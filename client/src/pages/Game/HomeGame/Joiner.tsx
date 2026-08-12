import { Button, TextField } from "@mui/material";
import { Banner } from "../../../component/Banner/Banner"

import { useNavigate } from "react-router-dom"
import "../../CommonCss.css";
import "../../Home/Home.css"
import { useState } from "react";


export function Joiner () {
    const navigate = useNavigate();
    const [room_id, setRoom_Id] = useState("")
    return (
    <div className="homeContainer">
        <Banner></Banner>

        <div className="hero-section">
            <h1 className="hero-title">Rejoindre un salon</h1>
            <p className="hero-subtitle">Entre le code partagé par l'hôte pour rejoindre la partie.</p>
        </div>

        <div className="cards-container single-card-container">
            <div className="feature-card play-card">
                <div className="card-icon">🔑</div>
                <TextField
                    className="roomIdInput"
                    label="Code du salon"
                    value={room_id}
                    onChange={(e) => {setRoom_Id(e.target.value)}}
                    fullWidth
                />
                <div className="card-actions">
                    <Button
                        variant="contained"
                        className="card-button secondary-button"
                        disabled={!room_id.trim()}
                        onClick={() => {navigate(`/play/room/${room_id}`)}}
                    >
                        Rejoindre le salon
                    </Button>
                </div>
            </div>
        </div>
    </div>
)
}
