import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import {
    PICKBAN_ACTIONS,
    PICKBAN_EVENTS,
    type PickBanQuestionPayload,
    type PickBanQuestionResult,
    type PickBanRanking,
    type PickBanState,
    type PickBanThemeComplete,
} from "shared-types";
import GameQuestionAnswer from "../GameQuestionAnswer/GameQuestionAnswer";
import RefereeOverrideButton, { isRefereeEligible } from "../Referee/RefereeOverrideButton";
import "./PickBanBoard.css";

/**
 * Palette catégorielle (identité, jamais cyclée dans cet ordre) : une couleur
 * fixe par joueur/duo, dans l'ordre de `state.players`, pour repérer d'un
 * coup d'œil qui possède quoi sur le plateau (cf. dataviz skill — ordre déjà
 * validé CVD/contraste, pas de raison d'en changer).
 */
const IDENTITY_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

const hexToRgba = (hex: string, alpha: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

/**
 * Mode duo : `myTeamId` (id d'équipe si le joueur en a une) remplace son
 * identité pour tous les tours/actions — le serveur raisonne aussi en id
 * d'équipe dans ce cas (cf. PickBanGame.actorIdentity). `teams` sert
 * uniquement à afficher un nom lisible ("Duo 1") plutôt que l'id brut.
 */
export default function PickBanBoard({
    socket,
    username,
    myTeamId = null,
    teams = [],
    isReferee = false,
}: {
    socket: Socket;
    username: string;
    myTeamId?: string | null;
    teams?: { id: string; name: string }[];
    isReferee?: boolean;
}) {
    const [state, setState] = useState<PickBanState | null>(null);
    const [activeQuestion, setActiveQuestion] = useState<PickBanQuestionPayload | null>(null);
    const [lastResult, setLastResult] = useState<PickBanQuestionResult | null>(null);
    const [themeComplete, setThemeComplete] = useState<PickBanThemeComplete | null>(null);
    const [ranking, setRanking] = useState<PickBanRanking[] | null>(null);
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
        const onState = (next: PickBanState) => {
            setState(next);
            if (next.phase !== "answering") setActiveQuestion(null);
            if (next.phase === "draft") startCountdown(next.remainingMs ?? 0);
        };
        const onQuestion = (payload: PickBanQuestionPayload) => {
            setActiveQuestion((prev) =>
                prev && prev.theme_id === payload.theme_id && prev.questionIndex === payload.questionIndex && prev.question && !payload.question
                    ? prev
                    : payload
            );
            setThemeComplete(null);
            setLastResult(null);
            startCountdown(payload.durationMs);
        };
        const onResult = (result: PickBanQuestionResult) => {
            setLastResult(result);
        };
        const onThemeComplete = (payload: PickBanThemeComplete) => {
            setThemeComplete(payload);
            setActiveQuestion(null);
            setLastResult(null);
        };
        const onFinished = ({ ranking: r }: { ranking: PickBanRanking[] }) => {
            setRanking(r);
            setActiveQuestion(null);
        };
        const onError = ({ message }: { message: string }) => {
            setError(message);
            setTimeout(() => setError(""), 4000);
        };

        socket.on(PICKBAN_EVENTS.state, onState);
        socket.on(PICKBAN_EVENTS.question, onQuestion);
        socket.on(PICKBAN_EVENTS.result, onResult);
        socket.on(PICKBAN_EVENTS.themeComplete, onThemeComplete);
        socket.on(PICKBAN_EVENTS.finished, onFinished);
        socket.on(PICKBAN_EVENTS.error, onError);

        return () => {
            socket.off(PICKBAN_EVENTS.state, onState);
            socket.off(PICKBAN_EVENTS.question, onQuestion);
            socket.off(PICKBAN_EVENTS.result, onResult);
            socket.off(PICKBAN_EVENTS.themeComplete, onThemeComplete);
            socket.off(PICKBAN_EVENTS.finished, onFinished);
            socket.off(PICKBAN_EVENTS.error, onError);
            if (countdownTimer.current) clearInterval(countdownTimer.current);
        };
    }, [socket]);

    const myIdentity = myTeamId ?? username;
    const displayName = (id: string) => teams.find((t) => t.id === id)?.name ?? id;
    const myTurn = state?.currentPlayer === myIdentity;
    const colorFor = (id: string) => {
        const index = state?.players.findIndex((p) => p.name === id) ?? -1;
        return IDENTITY_COLORS[(index < 0 ? 0 : index) % IDENTITY_COLORS.length];
    };

    const pick = (theme_id: number) => {
        if (!myTurn || state?.phase !== "draft" || state.draftAction !== "pick") return;
        socket.emit(PICKBAN_ACTIONS.draftPick, { theme_id });
    };
    const ban = (theme_id: number) => {
        if (!myTurn || state?.phase !== "draft" || state.draftAction !== "ban") return;
        socket.emit(PICKBAN_ACTIONS.draftBan, { theme_id });
    };
    // La cible n'est plus choisie par le joueur : imposée par le roulement
    // serveur (state.forcedGiveTarget), cf. PickBanGame.forcedGiveTarget.
    const give = (theme_id: number) => {
        if (!myTurn || state?.phase !== "draft" || state.draftAction !== "give") return;
        socket.emit(PICKBAN_ACTIONS.draftGive, { theme_id });
    };
    const choose = (theme_id: number) => {
        if (!myTurn || state?.phase !== "playing") return;
        socket.emit(PICKBAN_ACTIONS.choose, { theme_id });
    };

    if (!state) {
        return <div className="pbBoardWaiting">En attente du lancement de la partie…</div>;
    }

    const draftActionLabel = (action: typeof state.draftAction) => {
        if (action === "pick") return "prendre un thème";
        if (action === "ban") return "bannir un thème";
        if (action === "give") return `donner un thème à ${displayName(state.forcedGiveTarget ?? "")}`;
        return "";
    };

    const phaseLabel = () => {
        switch (state.phase) {
            case "draft":
                return myTurn
                    ? `À vous : ${draftActionLabel(state.draftAction)}`
                    : `${displayName(state.currentPlayer ?? "")} doit ${draftActionLabel(state.draftAction)}`;
            case "playing":
                return myTurn ? "Choisissez un de vos thèmes" : `${displayName(state.currentPlayer ?? "")} choisit son thème`;
            case "answering":
                return activeQuestion?.player === myIdentity ? "Répondez !" : `${displayName(activeQuestion?.player ?? "")} répond…`;
            case "finished":
                return "Partie terminée";
            default:
                return "";
        }
    };

    // Une fois la draft terminée, la grille de thèmes (grisée/coloriée par
    // propriétaire) ne sert plus à rien : tout le monde bascule sur une
    // colonne équipes/score/thème, plus lisible pour la suite de la partie.
    const draftDone = state.phase !== "draft";

    return (
        <div className="pbBoardContainer">
            <header className="pbBoardHeader">
                <div className="pbPhase">
                    {phaseLabel()}
                    {countdown !== null && countdown > 0 && <span className="pbCountdown">{countdown}s</span>}
                </div>
            </header>

            {error && <div className="pbBoardError">{error}</div>}

            {draftDone ? (
                <div className="pbTeamColumn">
                    {[...state.players].sort((a, b) => b.score - a.score).map((p) => (
                        <div key={p.name} className={p.name === state.currentPlayer ? "pbTeamColumnRow current" : "pbTeamColumnRow"}>
                            <span className="pbPlayerDot" style={{ backgroundColor: colorFor(p.name) }} />
                            <span className="pbTeamColumnName">
                                {displayName(p.name)}{p.name === myIdentity ? " (vous)" : ""}
                            </span>
                            <strong className="pbTeamColumnScore">{p.score} pts</strong>
                            <div className="pbTeamThemes">
                                {state.themes.filter((t) => t.owner === p.name).map((t) => {
                                    // Le choix du thème à jouer se fait ici (ex-bouton "Répondre"
                                    // de la grille, retiré une fois la draft terminée).
                                    const canChooseThis = myTurn && state.phase === "playing" && t.owner === myIdentity && !t.played;
                                    if (canChooseThis) {
                                        return (
                                            <button
                                                key={t.theme_id}
                                                type="button"
                                                className="pbTeamThemeTag choosable"
                                                onClick={() => choose(t.theme_id)}
                                            >
                                                {t.title} — Répondre ({t.questionCount} q.)
                                            </button>
                                        );
                                    }
                                    return (
                                        <span key={t.theme_id} className={t.played ? "pbTeamThemeTag played" : "pbTeamThemeTag"}>
                                            {t.title}{t.played ? " ✓" : ""}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
            <div className="pbBoardLayout">
                <div className="pbThemeBoard">
                    {state.themes.map((theme) => {
                        const isMine = theme.owner === myIdentity;
                        const canAct = myTurn && state.phase === "draft" && theme.status === "available";
                        const canChoose = myTurn && state.phase === "playing" && isMine && !theme.played;
                        // Un thème possédé se pare de la couleur de son propriétaire
                        // (joueur ou duo) plutôt que du vert générique d'avant : on
                        // repère au premier coup d'œil qui a pris quoi. Banni reste
                        // grisé, sans couleur d'identité (personne ne le possède).
                        const ownerColor = theme.status === "owned" && theme.owner ? colorFor(theme.owner) : null;

                        const classes = [
                            "pbCell",
                            theme.status,
                            theme.played ? "played" : "",
                            canChoose ? "choosable" : "",
                        ].filter(Boolean).join(" ");
                        const cellStyle = ownerColor
                            ? { borderColor: ownerColor, background: hexToRgba(ownerColor, 0.1) }
                            : undefined;
                        const tagStyle = ownerColor
                            ? { backgroundColor: hexToRgba(ownerColor, 0.2), color: ownerColor }
                            : undefined;

                        return (
                            <div key={theme.theme_id} className={classes} style={cellStyle}>
                                {theme.img ? (
                                    <img src={theme.img} alt="" className="pbCellImg" />
                                ) : (
                                    <div className="pbCellImgPlaceholder">{theme.title}</div>
                                )}
                                <div className="pbCellTitle">{theme.title}</div>
                                <div className="pbCellMeta">
                                    {theme.status === "banned" && <span className="pbTag banned">Banni</span>}
                                    {theme.status === "owned" && (
                                        <span className="pbTag owned" style={tagStyle}>
                                            {displayName(theme.owner ?? "")}{theme.played ? " ✓" : ""}
                                        </span>
                                    )}
                                </div>

                                {canAct && (
                                    <div className="pbCellActions">
                                        {state.draftAction === "pick" && (
                                            <button type="button" onClick={() => pick(theme.theme_id)}>Prendre</button>
                                        )}
                                        {state.draftAction === "ban" && (
                                            <button type="button" className="danger" onClick={() => ban(theme.theme_id)}>Bannir</button>
                                        )}
                                        {state.draftAction === "give" && (
                                            <button type="button" onClick={() => give(theme.theme_id)}>
                                                Donner à {displayName(state.forcedGiveTarget ?? "")}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {canChoose && (
                                    <button type="button" className="pbChooseButton" onClick={() => choose(theme.theme_id)}>
                                        Répondre ({theme.questionCount} q.)
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                <aside className="pbScoreboard">
                    <h3>Scores</h3>
                    <ul>
                        {[...state.players].sort((a, b) => b.score - a.score).map((p) => (
                            <li key={p.name} className={p.name === state.currentPlayer ? "current" : ""}>
                                <span className="pbPlayerDot" style={{ backgroundColor: colorFor(p.name) }} />
                                <span className="pbPlayerName">{displayName(p.name)}{p.name === myIdentity ? " (vous)" : ""}</span>
                                <span className="pbOwnedCount">{p.ownedThemeIds.length} thème{p.ownedThemeIds.length !== 1 ? "s" : ""}</span>
                                <strong>{p.score}</strong>
                            </li>
                        ))}
                    </ul>
                </aside>
            </div>
            )}

            {activeQuestion?.question && activeQuestion.player === myIdentity && (
                <div className="pbQuestionZone">
                    <div className="pbQuestionProgress">
                        Question {activeQuestion.questionIndex + 1} / {activeQuestion.questionsTotal}
                    </div>
                    <GameQuestionAnswer
                        question={activeQuestion.question}
                        socket={socket}
                        room_id=""
                        username={username}
                        canAnswer={true}
                        answerEvent={PICKBAN_ACTIONS.answer}
                    />
                </div>
            )}

            {activeQuestion && !activeQuestion.question && activeQuestion.player !== myIdentity && (
                <div className="pbQuestionZone waiting">
                    <p>
                        {displayName(activeQuestion.player ?? "")} répond à la question {activeQuestion.questionIndex + 1} / {activeQuestion.questionsTotal}…
                    </p>
                </div>
            )}

            {lastResult && !themeComplete && (
                <div className={`pbQuestionResult ${lastResult.correct ? "ok" : "ko"}`}>
                    <strong>{displayName(lastResult.player)}</strong>
                    {lastResult.correct ? ` a trouvé (+${lastResult.pointsEarned} pts)` : " s'est trompé"}
                    <RefereeOverrideButton
                        socket={socket}
                        isReferee={isReferee}
                        eligible={isRefereeEligible(lastResult.question?.mode, lastResult.givenAnswer)}
                        playerName={lastResult.player}
                        currentCorrect={lastResult.correct}
                    />
                </div>
            )}

            {themeComplete && (
                <div className="pbThemeResult">
                    <strong>{displayName(themeComplete.player)}</strong> a répondu juste à{" "}
                    {themeComplete.correctCount} / {themeComplete.totalQuestions} question(s)
                    (+{themeComplete.pointsEarned} pts)
                </div>
            )}

            {ranking && (
                <div className="pbRanking">
                    <h2>Classement final</h2>
                    <ol>
                        {ranking.map((r) => (
                            <li key={r.name}>
                                {displayName(r.name)}
                                <strong>{r.score} pts</strong>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
}
