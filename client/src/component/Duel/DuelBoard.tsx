import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import {
    DUEL_ACTIONS,
    DUEL_EVENTS,
    type DuelAnswerResult,
    type DuelQuestionPayload,
    type DuelRanking,
    type DuelState,
} from "shared-types";
import GameQuestionAnswer from "../GameQuestionAnswer/GameQuestionAnswer";
import "./DuelBoard.css";

const formatMs = (ms: number) => {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Plateau du mode Duel (façon Face à Face) : chrono individuel par joueur,
 * décompté seulement pendant son tour. Le serveur diffuse l'état à chaque
 * tick (~250ms pendant qu'un chrono tourne) : contrairement à Timer/List/
 * Pick & Ban, le client n'a pas besoin d'interpoler localement entre deux
 * synchronisations, `remainingMs` est affiché tel quel.
 */
export default function DuelBoard({
    socket,
    username,
}: {
    socket: Socket;
    username: string;
}) {
    const [state, setState] = useState<DuelState | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<DuelQuestionPayload | null>(null);
    const [lastResult, setLastResult] = useState<DuelAnswerResult | null>(null);
    const [ranking, setRanking] = useState<DuelRanking[] | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const onState = (next: DuelState) => setState(next);
        const onQuestion = (payload: DuelQuestionPayload) => {
            setActiveQuestion(payload);
            setLastResult(null);
        };
        const onResult = (result: DuelAnswerResult) => {
            setLastResult(result);
            setActiveQuestion(null);
        };
        const onFinished = ({ ranking: r }: { ranking: DuelRanking[] }) => {
            setRanking(r);
            setActiveQuestion(null);
        };
        const onError = ({ message }: { message: string }) => {
            setError(message);
            setTimeout(() => setError(""), 4000);
        };

        socket.on(DUEL_EVENTS.state, onState);
        socket.on(DUEL_EVENTS.question, onQuestion);
        socket.on(DUEL_EVENTS.result, onResult);
        socket.on(DUEL_EVENTS.finished, onFinished);
        socket.on(DUEL_EVENTS.error, onError);

        return () => {
            socket.off(DUEL_EVENTS.state, onState);
            socket.off(DUEL_EVENTS.question, onQuestion);
            socket.off(DUEL_EVENTS.result, onResult);
            socket.off(DUEL_EVENTS.finished, onFinished);
            socket.off(DUEL_EVENTS.error, onError);
        };
    }, [socket]);

    if (!state) {
        return <div className="duelBoardWaiting">En attente du lancement de la partie…</div>;
    }

    const myTurn = state.activePlayer === username;

    return (
        <div className="duelBoardContainer">
            <header className="duelBoardHeader">
                <div className="duelPhase">
                    {state.phase === "finished"
                        ? "Duel terminé"
                        : myTurn
                            ? "À vous de répondre !"
                            : state.activePlayer
                                ? `${state.activePlayer} répond…`
                                : "En attente…"}
                </div>
                {state.phase !== "finished" && state.questionsTotal > 0 && (
                    <div className="duelProgress">
                        Question {state.questionIndex + 1} / {state.questionsTotal}
                    </div>
                )}
            </header>

            {error && <div className="duelBoardError">{error}</div>}

            <div className="duelClocks">
                {state.players.map((p) => (
                    <div
                        key={p.name}
                        className={[
                            "duelClock",
                            p.name === state.activePlayer ? "active" : "",
                            p.remainingMs <= 10000 ? "low" : "",
                        ].filter(Boolean).join(" ")}
                    >
                        <span className="duelClockName">
                            {p.name}{p.name === username ? " (vous)" : ""}
                        </span>
                        <span className="duelClockTime">{formatMs(p.remainingMs)}</span>
                    </div>
                ))}
            </div>

            <div className="duelQuestionZone">
                {myTurn && activeQuestion?.question && (
                    <GameQuestionAnswer
                        question={activeQuestion.question}
                        socket={socket}
                        room_id=""
                        username={username}
                        canAnswer={true}
                        answerEvent={DUEL_ACTIONS.answer}
                    />
                )}
                {!myTurn && state.phase === "question" && (
                    <p className="duelWaiting">{state.activePlayer} répond…</p>
                )}
                {lastResult && (
                    <div className={`duelLastResult ${lastResult.correct ? "ok" : "ko"}`}>
                        {lastResult.player}{lastResult.player === username ? " (vous)" : ""}{" "}
                        {lastResult.correct
                            ? "a la bonne réponse : la main passe à l'adversaire"
                            : "se trompe : garde la main"}
                    </div>
                )}
            </div>

            {ranking && (
                <div className="duelRanking">
                    <h2>Résultat du duel</h2>
                    <ol>
                        {ranking.map((r) => (
                            <li key={r.name} className={r.score > 0 ? "winner" : ""}>
                                {r.name}{r.name === username ? " (vous)" : ""}
                                {r.score > 0 ? " 🏆" : ""}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
