import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconButton, Menu, MenuItem, Badge, Button } from "@mui/material";
import { Notifications } from "@mui/icons-material";
import { AuthContext } from "../../context/authentContext";
import makeRequest from "../../tools/requestScheme";
import "./NotificationBell.css";

interface NotificationItem {
    notification_id: number;
    type: string;
    message: string;
    read: boolean;
    createdAt: string;
    payload?: { friendship_id?: number; question_id?: number };
}

/** La cloche ne montre qu'un aperçu récent — l'historique complet, filtrable, vit sur /messages (onglet Notifications). */
const BELL_PREVIEW_COUNT = 8;

/** Notifications système (Phase 4) + demandes d'amis (Phase 5, ROADMAP.md) dans le même inbox. */
export default function NotificationBell() {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const load = async () => {
        try {
            const retour = await makeRequest("/notification");
            setItems(retour.items ?? []);
            setUnreadCount(retour.unreadCount ?? 0);
        } catch (e) {
            console.error("Erreur lors du chargement des notifications", e);
        }
    };

    useEffect(() => {
        if (auth?.user) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth?.user]);

    const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget);
        load();
    };
    const handleClose = () => setAnchorEl(null);

    const dismiss = (notification_id: number, wasUnread: boolean) => {
        setItems((prev) => prev.filter((n) => n.notification_id !== notification_id));
        if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    };

    const markRead = async (notification_id: number) => {
        await makeRequest(`/notification/${notification_id}/read`, "PUT");
        setItems((prev) => prev.map((n) => (n.notification_id === notification_id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
    };

    const markAllRead = async () => {
        await makeRequest("/notification/read-all", "PUT");
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const openNotification = (n: NotificationItem) => {
        if (!n.read) markRead(n.notification_id);
        handleClose();
        if ((n.type === "question_approved" || n.type === "question_rejected") && n.payload?.question_id) {
            navigate(`/modify-a-question/${n.payload.question_id}`);
        }
    };

    const respondToFriendRequest = async (n: NotificationItem, accept: boolean) => {
        const friendship_id = n.payload?.friendship_id;
        if (!friendship_id) return;
        try {
            await makeRequest(`/friend/${friendship_id}/${accept ? "accept" : "decline"}`, "PUT");
            dismiss(n.notification_id, !n.read);
        } catch (e) {
            console.error("Erreur lors de la réponse à une demande d'ami", e);
        }
    };

    if (!auth?.user) return null;

    return (
        <>
            <IconButton className="notificationBellButton" onClick={handleOpen}>
                <Badge badgeContent={unreadCount} color="error">
                    <Notifications />
                </Badge>
            </IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose} className="notificationMenu">
                {items.length === 0 && <MenuItem disabled>Aucune notification</MenuItem>}
                {items.slice(0, BELL_PREVIEW_COUNT).map((n) => (
                    n.type === "friend_request" ? (
                        <MenuItem
                            key={n.notification_id}
                            className={n.read ? "notificationItem read" : "notificationItem unread"}
                            disableRipple
                        >
                            <div className="notificationFriendRequest">
                                <span className="notificationPreviewText">{n.message}</span>
                                <div className="notificationFriendRequestActions">
                                    <Button size="small" color="success" onClick={() => respondToFriendRequest(n, true)}>Accepter</Button>
                                    <Button size="small" color="error" onClick={() => respondToFriendRequest(n, false)}>Refuser</Button>
                                </div>
                            </div>
                        </MenuItem>
                    ) : (
                        <MenuItem
                            key={n.notification_id}
                            className={n.read ? "notificationItem read" : "notificationItem unread"}
                            onClick={() => openNotification(n)}
                        >
                            <span className="notificationPreviewText">{n.message}</span>
                        </MenuItem>
                    )
                ))}
                <MenuItem className="notificationViewAll" onClick={() => { handleClose(); navigate("/messages?tab=notifications"); }}>
                    Voir tout{unreadCount > 0 ? ` (${unreadCount} non lue${unreadCount > 1 ? "s" : ""})` : ""}
                </MenuItem>
                {unreadCount > 0 && (
                    <MenuItem className="notificationMarkAll" onClick={() => markAllRead()}>
                        Tout marquer comme lu
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}
