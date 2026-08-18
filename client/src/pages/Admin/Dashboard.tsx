import { useEffect, useState } from "react";
import { Banner } from "../../component/Banner/Banner";
import makeRequest from "../../tools/requestScheme";
import "../CommonCss.css";
import "../Profil/profil.css";
import "./Dashboard.css";

interface DashboardStats {
    users: { total: number; byRole: Record<string, number> };
    questions: { total: number; byStatus: Record<string, number> };
    quizz: { total: number; public: number; private: number };
    themes: { total: number; public: number; private: number };
    emissions: { total: number; public: number; private: number };
    backlogSize: number;
    recentActivity: { type: string; label: string; createdAt: string }[];
}

const ACTIVITY_LABEL: Record<string, string> = {
    user: "Nouveau compte",
    question: "Nouvelle question",
    quizz: "Nouveau quizz",
    theme: "Nouveau thème",
    emission: "Nouvelle émission",
};

/** Vue d'ensemble super admin (cf. ROADMAP.md, Phase 6) : la route serveur (requireRole) fait foi pour l'accès. */
export function Dashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);

    useEffect(() => {
        makeRequest("/admin/stats")
            .then(setStats)
            .catch((e) => console.error("Erreur lors du chargement des statistiques", e));
    }, []);

    if (!stats) {
        return (
            <div>
                <Banner />
                <div className="profilBlock"><p>Chargement...</p></div>
            </div>
        );
    }

    return (
        <div>
            <Banner />
            <div className="profilBlock">
                <h1>Dashboard</h1>
                <div className="dashboardTiles">
                    <div className="dashboardTile">
                        <h3>Comptes</h3>
                        <p className="dashboardTileTotal">{stats.users.total}</p>
                        <ul>
                            {Object.entries(stats.users.byRole).map(([role, count]) => (
                                <li key={role}>{role} : {count}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="dashboardTile">
                        <h3>Questions</h3>
                        <p className="dashboardTileTotal">{stats.questions.total}</p>
                        <ul>
                            {Object.entries(stats.questions.byStatus).map(([status, count]) => (
                                <li key={status}>{status} : {count}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="dashboardTile">
                        <h3>Quizz</h3>
                        <p className="dashboardTileTotal">{stats.quizz.total}</p>
                        <ul>
                            <li>publics : {stats.quizz.public}</li>
                            <li>privés : {stats.quizz.private}</li>
                        </ul>
                    </div>

                    <div className="dashboardTile">
                        <h3>Thèmes</h3>
                        <p className="dashboardTileTotal">{stats.themes.total}</p>
                        <ul>
                            <li>publics : {stats.themes.public}</li>
                            <li>privés : {stats.themes.private}</li>
                        </ul>
                    </div>

                    <div className="dashboardTile">
                        <h3>Émissions</h3>
                        <p className="dashboardTileTotal">{stats.emissions.total}</p>
                        <ul>
                            <li>publiques : {stats.emissions.public}</li>
                            <li>privées : {stats.emissions.private}</li>
                        </ul>
                    </div>

                    <a href="/admin/backlog" className="dashboardTile dashboardTileLink">
                        <h3>Backlog de modération</h3>
                        <p className="dashboardTileTotal">{stats.backlogSize}</p>
                        <span>Voir le backlog →</span>
                    </a>
                </div>

                <h2>Activité récente</h2>
                <ul className="dashboardActivityList">
                    {stats.recentActivity.length === 0 && <li className="dashboardEmpty">Aucune activité récente.</li>}
                    {stats.recentActivity.map((entry, i) => (
                        <li key={i}>
                            <span className={`dashboardActivityType dashboardActivityType-${entry.type}`}>
                                {ACTIVITY_LABEL[entry.type] ?? entry.type}
                            </span>
                            <span className="dashboardActivityLabel">{entry.label}</span>
                            <span className="dashboardActivityDate">{new Date(entry.createdAt).toLocaleString()}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

export default Dashboard;
