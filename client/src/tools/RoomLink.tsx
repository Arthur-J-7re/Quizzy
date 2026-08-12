import { useState, useEffect } from "react";
import { Button } from "@mui/material";
import QRCode from "react-qr-code";
import "../pages/Game/RoomPage/Room.css";

export default function RoomLink({ roomId }: { roomId: string }) {
    const [copied, setCopied] = useState(false);
    const [wQr, setWqr] = useState(false)
    // Par défaut on part de l'origine courante (fonctionne déjà si on est nous-même
    // sur l'IP locale ou l'URL ngrok). On l'affine ensuite via /connection-url, utile
    // quand l'hôte crée le salon depuis son propre localhost et doit quand même
    // partager un lien joignable par des joueurs distants (tunnel ngrok, LAN).
    const [origin, setOrigin] = useState(window.location.origin);

    useEffect(() => {
        fetch("/local-api/connection-url")
            .then((res) => res.json())
            .then((data: { url?: string }) => {
                if (data.url) setOrigin(data.url);
            })
            .catch(() => {
                // /connection-url indisponible (proxy/serveur non lancé) : on garde l'origine courante
            });
    }, []);

    const link = `${origin}/play/room/${roomId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Message temporaire "copié !"
    };

    return (
        <div className="roomLinkCard">
            <h3>Rejoindre le salon</h3>
            {wQr ? (
                <div className="roomLinkQrBox">
                    <QRCode title="Room's link" value={link} />
                    <Button className="roomLinkQrToggle" onClick={() => setWqr(false)}>Cacher le QR code</Button>
                </div>
            ) : (
                <Button className="roomLinkQrToggle" onClick={() => setWqr(true)}>Afficher le QR code</Button>
            )}
            <div className="roomLinkUrlLabel">Lien vers le salon :</div>
            <a className="roomLinkUrl" href={link} target="_blank" rel="noopener noreferrer">
                {link}
            </a>
            <button className="roomLinkCopyButton" onClick={copyToClipboard}>
                Copier le lien
            </button>
            {copied && <div className="roomLinkCopied">Lien copié !</div>}
        </div>
    );
}
