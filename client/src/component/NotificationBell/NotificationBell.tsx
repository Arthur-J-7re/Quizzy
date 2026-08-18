import { useContext, useEffect, useState } from "react";
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
    payload?: { friendship_id?: number };
}

/** Notifications système (Phase 4) + demandes d'amis (Phase 5, ROADMAP.md) dans le même inbox. */
export default function NotificationBell() {
    const auth = useContext(AuthContext);
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
                {items.map((n) => (
                    n.type === "friend_request" ? (
                        <MenuItem
                            key={n.notification_id}
                            className={n.read ? "notificationItem read" : "notificationItem unread"}
                            disableRipple
                        >
                            <div className="notificationFriendRequest">
                                <span>{n.message}</span>
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
                            onClick={() => { if (!n.read) markRead(n.notification_id); }}
                        >
                            {n.message}
                        </MenuItem>
                    )
                ))}
                {unreadCount > 0 && (
                    <MenuItem className="notificationMarkAll" onClick={() => markAllRead()}>
                        Tout marquer comme lu
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}
