import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import RoomLink from "../../../tools/RoomLink";
import { useSocket } from "../../../context/socketContext";
import { Button, MenuItem, Select, TextField } from "@mui/material";
import { tryRequest } from "../../../tools/requestScheme";
import QuestionReceiver from "../../../component/GameQuestionAnswer/Mode/QuestionReceiver";
import GridBoard from "../../../component/Grid/GridBoard";
import PickBanBoard from "../../../component/PickBan/PickBanBoard";
import ListBoard from "../../../component/List/ListBoard";
import TimerBoard from "../../../component/Timer/TimerBoard";
import DuelBoard from "../../../component/Duel/DuelBoard";
import PointsBoard from "../../../component/Points/PointsBoard";
import BrBoard from "../../../component/BR/BrBoard";
import "../../Emission/emission.css";
import "./Room.css";

interface PlayerInfo {
    name: string;
    role: string;
    connected: boolean;
    score: number;
    /** Thèmes assignés à ce joueur, par index d'étape "dynamique". */
    themes: Record<number, { theme_id: number; title: string }>;
    eliminated: boolean;
    teamId: string | null;
}

interface TeamInfo {
    id: string;
    name: string;
    members: [string, string];
    score: number;
}

interface ThemeOption {
    theme_id: number;
    title: string;
    questions: number[];
}

