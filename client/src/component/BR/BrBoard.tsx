import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {
    BR_ACTIONS,
    BR_EVENTS,
    type BrQuestionPayload,
    type BrQuestionResult,
    type BrRanking,
    type BrState,
} from "shared-types";
import GameQuestionAnswer from "../GameQuestionAnswer/GameQuestionAnswer";
import { formatGivenAnswer } from "../List/formatGivenAnswer";
import RefereeOverrideButton, { isRefereeEligible } from "../Referee/RefereeOverrideButton";
import "./BrBoard.css";

/**
 * Plateau du mode Battle Royale : questions tirées au hasard par tag, une
 * par une (comme Points), mais chaque joueur a des vies plutôt qu'un score —
 * une mauvaise réponse en coûte une, à 0 il est éliminé et passe spectateur
 * pour le reste de la partie.
 */
export default function BrBoard({
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
    const [state, setState] = useState<BrState | null>(null);
    const [active, setActive] = useState<BrQuestionPayload | null>(null);
    const [lastResult, setLastResult] = useState<BrQuestionResult | null>(null);
    const [ranking, setRanking] = useState<BrRanking[] | null>(null);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState<number | null>(null);

    const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    // Miroir de `state` lisible depuis le handler `onError` (closure figée sur
    // le rendu du montage) : une erreur reçue avant le tout premier `state`
    // (ex. aucune question ne correspond aux tags choisis) ne doit jamais
    // s'auto-effacer, sinon l'écran retombe sur "En attente…" sans explication.
    const stateRef = useRef<BrState | null>(null);

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
        const onState = (next: BrState) => { stateRef.current = next; setState(next); };
        const onQuestion = (payload: BrQuestionPayload) => {
            setActive(payload);
            setLastResult(null);
            startCountdown(payload.durationMs);
        };
        const onResult = (result: BrQuestionResult) => {
            setLastResult(result);
            setActive(null);
            setCountdown(null);
        };
        const onFinished = ({ ranking: r }: { ranking: BrRanking[] }) => {
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

        socket.on(BR_EVENTS.state, onState);
        socket.on(BR_EVENTS.question, onQuestion);
        socket.on(BR_EVENTS.result, onResult);
        socket.on(BR_EVENTS.finished, onFinished);
        socket.on(BR_EVENTS.error, onError);

        return () => {
            socket.off(BR_EVENTS.state, onState);
            socket.off(BR_EVENTS.question, onQuestion);
            socket.off(BR_EVENTS.result, onResult);
            socket.off(BR_EVENTS.finished, onFinished);
            socket.off(BR_EVENTS.error, onError);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, [socket]);

    const hostAdvance = () => {
        socket.emit(BR_ACTIONS.hostAdvance);
    };

    if (!state) {
        return (
            <div className="brBoardWaiting">
                {error ? <div className="brBoardError">{error}</div> : "En attente du lancement de la partie…"}
            </div>
        );
    }

    const self = state.players.find((p) => p.name === username);
    const isEliminated = Boolean(self) && !self?.alive;
    const hasAnswered = state.answeredNames.includes(username);

    return (
        <div className="brBoardContainer">
            <header className="brBoardHeader">
                <div className="brPhase">
                    {state.phase === "finished" ? "Partie terminée" : `Manche ${state.index + 1}`}
                    {countdown !== null && countdown > 0 && (
                        <span className="brCountdown">{countdown}s</span>
                    )}
                </div>
            </header>

            {error && <div className="brBoardError">{error}</div>}

            {isPresentator && state.phase === "reveal" && (
                <div className="brHostControls">
                    <button type="button" className="brHostAdvanceButton" onClick={() => hostAdvance()}>
                        Question suivante ▶
                    </button>
                </div>
            )}

            <div className="brBoardLayout">
                <div className="brQuestionZone">
                    {isEliminated && state.phase !== "finished" && (
                        <p className="brWaiting">Vous êtes éliminé — vous suivez la partie en spectateur.</p>
                    )}
                    {!isEliminated && active?.question && !hasAnswered && (
                        <GameQuestionAnswer
                            question={active.question}
                            socket={socket}
                            room_id=""
                            username={username}
                            canAnswer={true}
                            answerEvent={BR_ACTIONS.answer}
                        />
                    )}
                    {!isEliminated && active && hasAnswered && (
                        <p className="brWaiting">Réponse envoyée, en attente des autres joueurs…</p>
                    )}
                    {!isEliminated && !active && state.phase !== "finished" && (
                        <p className="brWaiting">
                            {isPresentator
                                ? "Lancez la question suivante quand vous êtes prêt."
                                : withPresentator
                                    ? "Le présentateur va lancer la question suivante…"
                                    : "Préparation de la question suivante…"}
                        </p>
                    )}
                </div>

                <div className="brLivesBoard">
                    <h3>Joueurs</h3>
                    <ul>
                        {[...state.players].sort((a, b) => Number(b.alive) - Number(a.alive) || b.lives - a.lives).map((p) => (
                            <li key={p.name} className={[p.name === username ? "self" : "", p.alive ? "" : "eliminated"].filter(Boolean).join(" ")}>
                                <span>{p.name}{p.name === username ? " (vous)" : ""}</span>
                                <strong>{p.alive ? "❤".repeat(p.lives) || "0" : "éliminé"}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {lastResult && (
                <div className="brResult">
                    <h3>{lastResult.question.title}</h3>
                    <ul>
                        {lastResult.answers.map((a) => {
                            const hasAnswer = a.given !== null && a.given !== undefined && a.given !== "";
                            return (
                                <li key={a.player} className={!hasAnswer ? "neutral" : a.correct ? "ok" : "ko"}>
                                    <span className="brPlayerName">
                                        {a.player}{a.player === username ? " (vous)" : ""}
                                        {lastResult.eliminated.includes(a.player) && " 💀"}
                                    </span>
                                    <span className="brPlayerAnswer">
                                        {hasAnswer ? formatGivenAnswer(lastResult.question, a.given) : "Pas de réponse"}
                                    </span>
                                    {!a.correct && <span className="brPlayerLives">-1 vie</span>}
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
                <div className="brRanking">
                    <h2>Classement final</h2>
                    <ol>
                        {ranking.map((r) => (
                            <li key={r.name}>
                                {r.name}{r.name === username ? " (vous)" : ""}
                                {r.rank === 1 && <strong className="brWinner">Survivant 🏆</strong>}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
