import FriendshipModel from "../Collection/friendship";
import notificationManager from "./notificationManager";
import userManager from "./userManager";
import logger from "../utils/logger";
import { HttpError } from "../utils/errorHandler";

/** Ligne d'amitié entre `a` et `b`, quel que soit le sens (requester/recipient). */
const findBetween = async (a: number, b: number) => {
    return await FriendshipModel.findOne({
        $or: [
            { requester: a, recipient: b },
            { requester: b, recipient: a },
        ],
    });
};

const areFriends = async (a: number, b: number): Promise<boolean> => {
    const existing = await findBetween(a, b);
    return existing?.status === "accepted";
};

const sendRequest = async (requester: number, recipient: number) => {
    if (requester === recipient) {
        throw new HttpError(400, "Vous ne pouvez pas vous ajouter vous-même.");
    }
    const recipientUsername = await userManager.getUsernameById(recipient);
    if (!recipientUsername) {
        throw new HttpError(404, "Cet utilisateur n'existe pas.");
    }
    const existing = await findBetween(requester, recipient);
    if (existing) {
        throw new HttpError(409, existing.status === "accepted"
            ? "Vous êtes déjà amis."
            : "Une demande est déjà en attente entre vous deux.");
    }
    const requesterUsername = await userManager.getUsernameById(requester);
    const friendship = await FriendshipModel.create({ requester, recipient, status: "pending" });
    await notificationManager.create(
        recipient,
        "friend_request",
        `${requesterUsername ?? "Un joueur"} vous a envoyé une demande d'ami.`,
        { sender: requester, payload: { friendship_id: friendship.friendship_id } }
    );
    return { success: true, friendship_id: friendship.friendship_id };
};

const acceptRequest = async (friendship_id: number, actingUserId: number) => {
    const friendship = await FriendshipModel.findOne({ friendship_id });
    if (!friendship) {
        throw new HttpError(404, "Cette demande d'ami n'existe pas.");
    }
    if (friendship.recipient !== actingUserId) {
        throw new HttpError(403, "Vous n'êtes pas destinataire de cette demande.");
    }
    if (friendship.status !== "pending") {
        throw new HttpError(409, "Cette demande n'est plus en attente.");
    }
    await FriendshipModel.updateOne({ friendship_id }, { $set: { status: "accepted", respondedAt: new Date() } });
    const recipientUsername = await userManager.getUsernameById(actingUserId);
    await notificationManager.create(
        friendship.requester,
        "friend_accepted",
        `${recipientUsername ?? "Un joueur"} a accepté votre demande d'ami.`
    );
    return { success: true };
};

const declineRequest = async (friendship_id: number, actingUserId: number) => {
    const friendship = await FriendshipModel.findOne({ friendship_id });
    if (!friendship) {
        throw new HttpError(404, "Cette demande d'ami n'existe pas.");
    }
    if (friendship.recipient !== actingUserId) {
        throw new HttpError(403, "Vous n'êtes pas destinataire de cette demande.");
    }
    await FriendshipModel.deleteOne({ friendship_id });
    return { success: true };
};

const removeFriend = async (userId: number, friendId: number) => {
    try {
        await FriendshipModel.deleteOne({
            status: "accepted",
            $or: [
                { requester: userId, recipient: friendId },
                { requester: friendId, recipient: userId },
            ],
        });
        return { success: true };
    } catch (error) {
        logger.error("erreur lors de la suppression d'une amitié", error);
        return { success: false };
    }
};

const listFriends = async (userId: number) => {
    try {
        const friendships = await FriendshipModel.find({
            status: "accepted",
            $or: [{ requester: userId }, { recipient: userId }],
        });
        const friends = await Promise.all(friendships.map(async (f) => {
            const friendId = f.requester === userId ? f.recipient : f.requester;
            return { user_id: friendId, username: await userManager.getUsernameById(friendId) };
        }));
        return friends;
    } catch (error) {
        logger.error("erreur lors de la récupération de la liste d'amis", error);
        return [];
    }
};

const listPendingReceived = async (userId: number) => {
    try {
        const friendships = await FriendshipModel.find({ status: "pending", recipient: userId });
        return await Promise.all(friendships.map(async (f) => ({
            friendship_id: f.friendship_id,
            requester: f.requester,
            username: await userManager.getUsernameById(f.requester),
            createdAt: f.createdAt,
        })));
    } catch (error) {
        logger.error("erreur lors de la récupération des demandes en attente", error);
        return [];
    }
};

export default { areFriends, sendRequest, acceptRequest, declineRequest, removeFriend, listFriends, listPendingReceived };
