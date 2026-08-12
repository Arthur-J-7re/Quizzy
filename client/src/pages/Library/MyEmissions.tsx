import { useContext, useEffect, useState } from "react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Banner } from "../../component/Banner/Banner";
import { AuthContext } from "../../context/authentContext";
import { CardArea } from "../../component/Card/CardArea/CardArea";
import EmissionCard from "../../component/Card/EntityCard/EmissionCard";
import makeRequest from "../../tools/requestScheme";
import "../CommonCss.css";
import "../Profil/profil.css";
import "../../component/Card/Card.css";

/** Page "Mes émissions" : reprend le bloc émissions de l'ancien /profil, sans le reste. */
export function MyEmissions() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [emissions, setEmissions] = useState<any[]>([]);
    const [emissionCards, setEmissionCards] = useState<EmissionCard[]>([]);

    const buttonPressedEmission = (emissionCard: EmissionCard) => {
        navigate(`/modify-an-emission/${emissionCard.getId()}`, { state: { emission: emissionCard.getContent() } });
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!auth?.user?.id) return;
            try {
                setEmissions(await makeRequest("/emission"));
            } catch (error) {
                console.error("Erreur lors du fetch :", error);
            }
        };
        fetchData();
    }, [auth?.user?.id]);

    useEffect(() => {
        setEmissionCards((emissions ?? []).map((emission: any) =>
            new EmissionCard(emission, buttonPressedEmission, Number(auth?.user?.id), false, `/modify-an-emission/${emission.emission_id}`)
        ));
    }, [emissions]);

    if (!auth?.user) {
        return (
            <div>
                <Banner />
                <div className="PleaseLogin">
                    <h1>Veuillez-vous inscrire pour voir vos émissions</h1>
                    <Button className="linkLogin" onClick={() => navigate("/login")}>Page de connection !</Button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <CardArea title="Vos Émissions" emptyText="Créez vos premières émissions"
                    cards={emissionCards} link="/create-an-emission" draggable={false} setUsedCard={() => {}} />
            </div>
        </div>
    );
}

export default MyEmissions;
