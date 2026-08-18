import { Socket } from "socket.io-client";
import { Question } from "shared-types";
import AnswerCard from "./AnswerCard";

export default function FreeAnswer({ question, socket, room_id, username, canAnswer, answerEvent }: { question: Question, socket: Socket, room_id : string, username: string, canAnswer: boolean, answerEvent?: string }) {
    return (
        <AnswerCard
            key={question.question_id}
            title={question.title}
            freeText
            canAnswer={canAnswer}
            onSubmit={(selected) =>
                socket.emit(answerEvent ?? "answerToQuestion", { question, answer: selected, room_id, username })
            }
        />
    );
}
