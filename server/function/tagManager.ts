import { TagModel } from "../Collection/tag";
import { QuestionModel } from "../Collection/questions";
import logger from "../utils/logger";

const normalize = (name: string): string => name.trim().toUpperCase();

/** Normalise, déduplique, et ignore les entrées vides. */
const normalizeAll = (names: string[]): string[] => {
    const seen = new Set<string>();
    for (const raw of names) {
        const name = normalize(String(raw ?? ""));
        if (name) seen.add(name);
    }
    return [...seen];
};

/**
 * Résout (ou crée) un tag canonique par son nom déjà normalisé.
 *
 * IMPORTANT : `TagModel.create()` (donc `.save()`), jamais
 * `findOneAndUpdate(..., {upsert:true})` — le plugin `mongoose-sequence` qui
 * génère `tag_id` s'accroche au hook `pre('save')`, qui ne se déclenche PAS
 * sur un upsert par `findOneAndUpdate`. Un tag créé via upsert se retrouvait
 * donc sans `tag_id` (bug réel constaté en prod locale : 76 tags sans id,
 * 174 questions avec `tags:[null]`).
 */
const resolveOneTag = async (name: string): Promise<number> => {
    const existing = await TagModel.findOne({ name });
    if (existing) return existing.tag_id;
    try {
        const created = await TagModel.create({ name });
        return created.tag_id;
    } catch (error: any) {
        // Course : un autre appel a créé ce tag entre le find et le create
        // (index unique sur `name`) — pas une vraie erreur, on relit.
        if (error?.code === 11000) {
            const raceWinner = await TagModel.findOne({ name });
            if (raceWinner) return raceWinner.tag_id;
        }
        throw error;
    }
};

/**
 * Résout une liste de tags texte libre vers leurs ids canoniques, en créant
 * au passage les tags qui n'existent pas encore.
 */
const resolveTags = async (names: string[]): Promise<number[]> => {
    const normalized = normalizeAll(names);
    if (normalized.length === 0) return [];
    return Promise.all(normalized.map(resolveOneTag));
};

/** Recherche seule (pas de création) : pour filtrer une recherche, jamais pour créer un tag depuis une simple requête. */
const lookupTagIds = async (names: string[]): Promise<number[]> => {
    const normalized = normalizeAll(names);
    if (normalized.length === 0) return [];
    const tags = await TagModel.find({ name: { $in: normalized } });
    return tags.map((t) => t.tag_id);
};

const getNameMapForIds = async (ids: number[]): Promise<Map<number, string>> => {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return new Map();
    try {
        const tags = await TagModel.find({ tag_id: { $in: uniqueIds } });
        return new Map(tags.map((t) => [t.tag_id, t.name]));
    } catch (error) {
        logger.error("erreur lors de la résolution des noms de tags", error);
        return new Map();
    }
};

/**
 * Tous les tags, avec le nombre de questions qui les portent — triés du plus
 * utilisé au moins utilisé (à égalité, ordre alphabétique). Sert le sélecteur
 * de tags des salons Points/BR (cf. TagFilterPicker.tsx).
 */
const getAllTags = async () => {
    try {
        const [tags, counts] = await Promise.all([
            TagModel.find(),
            QuestionModel.aggregate([
                { $unwind: "$tags" },
                { $group: { _id: "$tags", count: { $sum: 1 } } },
            ]),
        ]);
        const countByTagId = new Map(counts.map((c) => [c._id, c.count]));
        return tags
            .map((t) => ({
                tag_id: t.tag_id,
                name: t.name,
                questionCount: countByTagId.get(t.tag_id) ?? 0,
            }))
            .sort((a, b) => b.questionCount - a.questionCount || a.name.localeCompare(b.name));
    } catch (error) {
        logger.error("erreur lors de la récupération des tags", error);
        return [];
    }
};

const searchTags = async (query: string) => {
    try {
        const safe = query.trim();
        if (!safe) return [];
        const regex = new RegExp(safe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        return await TagModel.find({ name: regex }).sort({ name: 1 }).limit(20);
    } catch (error) {
        logger.error("erreur lors de la recherche de tags", error);
        return [];
    }
};

export default { resolveTags, lookupTagIds, getNameMapForIds, getAllTags, searchTags };
