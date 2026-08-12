import Room from "../Class/Room";
import createId from "../utils/createId";
import logger from "../utils/logger";
import themeManager from "../function/themeManager";

const rooms = new Map<string, Room>();

const create = async (data : any, socket : any, io : any) => {
    // Sans émission on ne peut pas construire de Thread : avant, on émettait
    // quand même roomCreated et le client naviguait vers un salon inexistant.
    if (!data || !data.emission){
        socket.emit("roomCreated", ({success : false, message : "Aucune émission sélectionnée."}));
        return;
    }
    const roomId = createRoomId();
    const newRoom = new Room(roomId, data.name, data.creator, data.isPrivate,
        data.password, data.emission, data.withRef, data.withPresentator, data.numberOfParticipantMax, {},
        deleteRoom
    );
    rooms.set(roomId, newRoom);
    socket.emit("roomCreated", ({success : true, roomId : String(roomId)}));
}

const createRoomId = () : string => {
    var roomId = createId();
    while (rooms.has(roomId)){
        roomId = createId();
    }
    return roomId;
}

const getInfo = async (roomId : string, socket : any) => {
    const room = rooms.get(roomId);
    if (room){
        socket.emit("infoRoom", room.getInfo());
    }
}

const connect = (data: any, socket: any, io : any) => {
    const room = rooms.get(data.room_id);
    if (!room){
        socket.emit("connexion", ({success : false, message: "No room with this id."}));
        return;
    } 
    if (data.password.length > 0){
        if (!room.isPrivate){
            socket.emit("connexion",({success : false, message: "This room doesn't need a password."}))
        }
        else if (room.password === data.password){
            joinRoom(socket,data, io);
        } else {
            socket.emit("connexion", ({success: false, message: "Mauvais mot de passe."}))
        }
    } 
    else {
        if (room.isPrivate){
            socket.emit("connexion", ({success:false, message : "This room need a password."}))
        } else {
            joinRoom(socket,data, io);
        }
    }
}

const autoConnect = async (data:any, socket: any, io : any) => {
    const {username, room_id}= data;
    const room = rooms.get(room_id);
    if (room){
        const player = room.players;
        if (player && player[username]){
            if (player[username].connected && player[username].socketId !== socket.id){
                // Un socket actif tient déjà ce pseudo : pas question de le
                // lui voler silencieusement.
                socket.emit("connexion", ({success:false, message: "Ce nom est déjà utilisé dans ce salon."}));
                return;
            }
            player[username].socketId = socket.id;
            player[username].connected = true;
            await socket.join(room_id);
            socket.data.room_id = data.room_id;
            socket.data.username = username;
            logger.debug(username, "connecté à la room ",room_id )
            socket.emit("connexion", ({success:true}));
            if (player[username].role === "creator"){
                socket.emit("ownerOfRoom");
            }
            // Reprise en cours de partie : le serveur renvoie l'état courant.
            room.getThread().sendStateTo(username);
        }
    }
}

const createUser = async (socket: any, data : any, io : any, room : Room, role : string) => {
    const name = data.player;
    if (!name) return;

    const existing = room.players[name];
    if (existing){
        if (existing.connected && existing.socketId !== socket.id){
            // Un socket actif joue déjà sous ce pseudo dans ce salon : on ne
            // fusionne pas, sinon un simple homonyme récupérerait son score.
            socket.emit("connexion", ({success : false, message : "Ce nom est déjà utilisé dans ce salon."}));
            return;
        }
        // Reprise de partie (joueur anonyme ou authentifié qui revient) : on
        // garde le score/l'état déjà accumulés, seul le socket est renouvelé.
        existing.socketId = socket.id;
        existing.connected = true;
        socket.data.room_id = data.room_id;
        socket.data.username = name;
        await socket.join(data.room_id);
        io.to(data.room_id).emit("infoRoom", room.getInfo());
        socket.emit("connexion", ({success : true}));
        if (existing.role === "creator"){
            socket.emit("ownerOfRoom");
        }
        room.getThread().sendStateTo(name);
        return;
    }

    const user_id = data.userId;
    let newUser;
    String(user_id) === user_id ? 
    newUser = {
        name : name, 
        role:role,
        socketId : socket.id,
        hasAnswered : false,
        answer : "",
        score : 0,
        life :0,//à changer ici
        connected: true
    } : 
    newUser = {
        name : name, 
        role:role,
        socketId : socket.id,
        id : user_id,
        hasAnswered : false,
        answer : "",
        score : 0,
        life : 0,//à changer ici
        connected:true
    }  
    logger.debug("le newUser", newUser)
    if(newUser.name){
        room.addPlayer(newUser);
        socket.data.room_id = data.room_id;
        socket.data.username = name;
        await socket.join(data.room_id);
        const roomSize = io.sockets.adapter.rooms.get(data.room_id)?.size || 0;
        logger.debug(`Il y a ${roomSize} joueurs connectés.`);
        socket.to(data.room_id).emit("aPlayerHasJoined", ({name : name}))
        // Sans ce rafraîchissement, la liste des joueurs (et le panneau
        // d'assignation de thème) restait figée pour tous les clients déjà
        // connectés : "aPlayerHasJoined" ne fait qu'une alerte côté client,
        // rien ne redemandait l'état du salon.
        io.to(data.room_id).emit("infoRoom", room.getInfo())
        socket.emit("connexion", ({success :true}))
        // Un nouveau joueur qui rejoint après le lancement de la partie doit
        // recevoir l'état courant, sinon il reste bloqué sur "en attente du
        // lancement" alors que la partie tourne déjà.
        room.getThread().sendStateTo(name)
    }
}

