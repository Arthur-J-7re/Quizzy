import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {
    LIST_ACTIONS,
    LIST_EVENTS,
    SHOW_ACTIONS,
    type ListQuestionPayload,
    type ListQuestionResult,
    type ListRanking,
    type ListState,
    type ShowView,
} from "shared-types";
import GameQuestionAnswer from "../GameQuestionAnswer/GameQuestionAnswer";
import { formatGivenAnswer } from "./formatGivenAnswer";
import RefereeOverrideButton, { isRefereeEligible } from "../Referee/RefereeOverrideButton";
import "./ListBoard.css";

/**
 * Plateau du mode LIST (quizz classique) : contrairement à Grid/Pick & Ban,
 * la même question est envoyée à tout le monde en même temps, chacun répond
 * de son côté. Le composant n'a aucune vérité de jeu : tout vient du serveur.
 */
export default function ListBoard({
    socket,
    username,
    isPresentator = false,
    withPresentator = false,
    isReferee = false,
}: {
    socket: Socket;
    username: string;
    isPresentator?: boolean;
    withPresentator?: boolean;
    isReferee?: boolean;
}) {
    const [state, setState] = useState<ListState | null>(null);
    const [active, setActive] = useState<ListQuestionPayload | null>(null);
    const [lastResult, setLastResult] = useState<ListQuestionResult | null>(null);
    const [ranking, setRanking] = useState<ListRanking[] | null>(null);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState<number | null>(null);

    const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    const startCountdown = (durationMs: number) => {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        const endsAt = Date.now() + durationMs;
        setCountdown(Math.ceil(durationMs / 1000));
        countdownTimer.current = setInterval(() => {
            const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
            setCountdown(left);
            if (left === 0 && countdownTimer.current) {
                clearInterval(countdownTimer.current);
                countdownTimer.current = null;
            }
        }, 250);
    };

    useEffect(() => {
        const onState = (next: ListState) => setState(next);
        const onQuestion = (payload: ListQuestionPayload) => {
            setActive(payload);
            setLastResult(null);
            startCountdown(payload.durationMs);
        };
        const onResult = (result: ListQuestionResult) => {
            setLastResult(result);
            setActive(null);
            setCountdown(null);
        };
        const onFinished = ({ ranking: r }: { ranking: ListRanking[] }) => {
            setRanking(r);
            setActive(null);
            setCountdown(null);
        };
        const onError = ({ message }: { message: string }) => {
            setError(message);
            setTimeout(() => setError(""), 4000);
        };

        socket.on(LIST_EVENTS.state, onState);
        socket.on(LIST_EVENTS.question, onQuestion);
        socket.on(LIST_EVENTS.result, onResult);
        socket.on(LIST_EVENTS.finished, onFinished);
        socket.on(LIST_EVENTS.error, onError);

        return () => {
            socket.off(LIST_EVENTS.state, onState);
            socket.off(LIST_EVENTS.question, onQuestion);
            socket.off(LIST_EVENTS.result, onResult);
            socket.off(LIST_EVENTS.finished, onFinished);
            socket.off(LIST_EVENTS.error, onError);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, [socket]);

    const hostAdvance = () => {
        socket.emit(LIST_ACTIONS.hostAdvance);
    };
    const setShowView = (view: ShowView) => {
        socket.emit(SHOW_ACTIONS.setView, { view });
    };

    if (!state) {
        return <div className="listBoardWaiting">En attente du lancement de la partie…</div>;
    }

    const hasAnswered = state.answeredNames.includes(username);

    return (
        <div className="listBoardContainer">
            <header className="listBoardHeader">
                <div className="listPhase">
                    {state.phase === "finished"
                        ? "Partie terminée"
                        : `Question ${state.index + 1} / ${state.total}`}
                    {countdown !== null && countdown > 0 && (
                        <span className="listCountdown">{countdown}s</span>
                    )}
                </div>
            </header>

            {error && <div className="listBoardError">{error}</div>}

            {isPresentator && (
                <div className="listHostControls">
                    {state.phase === "reveal" && (
                        <div className="listHostAdvanceRow">
                            {lastResult?.nextQuestionTitle && (
                                <span className="listHostNextTitle">Suivante : « {lastResult.nextQuestionTitle} »</span>
                            )}
                            <button type="button" className="listHostAdvanceButton" onClick={() => hostAdvance()}>
                                Question suivante ▶
                            </button>
                        </div>
                    )}
                    <div className="listHostShowButtons">
                        Écran :
                        <button type="button" onClick={() => setShowView("live")}>En direct</button>
                        <button type="button" onClick={() => setShowView("results")}>Résultats</button>
                        <button type="button" onClick={() => setShowView("scoreboard")}>Classement</button>
                    </div>
                </div>
            )}

            {/* Pas de scoreboard en direct pour ce mode (QCM à la volée) : les
                scores restent secrets jusqu'au récap affiché entre chaque
                étape (cf. Room.renderStepBanner), pour garder un peu de
                suspense pendant les questions. */}
            <div className="listBoardLayout">
                <div className="listQuestionZone">
                    {active?.question && !hasAnswered && (
                        <GameQuestionAnswer
                            question={active.question}
                            socket={socket}
                            room_id=""
                            username={username}
                            canAnswer={true}
                            answerEvent={LIST_ACTIONS.answer}
                        />
                    )}
                    {active && hasAnswered && (
                        <p className="listWaiting">Réponse envoyée, en attente des autres joueurs…</p>
                    )}
                    {!active && state.phase !== "finished" && (
                        <p className="listWaiting">
                            {isPresentator
                                ? "Lancez la question suivante quand vous êtes prêt."
                                : withPresentator
                                    ? "Le présentateur va lancer la question suivante…"
                                    : "Préparation de la question suivante…"}
                        </p>
                    )}
                </div>
            </div>

            {lastResult && (
                <div className="listResult">
                    <h3>{lastResult.question.title}</h3>
                    <ul>
                        {lastResult.answers.map((a) => {
                            const hasAnswer = a.given !== null && a.given !== undefined && a.given !== "";
                            return (
                                <li key={a.player} className={!hasAnswer ? "neutral" : a.correct ? "ok" : "ko"}>
                                    <span className="listPlayerName">
                                        {a.player}{a.player === username ? " (vous)" : ""}
                                    </span>
                                    <span className="listPlayerAnswer">
                                        {hasAnswer ? formatGivenAnswer(lastResult.question, a.given) : "Pas de réponse"}
                                    </span>
                                    {hasAnswer && a.correct && <span className="listPlayerPoints">+{a.pointsEarned} pts</span>}
                                    <RefereeOverrideButton
                                        socket={socket}
                                        isReferee={isReferee}
                                        eligible={isRefereeEligible(lastResult.question.mode, a.given)}
                                        playerName={a.player}
                                        currentCorrect={a.correct}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {ranking && (
                <div className="listRanking">
                    <h2>Classement final</h2>
                    <ol>
                        {ranking.map((r) => (
                            <li key={r.name}>
                                {r.name}{r.name === username ? " (vous)" : ""}
                                <strong>{r.score} pts</strong>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
