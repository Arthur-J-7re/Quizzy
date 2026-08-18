import { Question } from "shared-types";
import AnswerCard from "../AnswerCard";

export default function CashAnswer({ question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: any, room_id : string, username: string, canAnswer:boolean, answerEvent?: string }) {
    return (
        <AnswerCard
            key={question.question_id}
            title={question.title}
            freeText
            canAnswer={canAnswer}
            onSubmit={(selected) =>
                socket.emit(answerEvent ?? "answerToQuestion", {
                    question,
                    answer: { value: selected, mode: "CASH" },
                    room_id,
                    username,
                })
            }
        />
    );
}
