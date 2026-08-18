import { useCallback, useEffect, useState } from "react";
import { Button } from "@mui/material";
import { Banner } from "../../component/Banner/Banner";
import makeRequest from "../../tools/requestScheme";
import "../CommonCss.css";
import "../Profil/profil.css";
import "./AdminUsers.css";

interface AdminUser {
    user_id: number;
    username: string;
    email?: string;
    role: string;
}

interface SearchResult {
    user_id: number;
    username: string;
}

/** Gestion des admins (cf. ROADMAP.md, Phase 6) : réservée aux superadmins, la route serveur (requireRole) fait foi. */
export function AdminUsers() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [message, setMessage] = useState("");

    const loadAdmins = useCallback(async () => {
        try {
            const [admins, superadmins] = await Promise.all([
                makeRequest("/admin/users?role=admin"),
                makeRequest("/admin/users?role=superadmin"),
            ]);
            setAdmins([...(superadmins ?? []), ...(admins ?? [])]);
        } catch (e) {
            console.error("Erreur lors du chargement des admins", e);
        }
    }, []);

    useEffect(() => { loadAdmins(); }, [loadAdmins]);

    const search = async () => {
        if (!searchQuery.trim()) { setSearchResults([]); return; }
        try {
            setSearchResults(await makeRequest(`/user/search?q=${encodeURIComponent(searchQuery.trim())}`));
        } catch (e) {
            console.error("Erreur lors de la recherche d'utilisateurs", e);
        }
    };

    const promote = async (user_id: number) => {
        try {
            await makeRequest(`/admin/users/${user_id}/role`, "PUT", { role: "admin" });
            setSearchResults((prev) => prev.filter((u) => u.user_id !== user_id));
            await loadAdmins();
        } catch (e: any) {
            setMessage(e?.message ?? "La promotion a échoué.");
        }
    };

    const demote = async (user_id: number) => {
        try {
            await makeRequest(`/admin/users/${user_id}/role`, "PUT", { role: "user" });
            await loadAdmins();
        } catch (e: any) {
            setMessage(e?.message ?? "La rétrogradation a échoué.");
        }
    };

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <h1>Gestion des admins</h1>

                <div className="adminUsersSearch">
                    <input
                        type="text"
                        placeholder="Rechercher un joueur à promouvoir..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") search(); }}
                    />
                    <Button className="Button" onClick={search}>Chercher</Button>
                </div>
                {message && <p className="adminUsersMessage">{message}</p>}
                {searchResults.length > 0 && (
                    <ul className="adminUsersList">
                        {searchResults.map((u) => (
                            <li key={u.user_id}>
                                <span>{u.username}</span>
                                <Button size="small" onClick={() => promote(u.user_id)}>Promouvoir admin</Button>
                            </li>
                        ))}
                    </ul>
                )}

                <h2>Admins actuels</h2>
                {admins.length === 0 && <p className="adminUsersEmpty">Aucun admin pour l'instant.</p>}
                <ul className="adminUsersList">
                    {admins.map((a) => (
                        <li key={a.user_id}>
                            <span>{a.username} <span className="adminUsersRole">({a.role})</span></span>
                            {a.role === "admin" && (
                                <Button size="small" color="error" onClick={() => demote(a.user_id)}>Rétrograder</Button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default AdminUsers;
