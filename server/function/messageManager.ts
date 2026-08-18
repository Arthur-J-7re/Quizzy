import MessageModel from "../Collection/message";
import friendshipManager from "./friendshipManager";
import userManager from "./userManager";
import logger from "../utils/logger";
import { HttpError } from "../utils/errorHandler";

const send = async (sender: number, recipient: number, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) {
        throw new HttpError(400, "Le message ne peut pas être vide.");
    }
    if (!(await friendshipManager.areFriends(sender, recipient))) {
        throw new HttpError(403, "Vous devez être amis pour échanger des messages.");
    }
    const message = await MessageModel.create({ sender, recipient, content: trimmed });
    return { success: true, message_id: message.message_id };
};

/** 50 derniers messages entre deux utilisateurs, croissant, et marque comme lus ceux reçus par `userId`. */
const getConversation = async (userId: number, peerId: number) => {
    try {
        const messages = await MessageModel.find({
            $or: [
                { sender: userId, recipient: peerId },
                { sender: peerId, recipient: userId },
            ],
        }).sort({ createdAt: -1 }).limit(50);
        await MessageModel.updateMany(
            { sender: peerId, recipient: userId, read: false },
            { $set: { read: true } }
        );
        return messages.reverse();
    } catch (error) {
        logger.error("erreur lors de la récupération d'une conversation", error);
        return [];
    }
};

/**
 * Liste des conversations d'un utilisateur (dernier message + non-lus par
 * pair). Pas de pipeline d'agrégation Mongo : à l'échelle d'une messagerie
 * entre amis, un fetch borné + réduction en JS suffit et reste cohérent
 * avec le reste du code, qui n'utilise nulle part .aggregate().
 */
const getConversationsList = async (userId: number) => {
    try {
        const messages = await MessageModel.find({
            $or: [{ sender: userId }, { recipient: userId }],
        }).sort({ createdAt: -1 }).limit(300);

        const byPeer = new Map<number, { lastMessage: typeof messages[number]; unreadCount: number }>();
        for (const m of messages) {
            const peerId = m.sender === userId ? m.recipient : m.sender;
            const entry = byPeer.get(peerId);
            const isUnreadForMe = m.recipient === userId && !m.read;
            if (!entry) {
                byPeer.set(peerId, { lastMessage: m, unreadCount: isUnreadForMe ? 1 : 0 });
            } else if (isUnreadForMe) {
                entry.unreadCount += 1;
            }
        }

        return await Promise.all(Array.from(byPeer.entries()).map(async ([peerId, entry]) => ({
            peer_id: peerId,
            username: await userManager.getUsernameById(peerId),
            lastMessage: entry.lastMessage.content,
            lastMessageAt: entry.lastMessage.createdAt,
            unreadCount: entry.unreadCount,
        })));
    } catch (error) {
        logger.error("erreur lors de la récupération des conversations", error);
        return [];
    }
};

const getUnreadCount = async (userId: number) => {
    try {
        return await MessageModel.countDocuments({ recipient: userId, read: false });
    } catch (error) {
        logger.error("erreur lors du comptage des messages non lus", error);
        return 0;
    }
};

export default { send, getConversation, getConversationsList, getUnreadCount };
