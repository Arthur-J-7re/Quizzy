import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../../context/socketContext";
import RoomLink from "../../tools/RoomLink";
import GridBoard from "../../component/Grid/GridBoard";
import PickBanBoard from "../../component/PickBan/PickBanBoard";
import TimerBoard from "../../component/Timer/TimerBoard";
import ShowListBoard from "../../component/Show/ShowListBoard";
import "./ShowPage.css";

/**
 * Nom de spectateur : ne correspond jamais à un joueur ni une équipe
 * inscrite, donc chaque affordance interactive de GridBoard/PickBanBoard/
 * TimerBoard (gatée par `myTurn`/`isMine`, jamais par une prop dédiée) reste
 * inerte ici — cet écran est un simple grand écran public, jamais un joueur.
 * Vrai aussi pour une étape Timer "dynamique" (EmissionTimerGame) : même
 * contrat d'événements TIMER_EVENTS que TimerGame, rien à distinguer côté
 * client.
 */
const SHOW_USERNAME = "__show__";

interface ShowPlayerInfo {
    name: string;
    connected: boolean;
}

interface RoomShowInfo {
    name: string;
    mode: string | null;
    teams: { id: string; name: string; members: [string, string]; score: number }[];
    players: ShowPlayerInfo[];
}

/** Grand écran public (`/play/show/:room_id`) : pas de compte, pas de pseudo, jamais d'action possible sur la partie. */
export default function ShowPage() {
    const { room_id } = useParams();
    const socket = useSocket();
    const [info, setInfo] = useState<RoomShowInfo | null>(null);
    // Distinct de `info` : "infoRoom" n'est pas forcément réémis au moment
    // précis où l'épreuve démarre (seulement si l'étape a resetPoint), donc on
    // s'appuie surtout sur l'événement "Starting game" pour ce booléen — sans
    // ça, l'écran restait bloqué sur "en attente" malgré une partie lancée.
    const [started, setStarted] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const [stepBanner, setStepBanner] = useState<{ ranking: any[]; nextStepName: string } | null>(null);
    const [emissionFinished, setEmissionFinished] = useState<{ ranking: any[] } | null>(null);

    useEffect(() => {
        if (!socket || !room_id) return;
        socket.emit("showJoin", { room_id });

        const onInfo = (data: any) => {
            if (!data) {
                setNotFound(true);
                return;
            }
            setInfo({
                name: data.name,
                mode: data.mode ?? null,
                teams: data.teams ?? [],
                players: Object.values(data.player ?? {}).map((p: any) => ({ name: p.name, connected: p.connected })),
            });
            setStarted(Boolean(data.started));
        };
        const onStartingGame = () => {
            setStarted(true);
            setStepBanner(null);
        };
        const onStepFinished = (data: any) => {
            setStarted(false);
            setStepBanner(data);
        };
        const onFinished = (data: any) => {
            setStarted(false);
            setEmissionFinished(data);
        };

        socket.on("infoRoom", onInfo);
        socket.on("Starting game", onStartingGame);
        socket.on("emission:stepFinished", onStepFinished);
        socket.on("emission:finished", onFinished);

        return () => {
            socket.off("infoRoom", onInfo);
            socket.off("Starting game", onStartingGame);
            socket.off("emission:stepFinished", onStepFinished);
            socket.off("emission:finished", onFinished);
        };
    }, [socket, room_id]);

    if (!room_id) {
        return <div className="showPageWaiting">Cette page n'existe pas</div>;
    }
    if (notFound) {
        return <div className="showPageWaiting">Il n'y a pas de salon avec cette id</div>;
    }
    if (!socket || !info) {
        return <div className="showPageWaiting">Connexion au serveur…</div>;
    }

    if (emissionFinished) {
        return (
            <div className="showPageRecap">
                <h1>Émission terminée !</h1>
                <ol>
                    {emissionFinished.ranking.map((r: any) => (
                        <li key={r.name}>#{r.rank} {r.name} — {r.score} pts au total</li>
                    ))}
                </ol>
            </div>
        );
    }

    if (stepBanner) {
        return (
            <div className="showPageRecap">
                <h1>Étape terminée</h1>
                <ol>
                    {[...stepBanner.ranking].sort((a, b) => b.score - a.score).map((r: any) => (
                        <li key={r.name}>{r.name} — {r.score} pts</li>
                    ))}
                </ol>
            </div>
        );
    }

    if (!started) {
        return (
            <div className="showPageLobby">
                <h1>{info.name}</h1>
                <p className="showPageLobbyHint">En attente du lancement…</p>
                <div className="showPageLobbyGrid">
                    <div className="showPageLobbyPlayers">
                        <h3>Joueurs</h3>
                        {info.players.length === 0 ? (
                            <p className="showPageLobbyEmpty">Personne pour l'instant.</p>
                        ) : (
                            <ul>
                                {info.players.map((p) => (
                                    <li key={p.name} className={p.connected ? "" : "disconnected"}>
                                        <span className="showPageLobbyDot" />
                                        {p.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <RoomLink roomId={room_id} />
                </div>
            </div>
        );
    }

    switch (info.mode) {
        case "GRID":
            return <GridBoard socket={socket} username={SHOW_USERNAME} />;
        case "PICKANDBAN":
            return <PickBanBoard socket={socket} username={SHOW_USERNAME} myTeamId={null} teams={info.teams} />;
        case "LIST":
            return <ShowListBoard socket={socket} />;
        case "TIMER":
            return <TimerBoard socket={socket} username={SHOW_USERNAME} isPresentator={false} withPresentator={false} />;
        default:
            return <div className="showPageWaiting">Cette étape ne s'affiche pas encore sur grand écran.</div>;
    }
}
