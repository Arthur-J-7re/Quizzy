import { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import {
    LIST_EVENTS,
    SHOW_EVENTS,
    type ListQuestionPayload,
    type ListQuestionResult,
    type ListState,
    type Question,
    type ShowView,
} from "shared-types";
import { formatGivenAnswer } from "../List/formatGivenAnswer";
import "./ShowListBoard.css";

/**
 * Propositions affichées en direct sur l'écran public : uniquement pour un
 * QCM natif, ou une question DCC forcée en Carré (même sous-mode imposé à
 * tout le monde, donc rien à cacher). Un DCC libre n'affiche jamais rien —
 * chaque joueur choisit son propre sous-mode (Cash/Carré/Duo), donner les
 * propositions d'un sous-mode reviendrait à indiquer aux autres ce que
 * quelqu'un joue, ou pire, à lui souffler des choix qu'il n'a pas demandés.
 */
function renderChoices(question: Question) {
    if (question.mode === "QCM") {
        const order = question.choiceOrder ?? [1, 2, 3, 4];
        return (
            <div className="showListChoices">
                {order.map((idx) => (
                    <div key={idx} className="showListChoice">{(question.choices as any)[`ans${idx}`]}</div>
                ))}
            </div>
        );
    }
    if (question.mode === "DCC" && (question as any).forcedDccMode === "CARRE") {
        const order = (question as any).choiceOrder ?? [1, 2, 3, 4];
        return (
            <div className="showListChoices">
                {order.map((idx: number) => (
                    <div key={idx} className="showListChoice">{(question as any).carre?.[`ans${idx}`]}</div>
                ))}
            </div>
        );
    }
    return null;
}

/**
 * Écran `/show` du mode LIST : pas de formulaire de réponse (contrairement à
 * ListBoard, tout le monde répond à la même question donc rien ne gate
 * l'affichage par identité côté joueur) — seul le présentateur pilote ce qui
 * s'affiche ici via `show:setView` (cf. ListBoard.renderHostControls).
 */
export default function ShowListBoard({ socket }: { socket: Socket }) {
    const [state, setState] = useState<ListState | null>(null);
    const [active, setActive] = useState<ListQuestionPayload | null>(null);
    const [lastResult, setLastResult] = useState<ListQuestionResult | null>(null);
    const [view, setView] = useState<ShowView>("live");

    useEffect(() => {
        const onState = (next: ListState) => setState(next);
        const onQuestion = (payload: ListQuestionPayload) => setActive(payload);
        const onResult = (result: ListQuestionResult) => {
            setLastResult(result);
            setActive(null);
        };
        const onFinished = () => setActive(null);
        const onShowState = ({ view: next }: { view: ShowView }) => setView(next);

        socket.on(LIST_EVENTS.state, onState);
        socket.on(LIST_EVENTS.question, onQuestion);
        socket.on(LIST_EVENTS.result, onResult);
        socket.on(LIST_EVENTS.finished, onFinished);
        socket.on(SHOW_EVENTS.state, onShowState);

        return () => {
            socket.off(LIST_EVENTS.state, onState);
            socket.off(LIST_EVENTS.question, onQuestion);
            socket.off(LIST_EVENTS.result, onResult);
            socket.off(LIST_EVENTS.finished, onFinished);
            socket.off(SHOW_EVENTS.state, onShowState);
        };
    }, [socket]);

    if (!state) {
        return <div className="showListWaiting">En attente du lancement de la partie…</div>;
    }

    if (view === "scoreboard") {
        return (
            <div className="showListScoreboard">
                <h2>Classement</h2>
                <ol>
                    {[...state.players].sort((a, b) => b.score - a.score).map((p) => (
                        <li key={p.name}>
                            <span>{p.name}</span>
                            <strong>{p.score} pts</strong>
                        </li>
                    ))}
                </ol>
            </div>
        );
    }

    if (view === "results") {
        if (!lastResult) {
            return <div className="showListWaiting">Pas encore de résultat à afficher.</div>;
        }
        return (
            <div className="showListResult">
                <h2>{lastResult.question.title}</h2>
                <ul>
                    {lastResult.answers.map((a) => {
                        const hasAnswer = a.given !== null && a.given !== undefined && a.given !== "";
                        return (
                            <li key={a.player} className={!hasAnswer ? "neutral" : a.correct ? "ok" : "ko"}>
                                <span>{a.player}</span>
                                <span>{hasAnswer ? formatGivenAnswer(lastResult.question, a.given) : "Pas de réponse"}</span>
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

    return (
        <div className="showListLive">
            <div className="showListPhase">
                {state.phase === "finished" ? "Partie terminée" : `Question ${state.index + 1} / ${state.total}`}
            </div>
            {active?.question ? (
                <>
                    <h2 className="showListQuestionTitle">{active.question.title}</h2>
                    {renderChoices(active.question)}
                </>
            ) : (
                <p className="showListWaitingInline">En attente de la prochaine question…</p>
            )}
        </div>
    );
}
