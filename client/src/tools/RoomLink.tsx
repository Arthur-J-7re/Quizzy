import { useState } from "react";

export default function RoomLink({ roomId }: { roomId: string }) {
    const [copied, setCopied] = useState(false);
    const [connected, setConnected] = useState(false);
    const link = `http://localhost:5180/play/room/${roomId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Message temporaire "copié !"
    };

    return (
        <div style={{ marginTop: "20px" }}>
            <div style={{ marginBottom: "10px" }}>
                Lien vers le salon :{" "}
                <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: "blue", textDecoration: "underline" }}>
                    {link}
                </a>
            </div>
            <button onClick={copyToClipboard} style={{ padding: "8px 12px", borderRadius: "5px", backgroundColor: "#1976d2", color: "white", border: "none", cursor: "pointer" }}>
                Copier le lien
            </button>
            {copied && <div style={{ marginTop: "8px", color: "green" }}>Lien copié !</div>}
        </div>
    );
}