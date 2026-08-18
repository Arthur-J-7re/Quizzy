import { Button } from "@mui/material";
import { useState } from "react";
import "./GameQuestionAnswer.css";

export interface AnswerOption {
    key: number | string;
    label: string;
}

/**
 * Socle commun aux composants de réponse (QCM/Carré/Duo/Cash/VF/Free) :
 * intitulé, une liste d'options cliquables OU un champ texte libre, bouton
 * d'envoi. Chaque mode de question reste un petit adaptateur au-dessus
 * (cf. QcmAnswer, CarreAnswer...) qui construit `options`/`freeText` et le
 * payload `socket.emit` propre à son mode.
 *
 * Monter avec `key={question.question_id}` côté appelant : le remontage React
 * remet `selected` à zéro à chaque nouvelle question, sans state ni effet
 * dédiés.
 */
export default function AnswerCard({
    title,
    options,
    freeText = false,
    canAnswer,
    onSubmit,
}: {
    title: string;
    options?: AnswerOption[];
    freeText?: boolean;
    canAnswer: boolean;
    onSubmit: (value: string | number) => void;
}) {
    const [selected, setSelected] = useState<string | number>("");

    return (
        <div className="answerQcmContainer">
            <div className="intitulé">{title}</div>
            <div className="answerArea">
                {freeText ? (
                    <div className="freeAnswerInputArea">
                        <input
                            className="freeAnswerInput"
                            value={selected as string}
                            onChange={(e) => setSelected(e.target.value)}
                        />
                    </div>
                ) : (
                    (options ?? []).map((opt) => (
                        <div
                            key={opt.key}
                            className={selected === opt.key ? "gameAnswerQcm gaSelected" : "gameAnswerQcm"}
                            onClick={() => setSelected(opt.key)}
                        >
                            {opt.label}
                        </div>
                    ))
                )}
            </div>
            {canAnswer && (
                <Button className="buttonSendAnswer" onClick={() => onSubmit(selected)}>
                    Valider votre réponse
                </Button>
            )}
        </div>
    );
}
