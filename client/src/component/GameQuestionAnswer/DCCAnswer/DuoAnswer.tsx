import { Question } from "shared-types";
import AnswerCard from "../AnswerCard";

export default function DuoAnswer({ question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer: boolean, answerEvent?: string }) {
    if (question.mode !== "DCC") {
        return null;
    }

    // Les 2 propositions (texte + id) et leur ordre d'affichage viennent du
    // serveur : identiques pour tous les joueurs de la room, et calculées
    // sans jamais exposer `answer` avant la révélation.
    const options = (question.duoChoices ?? []).map((elem) => ({ key: elem.id, label: elem.value }));

    return (
        <AnswerCard
            key={question.question_id}
            title={question.title}
            options={options}
            canAnswer={canAnswer}
            onSubmit={(selected) =>
                socket.emit(answerEvent ?? "answerToQuestion", {
                    question,
                    answer: { value: selected, mode: "DUO" },
                    room_id,
                    username,
                })
            }
        />
    );
}
