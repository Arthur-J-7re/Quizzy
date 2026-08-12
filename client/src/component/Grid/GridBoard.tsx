import { useEffect, useMemo, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {
    GRID_ACTIONS,
    GRID_EVENTS,
    NEUTRAL_COLOR,
    type GridCellResult,
    type GridRanking,
    type GridState,
} from "shared-types";
import GameQuestionAnswer from "../GameQuestionAnswer/GameQuestionAnswer";
import RefereeOverrideButton, { isRefereeEligible } from "../Referee/RefereeOverrideButton";
import "./GridBoard.css";

interface ActiveQuestion {
    index: number;
    player: string;
    themeTitle: string | null;
    color: string;
    durationMs: number;
    question?: any;
}

/**
 * Plateau du mode Grid.
 *
 * Le composant n'a aucune vérité de jeu : il affiche ce que le serveur envoie.
 * Les couleurs des cases fermées ne sont tout simplement pas dans le state
 * reçu hors phase de mémorisation, donc rien à cacher côté client.
 */
export default function GridBoard({
    socket,
    username,
    isReferee = false,
}: {
    socket: Socket;
    username: string;
    isReferee?: boolean;
}) {
    const [state, setState] = useState<GridState | null>(null);
    const [active, setActive] = useState<ActiveQuestion | null>(null);
    const [lastResult, setLastResult] = useState<GridCellResult | null>(null);
    const [ranking, setRanking] = useState<GridRanking[] | null>(null);
    const [error, setError] = useState("");
    const [countdown, setCountdown] = useState<number | null>(null);

    const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

    /** Lance un décompte visuel local (le serveur reste l'arbitre du temps). */
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
        const onState = (next: GridState) => {
            setState(next);
            if (next.phase !== "answering") setActive(null);
        };
        const onMemorize = ({ durationMs, state: next }: { durationMs: number; state: GridState }) => {
            setState(next);
            setRanking(null);
            setLastResult(null);
            startCountdown(durationMs);
        };
        const onTurn = () => setLastResult(null);
        const onQuestion = (payload: ActiveQuestion) => {
            // Deux émissions arrivent : une pour tout le salon (sans la
            // question) et une pour le joueur actif (avec). On garde celle qui
            // porte le plus d'information.
            setActive((prev) =>
                prev && prev.index === payload.index && prev.question && !payload.question
                    ? prev
                    : payload
            );
            startCountdown(payload.durationMs);
        };
        const onResult = (result: GridCellResult) => {
            setLastResult(result);
            setActive(null);
            setCountdown(null);
        };
        const onFinished = ({ ranking: r }: { ranking: GridRanking[] }) => {
            setRanking(r);
            setActive(null);
            setCountdown(null);
        };
        const onError = ({ message }: { message: string }) => {
            setError(message);
            setTimeout(() => setError(""), 4000);
        };

        socket.on(GRID_EVENTS.state, onState);
        socket.on(GRID_EVENTS.memorize, onMemorize);
        socket.on(GRID_EVENTS.turn, onTurn);
        socket.on(GRID_EVENTS.question, onQuestion);
        socket.on(GRID_EVENTS.result, onResult);
        socket.on(GRID_EVENTS.finished, onFinished);
        socket.on(GRID_EVENTS.error, onError);

        return () => {
            socket.off(GRID_EVENTS.state, onState);
            socket.off(GRID_EVENTS.memorize, onMemorize);
            socket.off(GRID_EVENTS.turn, onTurn);
            socket.off(GRID_EVENTS.question, onQuestion);
            socket.off(GRID_EVENTS.result, onResult);
            socket.off(GRID_EVENTS.finished, onFinished);
            socket.off(GRID_EVENTS.error, onError);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, [socket]);

    const myTurn = state?.currentPlayer === username;
    const me = useMemo(
        () => state?.players.find((p) => p.name === username) ?? null,
        [state, username]
    );

    const pick = (index: number) => {
        if (!myTurn || state?.phase !== "playing") return;
        socket.emit(GRID_ACTIONS.pick, { index });
    };

    if (!state) {
        return <div className="gridBoardWaiting">En attente du lancement de la partie…</div>;
    }

    const phaseLabel = () => {
        switch (state.phase) {
            case "memorize":
                return "Mémorisez les couleurs !";
            case "playing":
                return myTurn ? "À vous de jouer — choisissez une case" : `Au tour de ${state.currentPlayer}`;
            case "answering":
                return active?.player === username ? "Répondez !" : `${active?.player} répond…`;
            case "finished":
                return "Partie terminée";
            default:
                return "";
        }
    };

    return (
        <div className="gridBoardContainer">
            <header className="gridBoardHeader">
                <div className="gridPhase">
                    {phaseLabel()}
                    {countdown !== null && countdown > 0 && (
                        <span className="gridCountdown">{countdown}s</span>
                    )}
                </div>
                {me && (
                    <div className="gridMyTheme">
                        Votre thème :
                        <span className="gridThemeBadge" style={{ backgroundColor: me.color }}>
                            {me.themeTitle}
                        </span>
                    </div>
                )}
            </header>

            {error && <div className="gridBoardError">{error}</div>}

            <div className="gridBoardLayout">
                <div
                    className={`gridBoard ${state.phase === "memorize" ? "memorizing" : ""}`}
                    style={{ gridTemplateColumns: `repeat(${state.width}, 1fr)` }}
                >
                    {state.cells.map((cell) => {
                        const revealed = cell.color !== undefined;
                        const isActive = active?.index === cell.index;
                        const classes = [
                            "gridCell",
                            cell.taken ? "taken" : "",
                            isActive ? "active" : "",
                            myTurn && !cell.taken && state.phase === "playing" ? "pickable" : "",
                            cell.success === true ? "correct" : "",
                            cell.success === false ? "wrong" : "",
                        ].filter(Boolean).join(" ");

                        return (
                            <button
                                key={cell.index}
                                type="button"
                                className={classes}
                                style={revealed ? { backgroundColor: cell.color ?? NEUTRAL_COLOR } : undefined}
                                disabled={cell.taken || !myTurn || state.phase !== "playing"}
                                onClick={() => pick(cell.index)}
                                title={cell.themeTitle ?? undefined}
                            >
                                {cell.taken ? (
                                    <span className="gridCellMark">{cell.success ? "✓" : "✗"}</span>
                                ) : (
                                    <span className="gridCellIndex">{cell.index + 1}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <aside className="gridScoreboard">
                    <h3>Scores</h3>
                    <ul>
                        {[...state.players]
                            .sort((a, b) => b.score - a.score)
                            .map((p) => (
                                <li key={p.name} className={p.name === state.currentPlayer ? "current" : ""}>
                                    <span className="gridDot" style={{ backgroundColor: p.color }} />
                                    <span className="gridPlayerName">
                                        {p.name}{p.name === username ? " (vous)" : ""}
                                    </span>
                                    <strong>{p.score}</strong>
                                </li>
                            ))}
                    </ul>
                </aside>
            </div>

            {/* La question n'est envoyée qu'au joueur actif : les autres voient l'attente. */}
            {active?.question && active.player === username && (
                <div className="gridQuestionZone">
                    {active.themeTitle && (
                        <div className="gridQuestionTheme" style={{ backgroundColor: active.color }}>
                            {active.themeTitle}
                        </div>
                    )}
                    <GameQuestionAnswer
                        question={active.question}
                        socket={socket}
                        room_id=""
                        username={username}
                        canAnswer={true}
                        answerEvent={GRID_ACTIONS.answer}
                    />
                </div>
            )}

            {active && !active.question && active.player !== username && (
                <div className="gridQuestionZone waiting">
                    <p>
                        {active.player} répond
                        {active.themeTitle ? <> sur « {active.themeTitle} »</> : <> à une question générique</>}…
                    </p>
                </div>
            )}

            {lastResult && (
                <div className={`gridResult ${lastResult.correct ? "ok" : "ko"}`}>
                    <strong>{lastResult.player}</strong>
                    {lastResult.correct
                        ? ` a trouvé (+${lastResult.pointsEarned} pts)`
                        : " s'est trompé"}
                    {lastResult.themeTitle && <> — thème « {lastResult.themeTitle} »</>}
                    <RefereeOverrideButton
                        socket={socket}
                        isReferee={isReferee}
                        eligible={isRefereeEligible(lastResult.question?.mode, lastResult.givenAnswer)}
                        playerName={lastResult.player}
                        currentCorrect={lastResult.correct}
                    />
                </div>
            )}

            {ranking && (
                <div className="gridRanking">
                    <h2>Classement final</h2>
                    <ol>
                        {ranking.map((r) => (
                            <li key={r.name}>
                                <span className="gridDot" style={{ backgroundColor: r.color }} />
                                {r.name}
                                <strong>{r.score} pts</strong>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
