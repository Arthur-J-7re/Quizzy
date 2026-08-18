import NotificationModel from "../Collection/notification";
import logger from "../utils/logger";

type NotificationType = "question_approved" | "question_rejected" | "entity_unpublished" | "friend_request" | "friend_accepted";

const create = async (
    recipient: number,
    type: NotificationType,
    message: string,
    extra?: { sender?: number; payload?: unknown }
) => {
    try {
        await NotificationModel.create({ recipient, type, message, sender: extra?.sender, payload: extra?.payload });
        return { success: true };
    } catch (error) {
        logger.error("erreur lors de la création d'une notification", error);
        return { success: false };
    }
};

/** 50 dernières notifications d'un utilisateur, plus récentes en premier. */
const getForUser = async (user_id: number) => {
    try {
        return await NotificationModel.find({ recipient: user_id }).sort({ createdAt: -1 }).limit(50);
    } catch (error) {
        logger.error("erreur lors de la récupération des notifications", error);
        return [];
    }
};

const getUnreadCount = async (user_id: number) => {
    try {
        return await NotificationModel.countDocuments({ recipient: user_id, read: false });
    } catch (error) {
        logger.error("erreur lors du comptage des notifications non lues", error);
        return 0;
    }
};

const markRead = async (notification_id: number, user_id: number) => {
    try {
        await NotificationModel.updateOne({ notification_id, recipient: user_id }, { $set: { read: true } });
        return { success: true };
    } catch (error) {
        logger.error("erreur lors du marquage d'une notification comme lue", error);
        return { success: false };
    }
};

const markAllRead = async (user_id: number) => {
    try {
        await NotificationModel.updateMany({ recipient: user_id, read: false }, { $set: { read: true } });
        return { success: true };
    } catch (error) {
        logger.error("erreur lors du marquage des notifications comme lues", error);
        return { success: false };
    }
};

export default { create, getForUser, getUnreadCount, markRead, markAllRead };
