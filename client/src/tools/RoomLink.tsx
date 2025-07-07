import { useState } from "react";
import { Button } from "@mui/material";
import QRCode from "react-qr-code";

export default function RoomLink({ roomId }: { roomId: string }) {
    const [copied, setCopied] = useState(false);
    //const [connected, setConnected] = useState(false);
    const [wQr, setWqr] = useState(false)
    const link = `http://localhost:5180/play/room/${roomId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Message temporaire "copié !"
    };

    return (
        <div className="flex-center border qv innergap">
            {wQr ?<div className="flex-center gap innergap wbg wborder">
                <QRCode title="Room's link" value={link}/>
                <Button onClick={() => setWqr(false)}>Cacher le Qr Code</Button>
            </div> : <Button onClick={() => setWqr(true)}>Afficher le Qr Code</Button>}
            <div style={{ marginBottom: "10px" }}>
                Lien vers le salon :{" "}
                <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "blue", textDecoration: "underline" }}>
                    {link}
                </a>
                
            </div> 
            <button className="Button"onClick={copyToClipboard} style={{ padding: "8px 12px", borderRadius: "5px", backgroundColor: "#1976d2", color: "white", border: "none", cursor: "pointer" }}>
                Copier le lien
            </button>
            {copied && <div style={{ marginTop: "8px", color: "green" }}>Lien copié !</div>}
        </div>
    );
}