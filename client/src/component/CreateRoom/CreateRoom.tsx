import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InputLabel, Select, MenuItem, Button, Switch, FormControl,Checkbox, TextField, Input} from "@mui/material";
import { useSocket } from "../../context/socketContext";

import { tryRequest } from "../../tools/requestScheme";
import { AuthContext } from "../../context/authentContext";
import { getForcedQuestionTypeOptions } from "../../tools/props/Props";
import TagFilterPicker from "../TagPicker/TagFilterPicker";
import BaremeSelector, { type ScoringMode } from "../Bareme/BaremeSelector";
import "./createRoom.css"



const Mode = ['Points', 'BR', 'Grid', 'PickBan', 'Personalise']

export default function CreateRoom () {
    const [name, setName] = useState("");

    const [withRef, setWithRef] = useState(false);
    const [mode,setMode] = useState("Points");
    const [numberOfLife, setLife] = useState(3)
    const [quizzIdForModePoints, setQuizzIdForModePoints] = useState<string>("");
    // Mode Points : soit un quizz List existant (comme avant), soit un tirage
    // dynamique par tag (cf. server/function/getterPlay.ts) — au choix.
    const [pointsQuizzMode, setPointsQuizzMode] = useState<"dynamic" | "existing">("dynamic");
    const [pointsForcedType, setPointsForcedType] = useState("ALL");
    const [pointsScoringMode, setPointsScoringMode] = useState<ScoringMode>("CLASSIC");
    const [pointsCorrectPoints, setPointsCorrectPoints] = useState(1);
    const [pointsWrongPoints, setPointsWrongPoints] = useState(0);
    const [pointsRoundCount, setPointsRoundCount] = useState(10);
    const [pointsWantedTags, setPointsWantedTags] = useState<string[]>([]);
    const [pointsBlockedTags, setPointsBlockedTags] = useState<string[]>([]);
    const [brForcedType, setBrForcedType] = useState("ALL");
    const [brWantedTags, setBrWantedTags] = useState<string[]>([]);
    const [brBlockedTags, setBrBlockedTags] = useState<string[]>([]);
    const [withPresentator, setWithPresentator] = useState(false);
    const [numberOfParticipantMax, setNumberOfParticipantMax] = useState(10);
    const [isPrivate, setIsPrivate] = useState(false);
    const [availableQuizz, setAvailableQuizz] = useState<any[]>();
    const [password, setPassword] = useState("");
    const [availableEmissions, setAvailableEmissions] = useState<any[]>([]);
    const [selectedEmissionId, setSelectedEmissionId] = useState<any>("");



    const socket = useSocket();
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    const [username, setUsername] = useState(auth?.user?.Username ? auth.user.Username : "")

    useEffect(() => {
        if (socket){
            socket.on("roomCreated", (data)=>{
                // Le serveur renvoie maintenant success:false quand aucune room
                // n'a pu être créée, au lieu d'un roomId vers un salon fantôme.
                if (!data?.success || !data.roomId){
                    console.error("création de salon refusée :", data?.message);
                    return;
                }
                navigate(`/play/room/${data.roomId}`);
            })
        }
    }, [socket])

    useEffect(() => {
        const fun = async() => {
            const responseQuizz = await tryRequest<any[]>(
                auth?.user ? `/quizz/available-quizz?id=${auth.user.id}` : '/quizz/available-quizz',
                "GET", {}, []
            ) ?? [];
            if (responseQuizz.length > 0){
                setQuizzIdForModePoints(responseQuizz[0].quizz_id)
            }
            setAvailableQuizz(responseQuizz)
        }
        fun();

    }, []);

    useEffect(() => {
        if (!auth?.user) return;
        const fun = async () => {
            const emissions = await tryRequest<any[]>("/emission/available-emissions", "GET", {}, []) ?? [];
            setAvailableEmissions(emissions);
            if (emissions.length > 0) {
                setSelectedEmissionId(emissions[0].emission_id);
            }
        };
        fun();
    }, [auth?.user]);

    const createEmission = async (mode : string) => {
        if (mode === "Points"){
            if (pointsQuizzMode === "existing"){
                // Quizz List existant : on route directement vers le mode LIST,
                // déjà pleinement fonctionnel (même moteur, barème/contrainte déjà
                // portés par le quizz lui-même — rien à ajouter ici).
                return {
                    title: "randomPoints",
                    creator: null,
                    id : null,
                    numberOfStep: 1,
                    steps: [{
                        title: "Points",
                        mode: "LIST",
                        quizz: quizzIdForModePoints,
                    }]
                }
            }
            return {
                title: "randomPoints",
                creator: null,
                id : null,
                numberOfStep: 1,
                steps: [{
                    title: "Points",
                    // Le serveur reconnaît le mode par cette clé (cf. Thread.start) :
                    // en majuscules, comme GRID/PICKANDBAN/TIMER.
                    mode: "POINTS",
                    pointsForcedType,
                    pointsCorrectPoints,
                    pointsWrongPoints,
                    pointsRoundCount,
                    pointsWantedTags,
                    pointsBlockedTags,
                    pointsDifficultyScoring: pointsScoringMode === "DIFFICULTY",
                }]
            }
        } else if (mode === "Grid"){
            return {
                title: "randomGrid",
                creator: null,
                id : null,
                numberOfStep: 1,
                steps: [{
                    title: "Grid",
                    quizz: quizzIdForModePoints,
                    // Le serveur reconnaît le mode par cette clé (cf. Thread.start).
                    mode: "GRID"
                }]
            }
        } else if (mode === "PickBan"){
            return {
                title: "randomPickBan",
                creator: null,
                id : null,
                numberOfStep: 1,
                steps: [{
                    title: "PickBan",
                    quizz: quizzIdForModePoints,
                    mode: "PICKANDBAN"
                }]
            }
        } else if (mode === "BR"){
            return {
                title: "randomBr",
                creator: null,
                id : null,
                numberOfStep: 1,
                steps: [{
                    title: "Endurance",
                    mode: "BR",
                    brForcedType,
                    brNumberOfLife: numberOfLife,
                    brWantedTags,
                    brBlockedTags,
                }]
            }
        }
    }

    const handleCreate = async () =>{
        if (mode === "Personalise" && !selectedEmissionId){
            alert("Choisissez une émission.");
            return;
        }
        if (socket){
            if (name.trim().length>0){
            const emission = mode === "Personalise"
                ? availableEmissions.find((e: any) => e.emission_id === selectedEmissionId)
                : await createEmission(mode);
            socket.emit("createRoom", {
                name : name,
                isPrivate: isPrivate,
                creator: username,
                password: password,
                withPresentator: withPresentator,
                withRef: withRef,
                numberOfParticipantMax: numberOfParticipantMax,
                emission,
            })
            } else {
                alert("il faut un nom pour le salon");
            }
        }
    }

    const handleChangePrivate = () => {
        setIsPrivate((p) => !p);
    }

    const handlePresentator = () => {
        setWithPresentator((p) => !p);
    }

    const handleRef = () => {
        setWithRef((p) => !p);
    }


    const renderMore = () => {
        switch (mode) {
            case "Personalise":
                return (
                    <FormControl fullWidth>
                        <InputLabel id="select-emission-label">Choisissez une émission</InputLabel>
                        <Select
                            labelId="select-emission-label"
                            id="select-emission"
                            value={selectedEmissionId}
                            label="Choisissez une émission"
                            onChange={(e) => setSelectedEmissionId(e.target.value)}
                        >
                            {availableEmissions.map((emission: any) => (
                            <MenuItem key={emission.emission_id} value={emission.emission_id}>
                                {emission.title}
                            </MenuItem>
                            ))}
                        </Select>
                        {availableEmissions.length === 0 && (
                            <p className="filler">
                                Aucune émission disponible. <a href="/create-an-emission">Créez-en une</a>.
                            </p>
                        )}
                    </FormControl>
                )
            case "BR":
                return (
                    <div className="createRoomModeExtraColumn">
                    <FormControl fullWidth>
                        <InputLabel id="select-br-forced-type-label">Type de question forcé</InputLabel>
                        <Select
                            labelId="select-br-forced-type-label"
                            id="select-br-forced-type"
                            value={brForcedType}
                            label="Type de question forcé"
                            onChange={(e) => setBrForcedType(e.target.value)}
                        >
                            {getForcedQuestionTypeOptions().map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>{opt.title}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <label className="createRoomInlineLabel">
                        Nombre de vies
                        <Input type="number" value={numberOfLife} onChange={(e)=>setLife(Number(e.target.value))}/>
                    </label>
                    <TagFilterPicker
                        onChange={({ requiredTagNames, excludedTagNames }) => {
                            setBrWantedTags(requiredTagNames);
                            setBrBlockedTags(excludedTagNames);
                        }}
                    />
                    </div>
                )
            case "Grid": {
                const gridQuizz = availableQuizz?.filter((q: any) => q.mode === "GRID") ?? [];
                return (
                    <FormControl fullWidth>
                        <InputLabel id="select-grid-quizz-label">Choisissez un quizz Grid</InputLabel>
                        <Select
                            labelId="select-grid-quizz-label"
                            id="select-grid-quizz"
                            value={quizzIdForModePoints}
                            label="Choisissez un quizz Grid"
                            onChange={(e) => setQuizzIdForModePoints(e.target.value)}
                        >
                            {gridQuizz.map((quizz: any) => (
                            <MenuItem key={quizz.quizz_id} value={quizz.quizz_id}>
                                {quizz.title}
                            </MenuItem>
                            ))}
                        </Select>
                        {gridQuizz.length === 0 && (
                            <p className="filler">
                                Aucun quizz Grid disponible. <a href="/create-a-grid-quizz">Créez-en un</a>.
                            </p>
                        )}
                    </FormControl>
                )
            }
            case "PickBan": {
                const pbQuizz = availableQuizz?.filter((q: any) => q.mode === "PICKANDBAN") ?? [];
                return (
                    <FormControl fullWidth>
                        <InputLabel id="select-pickban-quizz-label">Choisissez un quizz Pick &amp; Ban</InputLabel>
                        <Select
                            labelId="select-pickban-quizz-label"
                            id="select-pickban-quizz"
                            value={quizzIdForModePoints}
                            label="Choisissez un quizz Pick & Ban"
                            onChange={(e) => setQuizzIdForModePoints(e.target.value)}
                        >
                            {pbQuizz.map((quizz: any) => (
                            <MenuItem key={quizz.quizz_id} value={quizz.quizz_id}>
                                {quizz.title}
                            </MenuItem>
                            ))}
                        </Select>
                        {pbQuizz.length === 0 && (
                            <p className="filler">
                                Aucun quizz Pick &amp; Ban disponible. <a href="/create-a-pickban-quizz">Créez-en un</a>.
                            </p>
                        )}
                    </FormControl>
                )
            }
            case "Points": {
                const listQuizz = availableQuizz?.filter((q: any) => q.mode === "LIST") ?? [];
                return (
                    <div className="createRoomModeExtraColumn">
                    <FormControl fullWidth>
                        <InputLabel id="select-points-quizz-mode-label">Questions</InputLabel>
                        <Select
                            labelId="select-points-quizz-mode-label"
                            id="select-points-quizz-mode"
                            value={pointsQuizzMode}
                            label="Questions"
                            onChange={(e) => setPointsQuizzMode(e.target.value as "dynamic" | "existing")}
                        >
                            <MenuItem value="dynamic">Dynamique (tirées par tag)</MenuItem>
                            <MenuItem value="existing">Quizz existant</MenuItem>
                        </Select>
                    </FormControl>

                    {pointsQuizzMode === "existing" ? (
                        <FormControl fullWidth>
                            <InputLabel id="select-points-list-quizz-label">Choisissez un quizz</InputLabel>
                            <Select
                                labelId="select-points-list-quizz-label"
                                id="select-points-list-quizz"
                                value={quizzIdForModePoints}
                                label="Choisissez un quizz"
                                onChange={(e) => setQuizzIdForModePoints(e.target.value)}
                            >
                                {listQuizz.map((quizz: any) => (
                                <MenuItem key={quizz.quizz_id} value={quizz.quizz_id}>
                                    {quizz.title}
                                </MenuItem>
                                ))}
                            </Select>
                            {listQuizz.length === 0 && (
                                <p className="filler">
                                    Aucun quizz disponible. <a href="/create-a-quizz">Créez-en un</a>.
                                </p>
                            )}
                        </FormControl>
                    ) : (
                        <>
                        <FormControl fullWidth>
                            <InputLabel id="select-points-forced-type-label">Type de question forcé</InputLabel>
                            <Select
                                labelId="select-points-forced-type-label"
                                id="select-points-forced-type"
                                value={pointsForcedType}
                                label="Type de question forcé"
                                onChange={(e) => setPointsForcedType(e.target.value)}
                            >
                                {getForcedQuestionTypeOptions(true).map((opt) => (
                                <MenuItem key={opt.value} value={opt.value}>{opt.title}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {pointsForcedType === "DCC" ? (
                            <p className="createRoomHint">Barème DCC forcé : Cash 5 / Carré 3 / Duo 1 pts.</p>
                        ) : (
                            <BaremeSelector
                                scoringMode={pointsScoringMode}
                                setScoringMode={setPointsScoringMode}
                                correctPoints={pointsCorrectPoints}
                                setCorrectPoints={setPointsCorrectPoints}
                                wrongPoints={pointsWrongPoints}
                                setWrongPoints={setPointsWrongPoints}
                            />
                        )}

                        <label className="createRoomInlineLabel">
                            Nombre de manches
                            <Input type="number" value={pointsRoundCount} onChange={(e) => setPointsRoundCount(Number(e.target.value))}/>
                        </label>
                        <TagFilterPicker
                            onChange={({ requiredTagNames, excludedTagNames }) => {
                                setPointsWantedTags(requiredTagNames);
                                setPointsBlockedTags(excludedTagNames);
                            }}
                        />
                        </>
                    )}
                    </div>
                )
            }
            default:
                break;

        }
    }


    // Pour une émission enregistrée, "avec un présentateur" est une option de
    // l'émission elle-même (cf. EmissionCreation) : la case à cocher reflète
    // ce qui a été décidé à sa création plutôt que d'être re-choisie à chaque
    // salon, sans quoi un quizz Timer "avec présentateur" pourrait se
    // retrouver lancé sans personne pour le présenter.
    useEffect(() => {
        if (mode !== "Personalise") return;
        const emission = availableEmissions.find((e: any) => e.emission_id === selectedEmissionId);
        setWithPresentator(Boolean(emission?.options?.hostModeEnabled));
    }, [mode, selectedEmissionId, availableEmissions])




    return (
        <div className="createRoomPage">
            <div className="createRoomCard">
                <h1>Créer un salon</h1>

                <TextField
                    className="createRoomTitleInput"
                    label="Nom de votre salon"
                    type="text"
                    autoComplete="off"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    required
                />

                {!(auth?.user) && (
                    <TextField
                        className="createRoomTitleInput"
                        type="text"
                        label="Votre nom dans la partie"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        fullWidth
                        required
                    />
                )}

                <section className="createRoomSection">
                    <div className="createRoomOptionsGrid">
                        <label className="createRoomInlineLabel">
                            Salon privé
                            <Switch checked={isPrivate} onClick={() => handleChangePrivate()} />
                        </label>
                        <label className="createRoomInlineLabel">
                            Avec un présentateur (ne participe pas au jeu)
                            <Checkbox
                                checked={withPresentator}
                                disabled={mode === "Personalise"}
                                onClick={() => handlePresentator()}
                            />
                        </label>
                        <label className="createRoomInlineLabel">
                            Avec un arbitre pour les réponses libres
                            <Checkbox checked={withRef} onClick={() => handleRef()} />
                        </label>
                    </div>
                    {mode === "Personalise" && (
                        <p className="createRoomHint">« Avec un présentateur » est déterminé par l'option de l'émission choisie.</p>
                    )}
                    {isPrivate && (
                        <TextField
                            className="createRoomTitleInput"
                            type="password"
                            label="Mot de passe du salon"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            fullWidth
                            required
                        />
                    )}
                    <TextField
                        className="createRoomTitleInput"
                        type="number"
                        label="Nombre de participants max."
                        value={numberOfParticipantMax}
                        onChange={(e) => setNumberOfParticipantMax(Number(e.target.value))}
                    />
                </section>

                <section className="createRoomSection">
                    <h2>Déroulé</h2>
                    <div className="createRoomModeRow">
                        <FormControl className="createRoomModeSelect">
                            <InputLabel id="demo-simple-select-label">Mode</InputLabel>
                            <Select
                                labelId="demo-simple-select-label"
                                id="demo-simple-select"
                                value={mode || "mode"}
                                label="Mode"
                                onChange={(e) => {setMode(e.target.value)}}
                            >
                            {Mode.map((mode: string) => (
                                <MenuItem key={mode} value={mode} >
                                {mode}
                                </MenuItem>
                            ))}
                            </Select>
                        </FormControl>
                        <div className="createRoomModeExtra">{renderMore()}</div>
                    </div>
                </section>

                <div className="createRoomActions">
                    <Button className="createRoomButton" variant="contained" onClick={() => handleCreate()}>Créer le salon</Button>
                </div>
            </div>
        </div>
    )
}
