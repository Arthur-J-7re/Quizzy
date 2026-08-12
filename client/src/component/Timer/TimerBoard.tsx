import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {
    TIMER_ACTIONS,
    TIMER_EVENTS,
    type TimerAnswerResult,
    type TimerHostQuestionPayload,
    type TimerHostVerdict,
    type TimerQuestionPayload,
    type TimerRanking,
    type TimerState,
    type TimerTurnResult,
    type TimerTurnStartPayload,
} from "shared-types";
import GameQuestionAnswer from "../GameQuestionAnswer/GameQuestionAnswer";
import TimerHostView from "./TimerHostView";
import "./TimerBoard.css";

/**
 * Plateau du mode Timer : chacun son tour, un décompte personnel tourne
 * pendant le passage du joueur actif. Le composant n'a aucune vérité de jeu :
 * seul le joueur actif reçoit la question, les autres attendent leur tour.
 *
 * `isPresentator`/`withPresentator` : quizz "avec présentateur" — le
 * présentateur (non-joueur) reçoit la question complète et juge lui-même
 * chaque réponse (cf. TimerHostView), au lieu d'une validation automatique.
 */
export default function TimerBoard({
    socket,
    username,
    isPresentator = false,
    withPresentator = false,
}: {
    socket: Socket;
    username: string;
    isPresentator?: boolean;
    withPresentator?: boolean;
}) {
    const [state, setState] = useState<TimerState | null>(null);
    const [turnInfo, setTurnInfo] = useState<TimerTurnStartPayload | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<TimerQuestionPayload | null>(null);
    const [hostQuestion, setHostQuestion] = useState<TimerHostQuestionPayload | null>(null);
    const [lastResult, setLastResult] = useState<TimerAnswerResult | null>(null);
    const [turnResult, setTurnResult] = useState<TimerTurnResult | null>(null);
    const [ranking, setRanking] = useState<TimerRanking[] | null>(null);
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
        const onState = (next: TimerState) => setState(next);
        const onTurnStart = (payload: TimerTurnStartPayload) => {
            setTurnInfo(payload);
            setTurnResult(null);
            setLastResult(null);
            setActiveQuestion(null);
            setHostQuestion(null);
            startCountdown(payload.durationMs);
        };
        const onQuestion = (payload: TimerQuestionPayload) => {
            setActiveQuestion(payload);
            // Sans ça, le résultat (✓/✗) de la question précédente du même
            // tour restait affiché sous la nouvelle question.
            setLastResult(null);
        };
        const onHostQuestion = (payload: TimerHostQuestionPayload) => {
            setHostQuestion(payload);
        };
        const onResult = (result: TimerAnswerResult) => {
            setLastResult(result);
            setHostQuestion(null);
        };
        const onTurnEnd = (result: TimerTurnResult) => {
            setTurnResult(result);
            setActiveQuestion(null);
            setHostQuestion(null);
            setCountdown(null);
        };
        const onFinished = ({ ranking: r }: { ranking: TimerRanking[] }) => {
            setRanking(r);
            setActiveQuestion(null);
            setHostQuestion(null);
            setCountdown(null);
        };
        const onError = ({ message }: { message: string }) => {
            setError(message);
            setTimeout(() => setError(""), 4000);
        };

        socket.on(TIMER_EVENTS.state, onState);
        socket.on(TIMER_EVENTS.turnStart, onTurnStart);
        socket.on(TIMER_EVENTS.question, onQuestion);
        socket.on(TIMER_EVENTS.hostQuestion, onHostQuestion);
        socket.on(TIMER_EVENTS.result, onResult);
        socket.on(TIMER_EVENTS.turnEnd, onTurnEnd);
        socket.on(TIMER_EVENTS.finished, onFinished);
        socket.on(TIMER_EVENTS.error, onError);

        return () => {
            socket.off(TIMER_EVENTS.state, onState);
            socket.off(TIMER_EVENTS.turnStart, onTurnStart);
            socket.off(TIMER_EVENTS.question, onQuestion);
            socket.off(TIMER_EVENTS.hostQuestion, onHostQuestion);
            socket.off(TIMER_EVENTS.result, onResult);
            socket.off(TIMER_EVENTS.turnEnd, onTurnEnd);
            socket.off(TIMER_EVENTS.finished, onFinished);
            socket.off(TIMER_EVENTS.error, onError);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, [socket]);

    const judge = (verdict: TimerHostVerdict) => {
        socket.emit(TIMER_ACTIONS.hostJudge, { verdict });
    };

    const claimTurn = () => {
        socket.emit(TIMER_ACTIONS.claimTurn);
    };

    if (!state) {
        return <div className="timerBoardWaiting">En attente du lancement de la partie…</div>;
    }

    const myTurn = state.currentPlayer === username;
    const awaitingDuoChoice = state.phase === "awaitingDuoChoice";
    const canClaimTurn = awaitingDuoChoice && (state.awaitingDuoMembers?.includes(username) ?? false);

    return (
        <div className="timerBoardContainer">
            <header className="timerBoardHeader">
                <div className="timerPhase">
                    {state.phase === "finished"
                        ? "Partie terminée"
                        : awaitingDuoChoice
                            ? (canClaimTurn ? "À votre duo : qui commence ?" : "Un duo choisit qui commence…")
                            : myTurn
                                ? "À vous de jouer !"
                                : state.currentPlayer
                                    ? `Au tour de ${state.currentPlayer}`
                                    : "En attente…"}
                    {countdown !== null && countdown > 0 && (
                        <span className="timerCountdown">{countdown}s</span>
                    )}
                </div>
                {turnInfo && state.phase === "turn" && (
                    <div className="timerTheme">
                        Thème : <span className="timerThemeBadge">{turnInfo.themeTitle}</span>
                        <span className="timerCorrectCount">{state.currentTurnCorrectCount} bonne(s) réponse(s)</span>
                    </div>
                )}
            </header>

            {error && <div className="timerBoardError">{error}</div>}

            {/* Pas de scoreboard en direct pour ce mode : les scores restent
                secrets jusqu'au récap affiché entre chaque étape (cf.
                Room.renderStepBanner). */}
            <div className="timerBoardLayout">
                <div className="timerQuestionZone">
                    {awaitingDuoChoice && (
                        canClaimTurn ? (
                            <div className="timerDuoChoice">
                                <p>C'est le tour de votre duo. Qui répond en premier ?</p>
                                <button type="button" className="timerClaimButton" onClick={() => claimTurn()}>
                                    Je commence
                                </button>
                            </div>
                        ) : (
                            <p className="timerWaiting">
                                {state.awaitingDuoMembers?.join(" ou ")} décide qui commence pour son duo…
                            </p>
                        )
                    )}
                    {isPresentator && state.phase === "turn" && (
                        <TimerHostView
                            player={state.currentPlayer ?? ""}
                            question={hostQuestion?.question}
                            givenAnswer={hostQuestion?.givenAnswer}
                            onJudge={judge}
                        />
                    )}
                    {!isPresentator && myTurn && activeQuestion?.question && (
                        <>
                            <GameQuestionAnswer
                                question={activeQuestion.question}
                                socket={socket}
                                room_id=""
                                username={username}
                                canAnswer={true}
                                answerEvent={TIMER_ACTIONS.answer}
                            />
                            {withPresentator && (
                                <p className="timerWaiting">Répondez à voix haute, le présentateur valide.</p>
                            )}
                        </>
                    )}
                    {!isPresentator && !myTurn && state.phase === "turn" && (
                        activeQuestion?.question ? (
                            <GameQuestionAnswer
                                question={activeQuestion.question}
                                socket={socket}
                                room_id=""
                                username={username}
                                canAnswer={false}
                            />
                        ) : (
                            <p className="timerWaiting">
                                {state.currentPlayer} répond aux questions de son thème…
                            </p>
                        )
                    )}
                    {!isPresentator && lastResult && (
                        <div className={`timerLastResult ${lastResult.correct ? "ok" : "ko"}`}>
                            {lastResult.correct ? `✓ +${lastResult.pointsEarned} pts` : "✗"}
                        </div>
                    )}
                </div>
            </div>

            {turnResult && (
                <div className="timerTurnRecap">
                    <strong>{turnResult.player}</strong> a trouvé {turnResult.correctCount} bonne(s) réponse(s)
                    sur {turnResult.questionsAnswered} tentée(s) (+{turnResult.pointsEarned} pts).
                </div>
            )}

            {ranking && (
                <div className="timerRanking">
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
