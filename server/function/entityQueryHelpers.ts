import logger from "../utils/logger";

/**
 * Factorise le quintet getByCreator/getPublic/getAvailable/getByIds/
 * getCreatorOf/getPublicationStatus, réimplémenté quasi à l'identique dans
 * `questionManager`, `quizzManager`, `themeManager`, `emissionManager` (cf.
 * ROADMAP.md, Phase 1, addendum). `create`/`update`/`delete` restent propres
 * à chaque manager : leurs champs diffèrent trop par entité/mode pour être
 * factorisés sans généricité illisible.
 */
interface EntityQueryHelpersOptions {
    /** Modèle Mongoose portant `creator` et `[idField]`. */
    model: any;
    /** Nom du champ id métier (ex. "quizz_id"), distinct de `_id`. */
    idField: string;
    /** Utilisé uniquement dans les messages de log. */
    entityLabel: string;
    /** Filtre Mongo identifiant les candidats "publics" (avant re-vérification éventuelle). Défaut : `{ private: false }`. */
    publicFilter?: Record<string, unknown>;
    /**
     * Re-vérification au-delà de `publicFilter`, ex. cascade de publication
     * (cf. ROADMAP.md, Phase 3) pour quizz/thème/émission. Défaut : toujours
     * vrai (le `publicFilter` suffit, cas des questions : `status: "approved"`).
     */
    isEffectivelyPublic?: (doc: any) => Promise<boolean>;
    /** Pour `getPublicationStatus` : nombre de blocages restants. Défaut : toujours 0. */
    getBlockingCount?: (doc: any) => Promise<number>;
    /** Post-traitement appliqué à toute liste de docs renvoyée (ex. résolution des tags en noms). Défaut : identité. */
    postProcess?: (docs: any[]) => Promise<any[]>;
    /** `.lean()` sur les requêtes multi-documents (pas sur `getCreatorOf`, jamais lean sur aucun manager existant). Défaut : false. */
    lean?: boolean;
}

export function createEntityQueryHelpers({
    model,
    idField,
    entityLabel,
    publicFilter = { private: false },
    isEffectivelyPublic = async () => true,
    getBlockingCount = async () => 0,
    postProcess = async (docs: any[]) => docs,
    lean = false,
}: EntityQueryHelpersOptions) {
    const find = (filter: Record<string, unknown>) => {
        const query = model.find(filter);
        return lean ? query.lean() : query;
    };

    const findOneById = (id: string | number) => {
        const query = model.findOne().where(idField).equals(id);
        return lean ? query.lean() : query;
    };

    const filterEffectivelyPublic = async (docs: any[]): Promise<any[]> => {
        const flags = await Promise.all(docs.map((doc) => isEffectivelyPublic(doc)));
        return docs.filter((_, i) => flags[i]);
    };

    const getByCreator = async (creatorId: number, extraFilter: Record<string, unknown> = {}) => {
        try {
            const docs = await find({ creator: Number(creatorId), ...extraFilter });
            return await postProcess(docs);
        } catch (error) {
            logger.error(`erreur lors de la récupération des ${entityLabel} du créateur`, error);
            return [];
        }
    };

    const getPublic = async (extraFilter: Record<string, unknown> = {}) => {
        try {
            const candidates = await find({ ...publicFilter, ...extraFilter });
            const visible = await filterEffectivelyPublic(candidates);
            return await postProcess(visible);
        } catch (error) {
            logger.error(`erreur lors de la récupération des ${entityLabel} publics`, error);
            return [];
        }
    };

    /** Sans `creatorId` : équivalent à `getPublic`. Avec : ses propres entités + les publiques des autres, sans doublon. */
    const getAvailable = async (creatorId?: number, extraFilter: Record<string, unknown> = {}) => {
        if (creatorId == null) return getPublic(extraFilter);
        try {
            const owned = await find({ creator: Number(creatorId), ...extraFilter });
            const candidates = await find({ ...publicFilter, creator: { $ne: creatorId }, ...extraFilter });
            const visible = await filterEffectivelyPublic(candidates);
            return await postProcess([...owned, ...visible]);
        } catch (error) {
            logger.error(`erreur lors de la récupération des ${entityLabel} disponibles`, error);
            return [];
        }
    };

    const getByIds = async (ids: number[]) => {
        if (ids.length === 0) return [];
        try {
            const docs = await find({ [idField]: { $in: ids } });
            return await postProcess(docs);
        } catch (error) {
            logger.error(`erreur lors de la récupération des ${entityLabel} par ids`, error);
            return [];
        }
    };

    /** Jamais `lean` : appelants existants s'attendent à un document Mongoose (ou juste au champ `creator`). */
    const getCreatorOf = async (id: string | number) => {
        try {
            const doc = await model.findOne().select("creator").where(idField).equals(id);
            return doc?.creator;
        } catch (error) {
            logger.error("erreur lors de la récupération du créateur", error);
            return undefined;
        }
    };

    /** Réservé à l'écran d'édition du créateur : pourquoi son entité "publique" ne l'est pas encore vraiment (cf. ROADMAP.md, Phase 3). */
    const getPublicationStatus = async (id: number) => {
        const doc = await findOneById(id);
        if (!doc) return { effectivePublic: false, blockedCount: 0 };
        return {
            effectivePublic: await isEffectivelyPublic(doc),
            blockedCount: await getBlockingCount(doc),
        };
    };

    return { getByCreator, getPublic, getAvailable, getByIds, getCreatorOf, getPublicationStatus, filterEffectivelyPublic };
}
