import { Question } from "shared-types";
import AnswerCard from "./AnswerCard";

const VF_OPTIONS = [
    { key: "vrai", label: "Vrai" },
    { key: "faux", label: "Faux" },
];

export default function VfAnswer({ question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer: boolean, answerEvent?: string }) {
    return (
        <AnswerCard
            key={question.question_id}
            title={question.title}
            options={VF_OPTIONS}
            canAnswer={canAnswer}
            onSubmit={(selected) =>
                socket.emit(answerEvent ?? "answerToQuestion", { question, answer: selected, room_id, username })
            }
        />
    );
}