const joinRoom = async (socket : any, data : any, io : any) => {
    logger.debug("dans join room", data);
    const room = rooms.get(data.room_id);
    if (room && room.getCreator() === data.player ){
        await createUser(socket, data, io, room, "creator");
        socket.emit("ownerOfRoom");
    }else if (room && Object.keys(room.getPlayers()).length < room.numberOfParticipantMax){
        await createUser(socket,data,io,room,"player");
    } else if (room){
        socket.emit("connexion", ({success : false, message : "Le salon est plein" + Object.keys(room.getPlayers()).length}))
    }  
}

const start = async (data : any, io : any) => {
    if (!(data && data.username && data.room_id)) return;
    const room = rooms.get(data.room_id);
    if (!room) return;
    room.touch();
    await room.getThread().start(data.username);
}

/**
 * Rejoint le salon en simple spectateur (`/show`, grand écran) : le socket
 * rejoint la room Socket.IO comme n'importe quel joueur (pour recevoir les
 * diffusions), mais aucun `User` n'est créé — jamais aucune action de jeu ne
 * pourra lui être attribuée (cf. `socket.data.username` jamais posé ici).
 */
const showJoin = async (room_id : string, socket : any) => {
    const room = rooms.get(room_id);
    if (!room){
        socket.emit("infoRoom", null);
        return;
    }
    await socket.join(room_id);
    socket.emit("infoRoom", room.getInfo());
    room.getThread().sendPublicStateTo(socket.id);
}

const gridPick = (room_id : string, username : string, index : number) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().pick(username, index);
}

/**
 * Passthrough générique de réponse : Thread.answer() la transmet au moteur
 * actif (Grid ou Pick & Ban), qui ignore l'appel si ce n'est pas son tour.
 */
const gameAnswer = (room_id : string, username : string, answer : unknown) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().answer(username, answer);
}

/** Réservé au présentateur : verdict manuel sur la réponse Timer en cours. */
const timerHostJudge = (room_id : string, username : string, verdict : "correct" | "wrong" | "skip") => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().timerHostJudge(username, verdict);
}

/** Mode équipe : n'importe quel membre du duo attendu réclame le tour de manche 1. */
const timerClaimTurn = (room_id : string, username : string) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().timerClaimTurn(username);
}

const pbDraftPick = (room_id : string, username : string, theme_id : number) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().pbDraftPick(username, theme_id);
}

const pbDraftGive = (room_id : string, username : string, theme_id : number) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().pbDraftGive(username, theme_id);
}

const pbDraftBan = (room_id : string, username : string, theme_id : number) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().pbDraftBan(username, theme_id);
}

const pbChoose = (room_id : string, username : string, theme_id : number) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().pbChoose(username, theme_id);
}

/** Réservé à l'arbitre : inverse le verdict d'un joueur sur une réponse libre. */
const refereeOverride = (room_id : string, requester : string, target : string, correct : boolean) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().refereeOverride(requester, target, correct);
}

/** Réservé au présentateur : lance la question suivante (mode LIST hébergé). */
const listHostAdvance = (room_id : string, username : string) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().listHostAdvance(username);
}

/** Réservé au présentateur : lance la question suivante (mode Points hébergé). */
const pointsHostAdvance = (room_id : string, username : string) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().pointsHostAdvance(username);
}

/** Réservé au présentateur : lance la question suivante (mode BR hébergé). */
const brHostAdvance = (room_id : string, username : string) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().brHostAdvance(username);
}

