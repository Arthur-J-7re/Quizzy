import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {
    POINTS_ACTIONS,
    POINTS_EVENTS,
    levelColor,
    pointsForLevel,
    type PointsQuestionPayload,
    type PointsQuestionResult,
    type PointsRanking,
    type PointsState,
} from "shared-types";
import GameQuestionAnswer from "../GameQuestionAnswer/GameQuestionAnswer";
import { formatGivenAnswer } from "../List/formatGivenAnswer";
import RefereeOverrideButton, { isRefereeEligible } from "../Referee/RefereeOverrideButton";
import "./PointsBoard.css";

/**
 * Plateau du mode Points : même déroulé que LIST (une question à la fois,
 * tout le monde répond, score cumulé), mais les questions sont tirées au
 * hasard par tag manche après manche — pas de titre de question suivante à
 * annoncer au présentateur, elle n'est pas encore connue tant qu'on n'a pas
 * lancé la manche.
 */
export default function PointsBoard({
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
    const [state, setState] = useState<PointsState | null>(null);
    const [active, setActive] = useState<PointsQuestionPayload | null>(null);
    const [lastResult, setLastResult] = useState<PointsQuestionResult | null>(null);
    const [ranking, setRanking] = useState<PointsRanking[] | null>(null);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState<number | null>(null);

    const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    // Miroir de `state` lisible depuis le handler `onError` (closure figée sur
    // le rendu du montage) : une erreur reçue avant le tout premier `state`
    // (ex. aucune question ne correspond aux tags choisis) ne doit jamais
    // s'auto-effacer, sinon l'écran retombe sur "En attente…" sans explication.
    const stateRef = useRef<PointsState | null>(null);

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
        const onState = (next: PointsState) => { stateRef.current = next; setState(next); };
        const onQuestion = (payload: PointsQuestionPayload) => {
            setActive(payload);
            setLastResult(null);
            startCountdown(payload.durationMs);
        };
        const onResult = (result: PointsQuestionResult) => {
            setLastResult(result);
            setActive(null);
            setCountdown(null);
        };
        const onFinished = ({ ranking: r }: { ranking: PointsRanking[] }) => {
            setRanking(r);
            setActive(null);
            setCountdown(null);
        };
        const onError = ({ message }: { message: string }) => {
            setError(message);
            if (stateRef.current) {
                setTimeout(() => setError(""), 4000);
            }
        };

        socket.on(POINTS_EVENTS.state, onState);
        socket.on(POINTS_EVENTS.question, onQuestion);
        socket.on(POINTS_EVENTS.result, onResult);
        socket.on(POINTS_EVENTS.finished, onFinished);
        socket.on(POINTS_EVENTS.error, onError);

        return () => {
            socket.off(POINTS_EVENTS.state, onState);
            socket.off(POINTS_EVENTS.question, onQuestion);
            socket.off(POINTS_EVENTS.result, onResult);
            socket.off(POINTS_EVENTS.finished, onFinished);
            socket.off(POINTS_EVENTS.error, onError);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, [socket]);

    const hostAdvance = () => {
        socket.emit(POINTS_ACTIONS.hostAdvance);
    };

    if (!state) {
        return (
            <div className="pointsBoardWaiting">
                {error ? <div className="pointsBoardError">{error}</div> : "En attente du lancement de la partie…"}
            </div>
        );
    }

    const hasAnswered = state.answeredNames.includes(username);

    return (
        <div className="pointsBoardContainer">
            <header className="pointsBoardHeader">
                <div className="pointsPhase">
                    {state.phase === "finished"
                        ? "Partie terminée"
                        : `Question ${state.index + 1} / ${state.total}`}
                    {countdown !== null && countdown > 0 && (
                        <span className="pointsCountdown">{countdown}s</span>
                    )}
                </div>
            </header>

            {error && <div className="pointsBoardError">{error}</div>}

            {isPresentator && state.phase === "reveal" && (
                <div className="pointsHostControls">
                    <button type="button" className="pointsHostAdvanceButton" onClick={() => hostAdvance()}>
                        Question suivante ▶
                    </button>
                </div>
            )}

            <div className="pointsBoardLayout">
                <div className="pointsQuestionZone">
                    {active?.difficultyScoring && active.question && (
                        <div className="pointsLevelBanner" style={{ backgroundColor: levelColor(active.question.level) }}>
                            Niveau {active.question.level ?? 1} — {pointsForLevel(active.question.level)} pt{pointsForLevel(active.question.level) > 1 ? "s" : ""}
                        </div>
                    )}
                    {active?.question && !hasAnswered && (
                        <GameQuestionAnswer
                            question={active.question}
                            socket={socket}
                            room_id=""
                            username={username}
                            canAnswer={true}
                            answerEvent={POINTS_ACTIONS.answer}
                        />
                    )}
                    {active && hasAnswered && (
                        <p className="pointsWaiting">Réponse envoyée, en attente des autres joueurs…</p>
                    )}
                    {!active && state.phase !== "finished" && (
                        <p className="pointsWaiting">
                            {isPresentator
                                ? "Lancez la question suivante quand vous êtes prêt."
                                : withPresentator
                                    ? "Le présentateur va lancer la question suivante…"
                                    : "Préparation de la question suivante…"}
                        </p>
                    )}
                </div>

                <div className="pointsScoreboard">
                    <h3>Scores</h3>
                    <ul>
                        {[...state.players].sort((a, b) => b.score - a.score).map((p) => (
                            <li key={p.name} className={p.name === username ? "self" : undefined}>
                                <span>{p.name}{p.name === username ? " (vous)" : ""}</span>
                                <strong>{p.score} pts</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {lastResult && (
                <div className="pointsResult">
                    <h3>{lastResult.question.title}</h3>
                    <ul>
                        {lastResult.answers.map((a) => {
                            const hasAnswer = a.given !== null && a.given !== undefined && a.given !== "";
                            return (
                                <li key={a.player} className={!hasAnswer ? "neutral" : a.correct ? "ok" : "ko"}>
                                    <span className="pointsPlayerName">
                                        {a.player}{a.player === username ? " (vous)" : ""}
                                    </span>
                                    <span className="pointsPlayerAnswer">
                                        {hasAnswer ? formatGivenAnswer(lastResult.question, a.given) : "Pas de réponse"}
                                    </span>
                                    {hasAnswer && a.correct && <span className="pointsPlayerPoints">+{a.pointsEarned} pts</span>}
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
                <div className="pointsRanking">
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
