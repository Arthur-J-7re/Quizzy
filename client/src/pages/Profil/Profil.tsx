import { Button } from "@mui/material";
import { Banner } from "../../component/Banner/Banner"
import { useNavigate } from "react-router-dom"
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext";
import "../CommonCss.css";
import "./profil.css";
import "../Library/Library.css";

/**
 * Hub léger : avant, cette page chargeait d'un coup questions + quizz +
 * thèmes + émissions (4 requêtes non filtrées) pour tout afficher sur une
 * seule page. Chaque type a maintenant sa propre page ("Mes questions" etc.),
 * filtrée/paginée côté serveur — /profil n'est plus qu'un point d'entrée
 * (lien "Voir vos créations" du menu profil), les formulaires de création
 * utilisent `navigate(-1)` après sauvegarde/suppression pour revenir à la
 * page d'où on est venu plutôt que d'atterrir systématiquement ici.
 */
export function Profil() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    const links = [
        { to: "/my-questions", label: "Mes questions" },
        { to: "/my-quizzes", label: "Mes quizz" },
        { to: "/my-themes", label: "Mes thèmes" },
        { to: "/my-emissions", label: "Mes émissions" },
    ];

    return (
        (auth && auth.user) ?
        <div>
            <Banner />
            <div className="libraryHub">
                {links.map((link) => (
                    <a key={link.to} href={link.to} className="libraryHubCard">
                        {link.label}
                    </a>
                ))}
            </div>
        </div>
        :
        <div>
            <Banner />
            <div className='PleaseLogin'>
                <h1>Veuillez-vous inscrire pour créer une question</h1>
                <Button className='linkLogin' onClick={() => navigate("/login")}>Page de connection !</Button>
            </div>
        </div>
    )
};
