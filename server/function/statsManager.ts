import User from "../Collection/user";
import { QuestionModel } from "../Collection/questions";
import { QuizzModel } from "../Collection/quizz";
import { ThemeModel } from "../Collection/theme";
import EmissionModel from "../Collection/emission";
import { USER_ROLE_VALUES } from "../../shared-types/user";
import { QUESTION_STATUS_VALUES } from "../../shared-types/questionStatus";
import logger from "../utils/logger";

/** Vue d'ensemble super admin (cf. ROADMAP.md, Phase 6) : comptages simples,
 * pas de pipeline d'agrégation Mongo — cohérent avec le reste du code qui
 * n'utilise nulle part .aggregate(), et largement suffisant à l'échelle
 * actuelle. */

const getUserStats = async () => {
    try {
        const [total, byRole] = await Promise.all([
            User.countDocuments(),
            Promise.all(USER_ROLE_VALUES.map(async (role) => [role, await User.countDocuments({ role })] as const)),
        ]);
        return { total, byRole: Object.fromEntries(byRole) };
    } catch (error) {
        logger.error("erreur lors du calcul des statistiques utilisateurs", error);
        return { total: 0, byRole: {} };
    }
};

const getQuestionStats = async () => {
    try {
        const [total, byStatus] = await Promise.all([
            QuestionModel.countDocuments(),
            Promise.all(QUESTION_STATUS_VALUES.map(async (status) => [status, await QuestionModel.countDocuments({ status })] as const)),
        ]);
        return { total, byStatus: Object.fromEntries(byStatus) };
    } catch (error) {
        logger.error("erreur lors du calcul des statistiques questions", error);
        return { total: 0, byStatus: {} };
    }
};

// Même forme pour Quizz/Thème/Émission : un simple booléen private, pas de workflow à états.
const getPrivacySplitStats = async (Model: { countDocuments: (filter?: object) => Promise<number> }) => {
    const [total, publicCount, privateCount] = await Promise.all([
        Model.countDocuments(),
        Model.countDocuments({ private: false }),
        Model.countDocuments({ private: true }),
    ]);
    return { total, public: publicCount, private: privateCount };
};

const getQuizzStats = async () => {
    try {
        return await getPrivacySplitStats(QuizzModel);
    } catch (error) {
        logger.error("erreur lors du calcul des statistiques quizz", error);
        return { total: 0, public: 0, private: 0 };
    }
};

const getThemeStats = async () => {
    try {
        return await getPrivacySplitStats(ThemeModel);
    } catch (error) {
        logger.error("erreur lors du calcul des statistiques thèmes", error);
        return { total: 0, public: 0, private: 0 };
    }
};

const getEmissionStats = async () => {
    try {
        return await getPrivacySplitStats(EmissionModel);
    } catch (error) {
        logger.error("erreur lors du calcul des statistiques émissions", error);
        return { total: 0, public: 0, private: 0 };
    }
};

const getBacklogSize = async () => {
    try {
        return await QuestionModel.countDocuments({ status: "pending" });
    } catch (error) {
        logger.error("erreur lors du calcul de la taille du backlog", error);
        return 0;
    }
};

interface ActivityEntry {
    type: "user" | "question" | "quizz" | "theme" | "emission";
    label: string;
    createdAt: Date;
}

/**
 * Derniers éléments créés tous types confondus, fusionnés/triés en JS (même
 * approche que messageManager.getConversationsList en Phase 5, pas
 * d'agrégation cross-collection).
 *
 * .lean() est indispensable ici : sans ça, Mongoose applique le `default`
 * du schéma (Date.now) à l'hydratation de TOUT document existant qui n'a
 * pas ce champ en base — un document créé avant la Phase 6 se serait donc
 * vu attribuer "maintenant" comme date à chaque lecture, au lieu de rester
 * simplement sans date. .lean() renvoie l'objet brut stocké, sans defaults.
 */
const getRecentActivity = async (limit: number = 20): Promise<ActivityEntry[]> => {
    try {
        const [users, questions, quizz, themes, emissions] = await Promise.all([
            User.find().sort({ createdAt: -1 }).limit(limit).select("username createdAt").lean(),
            QuestionModel.find().sort({ createdAt: -1 }).limit(limit).select("title createdAt").lean(),
            QuizzModel.find().sort({ createdAt: -1 }).limit(limit).select("title createdAt").lean(),
            ThemeModel.find().sort({ createdAt: -1 }).limit(limit).select("title createdAt").lean(),
            EmissionModel.find().sort({ createdAt: -1 }).limit(limit).select("title createdAt").lean(),
        ]);

        const entries: ActivityEntry[] = [
            ...users.filter((u) => u.createdAt).map((u) => ({ type: "user" as const, label: u.username ?? "?", createdAt: u.createdAt as Date })),
            ...questions.filter((q) => q.createdAt).map((q) => ({ type: "question" as const, label: q.title ?? "?", createdAt: q.createdAt as Date })),
            ...quizz.filter((q) => q.createdAt).map((q) => ({ type: "quizz" as const, label: q.title ?? "?", createdAt: q.createdAt as Date })),
            ...themes.filter((t) => t.createdAt).map((t) => ({ type: "theme" as const, label: t.title ?? "?", createdAt: t.createdAt as Date })),
            ...emissions.filter((e) => e.createdAt).map((e) => ({ type: "emission" as const, label: e.title ?? "?", createdAt: e.createdAt as Date })),
        ];

        return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
    } catch (error) {
        logger.error("erreur lors du calcul de l'activité récente", error);
        return [];
    }
};

const getDashboard = async () => {
    const [users, questions, quizz, themes, emissions, backlogSize, recentActivity] = await Promise.all([
        getUserStats(),
        getQuestionStats(),
        getQuizzStats(),
        getThemeStats(),
        getEmissionStats(),
        getBacklogSize(),
        getRecentActivity(),
    ]);
    return { users, questions, quizz, themes, emissions, backlogSize, recentActivity };
};

export default { getUserStats, getQuestionStats, getQuizzStats, getThemeStats, getEmissionStats, getBacklogSize, getRecentActivity, getDashboard };
