import { Question } from "shared-types";
import AnswerCard from "./AnswerCard";

export default function QcmAnswer({ question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer:boolean, answerEvent?: string }) {
    if (question.mode !== "QCM") {
        return null;
    }

    // Ordre d'affichage posé par le serveur (identique pour tous les joueurs
    // de la room) ; `question.answer` reste l'index canonique, non affecté.
    const order = question.choiceOrder ?? [1, 2, 3, 4];
    const options = order.map((idx) => ({ key: idx, label: question.choices[`ans${idx}` as keyof typeof question.choices] }));

    return (
        <AnswerCard
            key={question.question_id}
            title={question.title}
            options={options}
            canAnswer={canAnswer}
            onSubmit={(selected) =>
                socket.emit(answerEvent ?? "answerToQuestion", { question, answer: selected, room_id, username })
            }
        />
    );
}
