import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@mui/material";
import { Banner } from "../../component/Banner/Banner";
import { AuthContext } from "../../context/authentContext";
import makeRequest from "../../tools/requestScheme";
import "../CommonCss.css";
import "../Profil/profil.css";
import "./Messages.css";

interface NotificationItem {
    notification_id: number;
    type: string;
    message: string;
    read: boolean;
    createdAt: string;
    payload?: { question_id?: number };
}

type NotificationFilter = "all" | "moderation" | "publication" | "friends";

const FILTERS: { key: NotificationFilter; label: string; types: string[] }[] = [
    { key: "all", label: "Toutes", types: [] },
    { key: "moderation", label: "Modération", types: ["question_approved", "question_rejected"] },
    { key: "publication", label: "Publication", types: ["entity_unpublished"] },
    { key: "friends", label: "Amis", types: ["friend_request", "friend_accepted"] },
];

interface Friend {
    user_id: number;
    username?: string;
}

interface Conversation {
    peer_id: number;
    username?: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
}

interface PendingRequest {
    friendship_id: number;
    requester: number;
    username?: string;
    createdAt: string;
}

interface Message {
    message_id: number;
    sender: number;
    recipient: number;
    content: string;
    createdAt: string;
}

/** Messagerie entre amis (cf. ROADMAP.md, Phase 5) : DM réservés aux amis, pas de push temps réel, on recharge à l'ouverture. */
export function Messages() {
    const auth = useContext(AuthContext);
    const myId = Number(auth?.user?.id);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") === "notifications" ? "notifications" : "chat";

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notifFilter, setNotifFilter] = useState<NotificationFilter>("all");
    const [unreadOnly, setUnreadOnly] = useState(false);

    const [friends, setFriends] = useState<Friend[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [pending, setPending] = useState<PendingRequest[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Friend[]>([]);

    const [activePeer, setActivePeer] = useState<Friend | null>(null);
    const [activeMessages, setActiveMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState("");

    const loadSidebar = useCallback(async () => {
        try {
            const [friendsRes, pendingRes, conversationsRes] = await Promise.all([
                makeRequest("/friend"),
                makeRequest("/friend/pending"),
                makeRequest("/message/conversations"),
            ]);
            setFriends(friendsRes ?? []);
            setPending(pendingRes ?? []);
            setConversations(conversationsRes ?? []);
        } catch (e) {
            console.error("Erreur lors du chargement de la messagerie", e);
        }
    }, []);

    const loadNotifications = useCallback(async () => {
        try {
            const retour = await makeRequest("/notification");
            setNotifications(retour.items ?? []);
        } catch (e) {
            console.error("Erreur lors du chargement des notifications", e);
        }
    }, []);

    useEffect(() => { if (auth?.user && activeTab === "notifications") loadNotifications(); }, [auth?.user, activeTab, loadNotifications]);

    const setActiveTab = (tab: "chat" | "notifications") => {
        setSearchParams(tab === "notifications" ? { tab } : {});
    };

    const markNotificationRead = async (notification_id: number) => {
        await makeRequest(`/notification/${notification_id}/read`, "PUT");
        setNotifications((prev) => prev.map((n) => (n.notification_id === notification_id ? { ...n, read: true } : n)));
    };

    const markAllNotificationsRead = async () => {
        await makeRequest("/notification/read-all", "PUT");
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    };

    const openNotification = (n: NotificationItem) => {
        if (!n.read) markNotificationRead(n.notification_id);
        if ((n.type === "question_approved" || n.type === "question_rejected") && n.payload?.question_id) {
            navigate(`/modify-a-question/${n.payload.question_id}`);
        }
    };

    const visibleNotifications = notifications.filter((n) => {
        const filter = FILTERS.find((f) => f.key === notifFilter);
        if (filter && filter.types.length > 0 && !filter.types.includes(n.type)) return false;
        if (unreadOnly && n.read) return false;
        return true;
    });
    const notifUnreadCount = notifications.filter((n) => !n.read).length;

    useEffect(() => { if (auth?.user) loadSidebar(); }, [auth?.user, loadSidebar]);

    const search = async () => {
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        try {
            setSearchResults(await makeRequest(`/user/search?q=${encodeURIComponent(searchQuery.trim())}`));
        } catch (e) {
            console.error("Erreur lors de la recherche d'utilisateurs", e);
        }
    };

    const sendFriendRequest = async (recipient_id: number) => {
        try {
            await makeRequest("/friend/request", "POST", { recipient_id });
            setSearchResults((prev) => prev.filter((u) => u.user_id !== recipient_id));
        } catch (e) {
            console.error("Erreur lors de l'envoi de la demande d'ami", e);
        }
    };

    const respondToPending = async (friendship_id: number, accept: boolean) => {
        try {
            await makeRequest(`/friend/${friendship_id}/${accept ? "accept" : "decline"}`, "PUT");
            await loadSidebar();
        } catch (e) {
            console.error("Erreur lors de la réponse à une demande d'ami", e);
        }
    };

    const openConversation = async (peer: Friend) => {
        setActivePeer(peer);
        try {
            setActiveMessages(await makeRequest(`/message/conversations/${peer.user_id}`));
            // Ouvrir le fil marque les messages comme lus côté serveur : on
            // recharge la liste pour faire retomber le badge de non-lus.
            const conversationsRes = await makeRequest("/message/conversations");
            setConversations(conversationsRes ?? []);
        } catch (e) {
            console.error("Erreur lors du chargement de la conversation", e);
        }
    };

    const sendMessage = async () => {
        if (!activePeer || !draft.trim()) return;
        try {
            await makeRequest("/message/send", "POST", { recipient: activePeer.user_id, content: draft.trim() });
            setDraft("");
            setActiveMessages(await makeRequest(`/message/conversations/${activePeer.user_id}`));
            const conversationsRes = await makeRequest("/message/conversations");
            setConversations(conversationsRes ?? []);
        } catch (e) {
            console.error("Erreur lors de l'envoi du message", e);
        }
    };

    const conversationFor = (userId: number) => conversations.find((c) => c.peer_id === userId);

    if (!auth?.user) {
        return (
            <div>
                <Banner />
                <div className="PleaseLogin">
                    <h1>Veuillez vous connecter pour accéder à vos messages</h1>
                </div>
            </div>
        );
    }

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <h1>Messages</h1>
                <div className="messagesTabs">
                    <button
                        className={`messagesTab${activeTab === "chat" ? " active" : ""}`}
                        onClick={() => setActiveTab("chat")}
                    >
                        Discussions
                    </button>
                    <button
                        className={`messagesTab${activeTab === "notifications" ? " active" : ""}`}
                        onClick={() => setActiveTab("notifications")}
                    >
                        Notifications
                    </button>
                </div>

                {activeTab === "notifications" ? (
                    <div className="notificationsPage">
                        <div className="notificationsToolbar">
                            <div className="notificationsFilters">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f.key}
                                        className={`notificationsFilterChip${notifFilter === f.key ? " active" : ""}`}
                                        onClick={() => setNotifFilter(f.key)}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                            <label className="notificationsUnreadToggle">
                                <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
                                Non lues seulement
                            </label>
                            {notifUnreadCount > 0 && (
                                <Button size="small" onClick={markAllNotificationsRead}>Tout marquer comme lu</Button>
                            )}
                        </div>

                        {visibleNotifications.length === 0 && <p className="messagesEmpty">Aucune notification.</p>}
                        <ul className="notificationsList">
                            {visibleNotifications.map((n) => (
                                <li
                                    key={n.notification_id}
                                    className={`notificationsListItem${n.read ? "" : " unread"}`}
                                    onClick={() => openNotification(n)}
                                >
                                    <span className="notificationsListMessage">{n.message}</span>
                                    <span className="notificationsListDate">{new Date(n.createdAt).toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                <div className="messagesLayout">
                    <div className="messagesSidebar">
                        <div className="messagesSearch">
                            <input
                                type="text"
                                placeholder="Rechercher un joueur..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") search(); }}
                            />
                            <Button className="Button" onClick={search}>Chercher</Button>
                        </div>
                        {searchResults.length > 0 && (
                            <ul className="messagesSearchResults">
                                {searchResults.map((u) => (
                                    <li key={u.user_id}>
                                        <span>{u.username}</span>
                                        <Button size="small" onClick={() => sendFriendRequest(u.user_id)}>Ajouter</Button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {pending.length > 0 && (
                            <div className="messagesPending">
                                <h3>Demandes reçues</h3>
                                <ul>
                                    {pending.map((p) => (
                                        <li key={p.friendship_id}>
                                            <span>{p.username}</span>
                                            <div>
                                                <Button size="small" color="success" onClick={() => respondToPending(p.friendship_id, true)}>Accepter</Button>
                                                <Button size="small" color="error" onClick={() => respondToPending(p.friendship_id, false)}>Refuser</Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <h3>Amis</h3>
                        {friends.length === 0 && <p className="messagesEmpty">Aucun ami pour l'instant — cherchez un joueur ci-dessus.</p>}
                        <ul className="messagesFriendList">
                            {friends.map((f) => {
                                const conv = conversationFor(f.user_id);
                                const isActive = activePeer?.user_id === f.user_id;
                                return (
                                    <li
                                        key={f.user_id}
                                        className={`messagesFriendItem${isActive ? " active" : ""}`}
                                        onClick={() => openConversation(f)}
                                    >
                                        <div className="messagesFriendName">
                                            {f.username}
                                            {!!conv?.unreadCount && <span className="messagesUnreadBadge">{conv.unreadCount}</span>}
                                        </div>
                                        <div className="messagesFriendPreview">{conv?.lastMessage ?? "Nouvelle conversation"}</div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    <div className="messagesThread">
                        {!activePeer ? (
                            <p className="messagesEmpty">Sélectionnez un ami pour discuter.</p>
                        ) : (
                            <>
                                <h2>{activePeer.username}</h2>
                                <div className="messagesThreadList">
                                    {activeMessages.map((m) => (
                                        <div key={m.message_id} className={`messagesBubble${m.sender === myId ? " mine" : ""}`}>
                                            {m.content}
                                        </div>
                                    ))}
                                </div>
                                <div className="messagesComposer">
                                    <input
                                        type="text"
                                        placeholder="Écrire un message..."
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                                    />
                                    <Button className="Button" onClick={sendMessage}>Envoyer</Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}

export default Messages;
