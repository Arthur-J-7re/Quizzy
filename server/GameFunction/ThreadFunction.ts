import room from "./room";
import { Socket } from "socket.io";
import { GRID_ACTIONS } from "../../shared-types/grid";
import { PICKBAN_ACTIONS } from "../../shared-types/pickban";
import { LIST_ACTIONS } from "../../shared-types/list";
import { TIMER_ACTIONS } from "../../shared-types/timer";
import { DUEL_ACTIONS } from "../../shared-types/duel";
import { POINTS_ACTIONS } from "../../shared-types/points";
import { BR_ACTIONS } from "../../shared-types/br";
import { REFEREE_ACTIONS } from "../../shared-types/referee";
import { SHOW_ACTIONS, type ShowView } from "../../shared-types/show";
import logger from "../utils/logger";

export default function threadSocket (io : any, socket : Socket & {user_id : number}) {
    socket.on("setMode", (data) => {
        logger.debug("on set le mode ", data?.mode , "pour", socket.username);
    })

    socket.on("startGame", (data)=> {
        room.start(data, io);
    })

    // --- Mode Grid -------------------------------------------------------
    // On ne fait jamais confiance au nom envoyé par le client : l'identité du
    // joueur vient de socket.data, posé quand il a rejoint le salon.
    socket.on(GRID_ACTIONS.pick, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const index = Number(data?.index);
        if (!Number.isInteger(index)) return;
        room.gridPick(room_id, username, index);
    })

    socket.on(GRID_ACTIONS.answer, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        room.gridAnswer(room_id, username, data?.answer);
    })

    // --- Mode Pick & Ban ---------------------------------------------------
    socket.on(PICKBAN_ACTIONS.draftPick, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const theme_id = Number(data?.theme_id);
        if (!Number.isInteger(theme_id)) return;
        room.pbDraftPick(room_id, username, theme_id);
    })

    // La cible n'est plus fournie par le client : imposée par le roulement
    // côté serveur (cf. PickBanGame.forcedGiveTarget).
    socket.on(PICKBAN_ACTIONS.draftGive, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const theme_id = Number(data?.theme_id);
        if (!Number.isInteger(theme_id)) return;
        room.pbDraftGive(room_id, username, theme_id);
    })

    socket.on(PICKBAN_ACTIONS.draftBan, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const theme_id = Number(data?.theme_id);
        if (!Number.isInteger(theme_id)) return;
        room.pbDraftBan(room_id, username, theme_id);
    })

    socket.on(PICKBAN_ACTIONS.choose, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const theme_id = Number(data?.theme_id);
        if (!Number.isInteger(theme_id)) return;
        room.pbChoose(room_id, username, theme_id);
    })

    socket.on(PICKBAN_ACTIONS.answer, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        // Passthrough générique : Thread.answer() délègue au moteur actif.
        room.gridAnswer(room_id, username, data?.answer);
    })

    // --- Mode List (quizz classique) -----------------------------------------
    socket.on(LIST_ACTIONS.answer, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        // Passthrough générique : Thread.answer() délègue au moteur actif.
        room.gridAnswer(room_id, username, data?.answer);
    })

    // Réservé au présentateur : lance la question suivante (pas d'auto-avance
    // en mode hébergé, cf. ListGame.resolveQuestion).
    socket.on(LIST_ACTIONS.hostAdvance, () => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        room.listHostAdvance(room_id, username);
    })

    // Réservé au présentateur : choisit ce que l'écran `/show` affiche.
    socket.on(SHOW_ACTIONS.setView, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const view = String(data?.view ?? "") as ShowView;
        if (view !== "live" && view !== "results" && view !== "scoreboard") return;
        room.setShowView(room_id, username, view);
    })

    // --- Mode Timer (chacun son tour) -----------------------------------------
    socket.on(TIMER_ACTIONS.answer, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        // Passthrough générique : Thread.answer() délègue au moteur actif.
        room.gridAnswer(room_id, username, data?.answer);
    })

    // Réservé au présentateur (vérifié côté TimerGame.hostJudge) : verdict
    // manuel sur la réponse en cours d'un quizz Timer "avec présentateur".
    socket.on(TIMER_ACTIONS.hostJudge, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const verdict = String(data?.verdict ?? "");
        if (verdict !== "correct" && verdict !== "wrong" && verdict !== "skip") return;
        room.timerHostJudge(room_id, username, verdict);
    })

    // Mode équipe : n'importe quel membre du duo attendu réclame le tour de
    // manche 1 (vérifié côté TimerGame.claimTurn).
    socket.on(TIMER_ACTIONS.claimTurn, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        room.timerClaimTurn(room_id, username);
    })

    // --- Mode Duel (1v1, chrono individuel) -----------------------------------
    socket.on(DUEL_ACTIONS.answer, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        // Passthrough générique : Thread.answer() délègue au moteur actif.
        room.gridAnswer(room_id, username, data?.answer);
    })

    // --- Mode Points (barème dynamique par tag) -------------------------------
    socket.on(POINTS_ACTIONS.answer, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        // Passthrough générique : Thread.answer() délègue au moteur actif.
        room.gridAnswer(room_id, username, data?.answer);
    })

    // Réservé au présentateur : lance la question suivante (pas d'auto-avance
    // en mode hébergé, cf. PointsGame.resolveQuestion).
    socket.on(POINTS_ACTIONS.hostAdvance, () => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        room.pointsHostAdvance(room_id, username);
    })

    // --- Mode Battle Royale (élimination par vies) ----------------------------
    socket.on(BR_ACTIONS.answer, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        // Passthrough générique : Thread.answer() délègue au moteur actif.
        room.gridAnswer(room_id, username, data?.answer);
    })

    // Réservé au présentateur : lance la question suivante (pas d'auto-avance
    // en mode hébergé, cf. BrGame.resolveQuestion).
    socket.on(BR_ACTIONS.hostAdvance, () => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        room.brHostAdvance(room_id, username);
    })

    // --- Émission (multi-épreuves) -----------------------------------------
    // Réservés au créateur du salon (vérifié côté Thread) : associer un thème
    // à un joueur pour une étape dynamique précise, ou l'éliminer.
    socket.on("emission:assignPlayerTheme", async (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const target = String(data?.username ?? "");
        const stepIndex = Number(data?.stepIndex);
        const theme_id = Number(data?.theme_id);
        if (!target || !Number.isInteger(stepIndex) || !Number.isInteger(theme_id)) return;
        await room.assignPlayerTheme(room_id, username, target, stepIndex, theme_id, socket);
    })

    socket.on("emission:eliminatePlayer", (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const target = String(data?.username ?? "");
        if (!target) return;
        room.eliminatePlayer(room_id, username, target, socket);
    })

    // Réservé au présentateur : valide l'écran bonus/malus de fin d'épreuve.
    socket.on("emission:confirmBonusMalus", (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const adjustments: Record<string, number> = {};
        if (data?.adjustments && typeof data.adjustments === "object") {
            for (const [name, value] of Object.entries(data.adjustments)) {
                const delta = Number(value);
                if (Number.isFinite(delta) && delta !== 0) adjustments[name] = delta;
            }
        }
        room.confirmBonusMalus(room_id, username, adjustments, socket);
    })

    // Réservé au présentateur : remet à zéro les scores cumulés à la demande,
    // même quand l'étape courante n'a pas resetPoint.
    socket.on("emission:resetScores", (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        room.resetScores(room_id, username, socket);
    })

    // --- Arbitre (réponses libres) --------------------------------------------
    // Réservé à l'arbitre (créateur du salon avec l'option "avec un arbitre") :
    // inverse le verdict d'un joueur sur une réponse libre. `target` vient du
    // client (le joueur concerné), mais `requester` vient toujours de
    // socket.data, jamais du payload.
    socket.on(REFEREE_ACTIONS.override, (data) => {
        const { room_id, username } = socket.data ?? {};
        if (!room_id || !username) return;
        const target = String(data?.target ?? "");
        if (!target) return;
        room.refereeOverride(room_id, username, target, Boolean(data?.correct));
    })
}
