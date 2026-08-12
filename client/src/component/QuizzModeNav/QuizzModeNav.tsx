import { useNavigate, useLocation } from "react-router-dom";
import "./QuizzModeNav.css";

const MODES = [
    { path: "/create-a-quizz", label: "Liste" },
    { path: "/create-a-grid-quizz", label: "Grid (mémoire)" },
    { path: "/create-a-pickban-quizz", label: "Pick & Ban" },
    { path: "/create-a-timer-quizz", label: "Timer" },
];

/**
 * Même pattern visuel que le sélecteur de mode de QuestionCreationForm, mais
 * chaque bouton navigue vers une page différente au lieu de changer un state
 * local : les 3 formulaires de quizz sont trop différents (grille, draft,
 * liste simple) pour tenir dans un seul composant sans un enchevêtrement de
 * champs conditionnels.
 */
export function QuizzModeNav() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="quizzModeSelector">
            <h3>Créer un quizz au format</h3>
            {MODES.map((m, i) => (
                <button
                    key={m.path}
                    type="button"
                    className={[
                        "quizzModeButton",
                        i === 0 ? "first" : "",
                        i === MODES.length - 1 ? "last" : "",
                        location.pathname === m.path ? "selectedMode" : "notSelectedMode",
                    ].filter(Boolean).join(" ")}
                    onClick={() => navigate(m.path)}
                >
                    {m.label}
                </button>
            ))}
        </div>
    );
}

export default QuizzModeNav;
