import { Button } from "@mui/material";
import "./TimerHostView.css";

/**
 * Formate la/les bonne(s) réponse(s) d'une question pour le présentateur —
 * contrairement au joueur, il la voit toujours, quel que soit le mode.
 */
function formatExpectedAnswer(question: any): string {
    switch (question?.mode) {
        case "QCM": {
            const key = "ans" + question.answer;
            return question.choices?.[key] ?? "";
        }
        case "FREE":
            return (question.answers ?? []).join(" / ");
        case "VF":
            return question.truth ? "Vrai" : "Faux";
        case "DCC": {
            const key = "ans" + question.answer;
            const main = question.carre?.[key] ?? "";
            const cash = (question.cash ?? []).join(" / ");
            return `Carré : ${main} — Cash : ${cash}`;
        }
        default:
            return "";
    }
}

function formatGivenAnswer(given: unknown): string | null {
    if (given === undefined || given === null || given === "") return null;
    if (typeof given === "string" || typeof given === "number") return String(given);
    if (typeof given === "object" && "value" in (given as any)) return String((given as any).value);
    return JSON.stringify(given);
}

/**
 * Écran du présentateur pendant une épreuve Timer "avec présentateur" : la
 * question est posée à voix haute, le joueur répond à voix haute, et c'est le
 * présentateur qui juge — le serveur ne valide jamais automatiquement dans ce
 * mode (cf. TimerGame.hostJudge côté serveur).
 */
export default function TimerHostView({
    player,
    question,
    givenAnswer,
    onJudge,
}: {
    player: string;
    question: any;
    givenAnswer?: unknown;
    onJudge: (verdict: "correct" | "wrong" | "skip") => void;
}) {
    if (!question) {
        return <div className="timerHostWaiting">En attente de la prochaine question…</div>;
    }

    const given = formatGivenAnswer(givenAnswer);

    return (
        <div className="timerHostView">
            <div className="timerHostLabel">Vue présentateur — posez la question à {player} à voix haute</div>
            <div className="timerHostQuestion">{question.title}</div>
            <div className="timerHostAnswer">
                Bonne réponse : <strong>{formatExpectedAnswer(question)}</strong>
            </div>
            {given && (
                <div className="timerHostGiven">Réponse tapée par {player} (indicatif) : {given}</div>
            )}
            <div className="timerHostButtons">
                <Button className="timerHostButtonOk" onClick={() => onJudge("correct")}>Bonne réponse</Button>
                <Button className="timerHostButtonKo" onClick={() => onJudge("wrong")}>Mauvaise réponse</Button>
                <Button className="timerHostButtonSkip" onClick={() => onJudge("skip")}>Passe la question</Button>
            </div>
        </div>
    );
}
