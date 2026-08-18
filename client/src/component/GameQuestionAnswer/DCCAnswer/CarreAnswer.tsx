import { Question } from "shared-types";
import AnswerCard from "../AnswerCard";

export default function CarreAnswer({ question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer: boolean, answerEvent?: string }) {
    if (question.mode !== "DCC") {
        return null;
    }

    // Ordre d'affichage posé par le serveur (identique pour tous les joueurs
    // de la room) ; `question.answer` reste l'index canonique, non affecté.
    const order = question.choiceOrder ?? [1, 2, 3, 4];
    const options = order.map((idx) => ({ key: idx, label: question.carre[`ans${idx}` as keyof typeof question.carre] }));

    return (
        <AnswerCard
            key={question.question_id}
            title={question.title}
            options={options}
            canAnswer={canAnswer}
            onSubmit={(selected) =>
                socket.emit(answerEvent ?? "answerToQuestion", {
                    question,
                    answer: { value: selected, mode: "CARRE" },
                    room_id,
                    username,
                })
            }
        />
    );
}
