import { useContext, useEffect, useState } from "react";
import { Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Banner } from "../../component/Banner/Banner";
import { AuthContext } from "../../context/authentContext";
import { CardArea } from "../../component/Card/CardArea/CardArea";
import QuizzCard from "../../component/Card/EntityCard/QuizzCard";
import makeRequest from "../../tools/requestScheme";
import "../CommonCss.css";
import "../Profil/profil.css";
import "../../component/Card/Card.css";

const MODIFY_ROUTE_BY_QUIZZ_MODE: Record<string, string> = {
    LIST: "/modify-a-quizz",
    GRID: "/modify-a-grid-quizz",
    PICKANDBAN: "/modify-a-pickban-quizz",
    TIMER: "/modify-a-timer-quizz",
};

/** Page "Mes quizz" : reprend le bloc quizz de l'ancien /profil, sans le reste. */
export function MyQuizzes() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [quizz, setQuizz] = useState<any[]>([]);
    const [quizzCards, setQuizzCards] = useState<QuizzCard[]>([]);

    const buttonPressedQuizz = (quizzCard: QuizzCard) => {
        const q = quizzCard.getContent();
        const route = MODIFY_ROUTE_BY_QUIZZ_MODE[q.mode] || "/modify-a-quizz";
        navigate(`${route}/${q.quizz_id}`, { state: { quizz: q } });
    };

    useEffect(() => {
        const fetchData = async () => {
            if (!auth?.user?.id) return;
            try {
                setQuizz(await makeRequest("/quizz"));
            } catch (error) {
                console.error("Erreur lors du fetch :", error);
            }
        };
        fetchData();
    }, [auth?.user?.id]);

    useEffect(() => {
        setQuizzCards((quizz ?? []).map((q: any) => {
            const route = MODIFY_ROUTE_BY_QUIZZ_MODE[q.mode] || "/modify-a-quizz";
            return new QuizzCard(q, buttonPressedQuizz, Number(auth?.user?.id), false, `${route}/${q.quizz_id}`);
        }));
    }, [quizz]);

    if (!auth?.user) {
        return (
            <div>
                <Banner />
                <div className="PleaseLogin">
                    <h1>Veuillez-vous inscrire pour voir vos quizz</h1>
                    <Button className="linkLogin" onClick={() => navigate("/login")}>Page de connection !</Button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <CardArea title="Vos quizz" emptyText="Creez vos premiers quizz"
                    cards={quizzCards} link="/create-a-quizz" draggable={false} setUsedCard={() => {}} />
            </div>
        </div>
    );
}

export default MyQuizzes;
