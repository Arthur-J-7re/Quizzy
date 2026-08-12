import { QuestionModel } from '../Collection/questions';

type QuestionFilters = {
    requiredTags?: number[];
    excludedTags?: number[];
    mode?: string[];
    difficulty?: string;
    language?: string;
    isPrivate?: boolean;

  };

export type RandomDrawOptions = {
    /**
     * Filtre "choisir" (id de tag canonique, cf. Collection/tag.ts) : la
     * question doit avoir AU MOINS UN de ces tags ($in, pas $all — un
     * utilisateur qui coche plusieurs tags veut piocher dans n'importe lequel
     * d'entre eux, pas dans les seules questions qui les ont tous à la fois).
     * `undefined` = pas de filtre ; `[]` = l'utilisateur a tout décoché,
     * aucune question ne peut matcher (comportement Mongo `$in: []`).
     */
    wantedTags?: number[];
    /** Filtre "bloquer" : la question ne doit avoir AUCUN de ces tags ($nin). */
    excludedTags?: number[];
    allowedModes?: string[];
    excludedQuestionIds?: number[];
};

/**
 * Tire une question aléatoire respectant les filtres donnés. Utilisée pour
 * le tirage dynamique un par un des modes Points/BR : `allowedModes` honore
 * le "type forcé" du salon (cf. shared-types/scoring.ts
 * FORCED_TYPE_ALLOWED_MODES), `excludedQuestionIds` évite de retirer deux
 * fois la même question pendant une partie.
 */
const getRandomDocWithTags = async (options: RandomDrawOptions) => {
    const match: Record<string, unknown> = {};

    const tagsMatch: Record<string, unknown> = {};
    if (options.wantedTags !== undefined) {
        tagsMatch.$in = options.wantedTags;
    }
    if (options.excludedTags?.length) {
        tagsMatch.$nin = options.excludedTags;
    }
    if (Object.keys(tagsMatch).length > 0) {
        match.tags = tagsMatch;
    }

    if (options.allowedModes?.length) {
        match.mode = { $in: options.allowedModes };
    }
    if (options.excludedQuestionIds?.length) {
        match.question_id = { $nin: options.excludedQuestionIds };
    }

    const result = await QuestionModel.aggregate([
        { $match: match },
        { $sample: { size: 1 } }              // tire un document aléatoire
    ]);

    return result[0] || null;
}

async function getRandomQuestion(filters: QuestionFilters, size :number = 1) {
    const match: any = {};

    if (filters.requiredTags && filters.requiredTags.length > 0) {
        match.tags = match.tags || {};
        match.tags.$in = filters.requiredTags;
    }

    if (filters.excludedTags && filters.excludedTags.length > 0) {
        match.tags = match.tags || {};
        match.tags.$nin = filters.excludedTags;
    }

    if (filters.mode) {
        match.mode = { $in: filters.mode };
    }

    if (filters.difficulty) {
        match.difficulty = filters.difficulty;
    }

    if (filters.language) {
        match.language = filters.language;
    }

    if (typeof filters.isPrivate === 'boolean') {
        match.isPrivate = filters.isPrivate;
      }

    const result = await QuestionModel.aggregate([
        { $match: match },
        { $sample: { size: size } }
    ]);

    return size === 1 ? result[0] || null : result;
}

export default {getRandomDocWithTags, getRandomQuestion}
  