export default function Room ({roomInfo, Username} : {roomInfo : any, Username : string}){

    const {room_id} = useParams();
    const socket = useSocket();
    const username = Username;

    const [roomName,setRoomName] = useState(roomInfo.name);
    const [players, setPlayers] = useState<Record<string, PlayerInfo>>(roomInfo.player ?? {});
    const [room, setRoom] = useState({room_id:room_id ?? "", name: roomInfo.name, emission: roomInfo.emission, numberOfParticipantMax: roomInfo.numberOfParticipantMax, withPresentator: Boolean(roomInfo.withPresentator), withRef: Boolean(roomInfo.withRef) });
    const [isCreator, setIsCreator] = useState(false);
    const [inGame, setInGame] = useState(false)
    const [mode, setMode] = useState<string | null>(roomInfo?.mode ?? null)
    const [availableThemes, setAvailableThemes] = useState<ThemeOption[]>([]);
    // Clé = `${stepIndex}:${username}` : une étape dynamique peut avoir besoin
    // d'un thème différent du même joueur qu'une autre étape dynamique.
    const [themeChoice, setThemeChoice] = useState<Record<string, number | "">>({});
    const [lobbyError, setLobbyError] = useState("");
    const [stepProgress, setStepProgress] = useState({ currentStep: 0, totalSteps: 1 });
    const [stepBanner, setStepBanner] = useState<{ ranking: any[]; nextStepName: string; nextStepMode: string } | null>(null);
    const [emissionFinished, setEmissionFinished] = useState<{ ranking: any[] } | null>(null);
    const [bonusMalus, setBonusMalus] = useState<{ ranking: { name: string; score: number }[] } | null>(null);
    const [bonusAdjustments, setBonusAdjustments] = useState<Record<string, number>>({});
    const [teams, setTeams] = useState<TeamInfo[]>(roomInfo.teams ?? []);

    const player = useMemo(() => Object.keys(players), [players]);
    // Étapes Grid/Timer "dynamiques" (thème par joueur) du déroulé : chacune a
    // besoin de son propre panneau d'assignation dans le lobby, puisqu'un même
    // joueur peut avoir un thème différent d'une étape dynamique à l'autre.
    const dynamicSteps = useMemo(
        () => (room.emission?.steps ?? [])
            .map((s: any, index: number) => ({ ...s, index }))
            .filter((s: any) => s.dynamicThemeStep),
        [room.emission?.steps]
    );
    // Le créateur du salon devient présentateur : il ne joue pas, juge les
    // réponses Timer, et valide le bonus/malus de fin d'épreuve.
    const isPresentator = isCreator && room.withPresentator;
    // Le créateur du salon devient arbitre : il ne joue pas non plus, et peut
    // corriger le verdict d'une réponse libre pendant la pause qui suit
    // chaque résolution (List/Grid/PickBan/Points/BR — pas Timer).
    const isReferee = isCreator && room.withRef;
    // Un présentateur ne joue aucune étape : lui réclamer un thème (dynamique)
    // bloquait le lancement indéfiniment, puisqu'il n'en reçoit jamais.
    const isPlayerPresentator = (name: string) => players[name]?.role === "creator" && room.withPresentator;
    // En mode équipe, les classements (Timer/Pick&Ban) sont keyed par id
    // d'équipe ("team-1") : sans résolution, les récaps affichaient cet id
    // brut au lieu du nom lisible ("Duo 1").
    const displayName = (name: string) => teams.find((t) => t.id === name)?.name ?? name;

    useEffect(() => {
        if (socket){
            socket.emit("infoRoom", room_id)
        }
        if (socket){
            socket.on("infoRoom", (data) => {
                setRoomName(data.name);
                setPlayers(data.player ?? {});
                setRoom({room_id:data.room_id, name:data.name, emission: data.emission, numberOfParticipantMax: data.numberOfParticipantMax, withPresentator: Boolean(data.withPresentator), withRef: Boolean(data.withRef)});
                setMode(data.mode ?? null);
                setStepProgress({ currentStep: data.currentStep ?? 0, totalSteps: data.totalSteps ?? 1 });
                setTeams(data.teams ?? []);
                if (data.started) setInGame(true);
            })
            socket.on("ownerOfRoom", () => {
                setIsCreator(true);
            })
            socket.on("aPlayerHasJoined", () => {
                // La liste des joueurs se met déjà à jour via "infoRoom",
                // rediffusé par le serveur à chaque arrivée : plus besoin
                // d'une alerte bloquante ici.
            })
            socket.on("Starting game", () => {
                setInGame(true);
                setStepBanner(null);
            })
            socket.on("emission:error", ({ message }: { message: string }) => {
                setLobbyError(message);
                setTimeout(() => setLobbyError(""), 5000);
            })
            // Une étape vient de se terminer : retour au lobby en attendant
            // que le MJ lance la suivante (le score cumulé est déjà à jour
            // côté serveur, infoRoom le reflète juste après).
            socket.on("emission:stepFinished", (data) => {
                setInGame(false);
                setStepBanner(data);
                setBonusMalus(null);
            })
            socket.on("emission:finished", (data) => {
                setInGame(false);
                setEmissionFinished(data);
                setBonusMalus(null);
            })
            // Épreuve terminée, présentateur actif : écran bonus/malus avant
            // de passer à la suite (cf. emission:stepFinished/finished, émis
            // une fois qu'il valide via emission:confirmBonusMalus).
            socket.on("emission:bonusMalus", (data) => {
                setInGame(false);
                setBonusAdjustments({});
                setBonusMalus(data);
            })
        }
    },[socket])

    // Le MJ a besoin de la liste de ses thèmes disponibles pour les distribuer.
    useEffect(() => {
        if (!isCreator || dynamicSteps.length === 0) return;
        const load = async () => {
            const themes = await tryRequest<ThemeOption[]>("/theme/available-themes", "GET", {}, []);
            setAvailableThemes((themes ?? []).filter((t) => t.questions.length > 0));
        };
        load();
    }, [isCreator, dynamicSteps.length]);

    if (!room_id){
        return (<div className="roomMissingPage">Cette page n'existe pas</div>)
    }

    const startGame = () => {
        if (socket){
            socket.emit("startGame", ({username : username, room_id: room.room_id}))
        }
    }

    const assignTheme = (stepIndex: number, target: string) => {
        const key = `${stepIndex}:${target}`;
        const theme_id = themeChoice[key];
        if (!socket || theme_id === "" || theme_id === undefined) return;
        socket.emit("emission:assignPlayerTheme", { username: target, stepIndex, theme_id });
    }

    const confirmBonusMalus = () => {
        if (!socket) return;
        socket.emit("emission:confirmBonusMalus", { adjustments: bonusAdjustments });
    }

    // Filet de rattrapage manuel : le présentateur peut remettre les scores à
    // zéro même quand ce n'était pas prévu par l'option resetPoint de l'étape.
    const resetScores = () => {
        if (!socket) return;
        if (!window.confirm("Remettre tous les scores à zéro ?")) return;
        socket.emit("emission:resetScores");
    }

    const renderPlayerList = () => {
        return(
            <div className="roomPlayerList">
                {player.map((name : string)=>{
                    const connected = players[name]?.connected ?? true;
                    return (
                        <div key={name} className={connected ? "roomPlayerRow" : "roomPlayerRow disconnected"}>
                            <span className="roomPlayerDot" />
                            <span className={name === username ? "roomPlayerName you" : "roomPlayerName"}>
                                {name}{name === username ? " (vous)" : ""}
                            </span>
                        </div>
                    )
                })}
            </div>
        )
    }

    // Une paire (étape dynamique, joueur actif) manque un thème : bloque le
    // lancement dès le lobby initial, pas seulement juste avant cette étape.
    const missingTheme = dynamicSteps.flatMap((s: any) =>
        player
            .filter((name) => !players[name]?.eliminated && !isPlayerPresentator(name) && !players[name]?.themes?.[s.index])
            .map((name) => `${name} (étape ${s.index + 1})`)
    );
    const canStart = missingTheme.length === 0;

    const renderThemeAssignment = () => {
        if (dynamicSteps.length === 0) return null;
        return (
            <>
                {dynamicSteps.map((step: any) => (
                    <div key={step.index} className="emissionLobbyThemes">
                        <h3>Thèmes — étape {step.index + 1} ({step.name || (step.mode === "GRID" ? "Grid" : "Timer")})</h3>
                        {player.filter((name) => !isPlayerPresentator(name)).map((name) => {
                            const info = players[name];
                            const assigned = info?.themes?.[step.index];
                            if (assigned) {
                                return (
                                    <div key={name} className="emissionLobbyThemeRow">
                                        <span className="emissionLobbyPlayerName">{name}</span>
                                        <span className="emissionThemeAssigned">{assigned.title}</span>
                                    </div>
                                );
                            }
                            if (!isCreator) {
                                return (
                                    <div key={name} className="emissionLobbyThemeRow">
                                        <span className="emissionLobbyPlayerName">{name}</span>
                                        <span className="emissionThemeMissing">en attente d'un thème du MJ…</span>
                                    </div>
                                );
                            }
                            const key = `${step.index}:${name}`;
                            return (
                                <div key={name} className="emissionLobbyThemeRow">
                                    <span className="emissionLobbyPlayerName">{name}</span>
                                    <Select
                                        size="small"
                                        value={themeChoice[key] ?? ""}
                                        displayEmpty
                                        onChange={(e) => setThemeChoice((prev) => ({ ...prev, [key]: e.target.value as number }))}
                                    >
                                        <MenuItem value="" disabled>Choisir un thème</MenuItem>
                                        {availableThemes.map((t) => (
                                            <MenuItem key={t.theme_id} value={t.theme_id}>{t.title}</MenuItem>
                                        ))}
                                    </Select>
                                    <Button size="small" onClick={() => assignTheme(step.index, name)}>Assigner</Button>
                                </div>
                            );
                        })}
                    </div>
                ))}
                {lobbyError && <div className="emissionStartHint">{lobbyError}</div>}
            </>
        );
    }

    const renderTeams = () => {
        if (teams.length === 0) return null;
        return (
            <div className="emissionLobbyThemes">
                <h3>Équipes</h3>
                {teams.map((t) => (
                    <div key={t.id} className="emissionLobbyThemeRow">
                        <span className="emissionLobbyPlayerName">
                            {t.name}{t.members.includes(username) ? " (vous)" : ""}
                        </span>
                        <span className={t.members.includes(username) ? "emissionThemeAssigned" : ""}>
                            {t.members.join(" & ")}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    const renderBonusMalus = () => {
        if (!bonusMalus) return null;
        return (
            <div className="emissionLobbyThemes">
                <h3>Bonus/malus de fin d'épreuve</h3>
                {isPresentator ? (
                    <p className="emissionHint">
                        Ajustez le score de chacun pour cette épreuve avant de valider (réponses
                        mal jugées, imprévus...).
                    </p>
                ) : (
                    <p className="emissionThemeMissing">Le présentateur ajuste les scores…</p>
                )}
                {[...bonusMalus.ranking].sort((a, b) => b.score - a.score).map((r) => (
                    <div key={r.name} className="emissionLobbyThemeRow">
                        <span className="emissionLobbyPlayerName">{displayName(r.name)}</span>
                        <span>{r.score} pts sur cette épreuve</span>
                        {isPresentator ? (
                            <TextField
                                size="small"
                                type="number"
                                label="Bonus/malus"
                                value={bonusAdjustments[r.name] ?? 0}
                                onChange={(e) => setBonusAdjustments((prev) => ({ ...prev, [r.name]: parseInt(e.target.value) || 0 }))}
                            />
                        ) : (
                            Boolean(bonusAdjustments[r.name]) && (
                                <span>{bonusAdjustments[r.name] > 0 ? "+" : ""}{bonusAdjustments[r.name]}</span>
                            )
                        )}
                    </div>
                ))}
                {isPresentator && (
                    <Button onClick={() => confirmBonusMalus()}>Valider et continuer</Button>
                )}
            </div>
        );
    }

    const renderStepBanner = () => {
        if (!stepBanner) return null;
        return (
            <div className="emissionLobbyThemes">
                <h3>Étape terminée : {stepBanner.nextStepName ? "en route vers " + stepBanner.nextStepName : "suivante"}</h3>
                <ol>
                    {[...stepBanner.ranking].sort((a,b)=>b.score-a.score).map((r:any) => (
                        <li key={r.name}>{displayName(r.name)} — {r.score} pts sur cette étape</li>
                    ))}
                </ol>
                {isCreator && <p className="emissionHint">Cliquez sur « Commencer la partie » pour lancer l'étape suivante ({stepBanner.nextStepMode}).</p>}
            </div>
        );
    }

    const renderFinalRanking = () => {
        if (!emissionFinished) return null;
        return (
            <div className="emissionLobbyThemes">
                <h2>Émission terminée !</h2>
                <ol>
                    {emissionFinished.ranking.map((r:any) => (
                        <li key={r.name}>#{r.rank} {displayName(r.name)} — {r.score} pts au total</li>
                    ))}
                </ol>
            </div>
        );
    }

    const renderPage = () => {
        if (emissionFinished) return (
            <div className="roomPage">
                <div className="roomContent">{renderFinalRanking()}</div>
            </div>
        );
        if (bonusMalus) return (
            <div className="roomPage">
                <div className="roomContent">{renderBonusMalus()}</div>
            </div>
        );
        return (
        <div className="roomPage">
            <div className="roomContent">
                <header className="roomHeaderCard">
                    <h1>{roomName}</h1>
                    {room.emission?.title && <p className="roomEmissionTitle">{room.emission.title}</p>}
                    {stepProgress.totalSteps > 1 && (
                        <div className="roomStepProgress">
                            Étape {Math.min(stepProgress.currentStep + 1, stepProgress.totalSteps)} / {stepProgress.totalSteps}
                        </div>
                    )}
                    {isPresentator && (
                        <div className="roomPresentatorTools">
                            <a
                                className="roomShowLink"
                                href={`${window.location.origin}/play/show/${room_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Ouvrir l'écran /show
                            </a>
                            <Button className="roomResetScoresButton" onClick={() => resetScores()}>
                                Réinitialiser les scores
                            </Button>
                        </div>
                    )}
                </header>

                {renderStepBanner()}

                <div className="roomLobbyGrid">
                    <div className="roomLobbyMain">
                        <div className="emissionLobbyThemes">
                            <h3>Joueurs</h3>
                            <p className="roomYourName">Votre nom inGame : <strong>{username}</strong></p>
                            {renderPlayerList()}
                        </div>
                        {renderTeams()}
                        {renderThemeAssignment()}
                        {isCreator && (
                            <div className="roomStartRow">
                                <Button className="roomStartButton" disabled={!canStart} onClick={()=>startGame()}>Commencer la partie</Button>
                                {!canStart && (
                                    <div className="emissionStartHint">
                                        Il manque un thème pour : {missingTheme.join(", ")}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="roomLobbySide">
                        <RoomLink roomId={room_id} />
                    </div>
                </div>
            </div>
        </div> )
    }
    if (roomName){
        if (!inGame){
            return renderPage();
        }
        return (
            <div>
                {mode === "GRID" && socket ? (
                    <GridBoard socket={socket} username={username} isReferee={isReferee} />
                ) : mode === "PICKANDBAN" && socket ? (
                    <PickBanBoard
                        socket={socket}
                        username={username}
                        myTeamId={teams.find((t) => t.members.includes(username))?.id ?? null}
                        teams={teams}
                        isReferee={isReferee}
                    />
                ) : mode === "LIST" && socket ? (
                    <ListBoard socket={socket} username={username} isPresentator={isPresentator} withPresentator={room.withPresentator} isReferee={isReferee} />
                ) : mode === "TIMER" && socket ? (
                    <TimerBoard socket={socket} username={username} isPresentator={isPresentator} withPresentator={room.withPresentator} />
                ) : mode === "DUEL" && socket ? (
                    <DuelBoard socket={socket} username={username} />
                ) : mode === "POINTS" && socket ? (
                    <PointsBoard socket={socket} username={username} isPresentator={isPresentator} withPresentator={room.withPresentator} isReferee={isReferee} />
                ) : mode === "BR" && socket ? (
                    <BrBoard socket={socket} username={username} isPresentator={isPresentator} withPresentator={room.withPresentator} isReferee={isReferee} />
                ) : (
                    <QuestionReceiver socket={socket} room_id={room_id} username={username}/>
                )}
            </div>
        )
    } else {
        return (<div className="roomMissingPage">Il n'y a pas de salon avec cette id</div>)
    }

}
