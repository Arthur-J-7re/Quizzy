import { useState } from "react";
import { Button } from "@mui/material";
import QRCode from "react-qr-code";
import { Banner } from "../../component/Banner/Banner";
import "./qrShare.css";

// Page temporaire : à retirer (ainsi que sa route dans main.tsx) une fois le test terminé.
const LINK = "https://www.google.com/search?sca_esv=44d7f0e7266e9015&rlz=1C1UEAD_frFR1076FR1076&sxsrf=APpeQntJZsJlhoTMeBZ12VhEAKS7n6hXAw:1785780557247&si=APenkKm7iecQ4G6P-TsbSMFKIQtv3EFIqRAFw-i8uEbk55Z-_y58I4KjyIkK7rRbtZfuJBlRy_S5Irc1JYFXMuQBzylIIXJnYCiIbfcI3RwqgkWHwR-DqUV8lX1KOGhUjGx1Dg5Vb3N8qFklYhHiwWNVQhsZjjjPXw%3D%3D&q=Energy+Nutrition+Club+Avis&sa=X&ved=2ahUKEwjWs4v-hoWWAxVgUaQEHaN0AmMQ0bkNegQIQBAH&biw=1536&bih=730&dpr=1.25";

export function QrShare() {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(LINK);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="qrSharePage">
            <Banner />
            <div className="qrShareContent">
                <h1>Scanner le QR code</h1>
                <div className="qrSharePlate">
                    <QRCode title="Lien" value={LINK} />
                </div>
                <a className="qrShareLink" href={LINK} target="_blank" rel="noopener noreferrer">
                    Ouvrir le lien
                </a>
                <Button className="Button" onClick={copyToClipboard}>Copier le lien</Button>
                {copied && <div className="qrShareCopied">Lien copié !</div>}
            </div>
        </div>
    );
}

export default QrShare;