/** Réservé au présentateur : choisit ce que l'écran `/show` affiche. */
const setShowView = (room_id : string, username : string, view : "live" | "results" | "scoreboard") => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    room.getThread().setShowView(username, view);
}

/**
 * Réservé au créateur du salon : associe un thème à un joueur pour une étape
 * "dynamique" précise de l'émission. Le thème est résolu en base à partir de
 * son id plutôt que de faire confiance au contenu envoyé par le client —
 * sinon un client bricolé pourrait injecter ses propres questions dans la
 * partie.
 */
const assignPlayerTheme = async (room_id : string, requester : string, target : string, stepIndex : number, theme_id : number, socket : any) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();

    const theme = await themeManager.getThemeById(theme_id);
    if (!theme) {
        socket?.emit("emission:error", { message: "Ce thème n'existe pas." });
        return;
    }

    const ok = room.getThread().assignPlayerTheme(requester, target, stepIndex, theme);
    if (!ok) {
        socket?.emit("emission:error", { message: "Assignation refusée (droits insuffisants ou joueur inconnu)." });
    }
}

/**
 * Réservé au présentateur : valide (avec d'éventuels ajustements bonus/malus)
 * le score de l'épreuve qui vient de se terminer, et fait passer l'émission
 * à la suite.
 */
const confirmBonusMalus = (room_id : string, requester : string, adjustments : Record<string, number>, socket : any) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    const ok = room.getThread().confirmBonusMalus(requester, adjustments);
    if (!ok) {
        socket?.emit("emission:error", { message: "Validation refusée (droits insuffisants ou aucune épreuve en attente)." });
    }
}

/** Réservé au créateur du salon : élimine un joueur des futures épreuves à thème. */
const eliminatePlayer = (room_id : string, requester : string, target : string, socket : any) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    const ok = room.getThread().eliminatePlayer(requester, target);
    if (!ok) {
        socket?.emit("emission:error", { message: "Élimination refusée (droits insuffisants ou joueur inconnu)." });
    }
}

/** Réservé au présentateur : remet à zéro les scores cumulés à la demande. */
const resetScores = (room_id : string, requester : string, socket : any) => {
    const room = rooms.get(room_id);
    if (!room) return;
    room.touch();
    const ok = room.getThread().resetScores(requester);
    if (!ok) {
        socket?.emit("emission:error", { message: "Réinitialisation refusée (droits insuffisants)." });
    }
}

/**
 * Marque le joueur comme déconnecté sans le retirer du salon, pour permettre
 * une reprise ultérieure (score conservé). Sans ce handler, `connected`
 * restait à `true` indéfiniment et rien ne distinguait "ce pseudo est encore
 * activement joué" de "ce pseudo est libre pour une reconnexion".
 */
const disconnect = (socket : any, io : any) => {
    const room_id = socket.data?.room_id;
    const username = socket.data?.username;
    if (!room_id || !username) return;
    const room = rooms.get(room_id);
    if (!room) return;
    const player = room.players[username];
    // Si un autre socket a entre-temps repris ce pseudo (reconnexion), on ne
    // doit pas écraser son état "connected" avec la déconnexion de l'ancien.
    if (player && player.socketId === socket.id){
        player.connected = false;
        io.to(room_id).emit("infoRoom", room.getInfo());
    }
}

const deleteRoom = (room_id : string) => {
    const room = rooms.get(room_id);
    room?.getThread().dispose();
    room?.dispose();
    rooms.delete(room_id);
}

const ping = async (data : any,socket :any, io : any) => {
    logger.debug("on tente de ping");
    let id = data.room_id;
    const room = rooms.get(id);
    if (id && room){
        socket.to(id).emit("ping", ({name : data.username}));
        logger.debug("le ping est partie pour la room : ", id)
    }
}

/*const getDccMode = async (room_id : string, username : string) =>{
    const room = rooms[room_id];
    if (room){
        const retour = room.thread.getDccMode(username)
        logger.debug("le mode est",retour);
        return retour
    }
}

const setDccMode = async (room_id :string, username:string, mode: string) => {
    const room = rooms[room_id];
    if (room){
        room.thread.setDccMode(username, mode)
    }
}/**/


export default {create, getInfo, connect,ping,start, autoConnect, disconnect, showJoin,
    gridPick, gridAnswer: gameAnswer, timerHostJudge, timerClaimTurn,
    pbDraftPick, pbDraftGive, pbDraftBan, pbChoose,
    assignPlayerTheme, eliminatePlayer, confirmBonusMalus, resetScores,
    listHostAdvance, pointsHostAdvance, brHostAdvance, refereeOverride, setShowView,
    /*getDccMode, setDccMode, getGameMode*/};