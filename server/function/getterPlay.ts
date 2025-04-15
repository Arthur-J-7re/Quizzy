import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Quest from '../Collection/questions';

const { QuestionModel, QCMModel, FreeModel, DCCModel } = Quest;

type QuestionFilters = {
    requiredTags?: string[];     
    excludedTags?: string[];     
    mode?: string[];               
    difficulty?: string;         
    language?: string;   
    isPrivate?: boolean;

  };

const getRandomDocWithTags = async (requiredTags: string[], excludedTags: string[]) => {
    const result = await QuestionModel.aggregate([
        {
            $match: {
                tags: {
                $all: requiredTags,           // contient tous les tags requis
                $nin: excludedTags            // ne contient aucun tag interdit
                }
            }
        },
        {
            $sample: { size: 1 }              // tire un document aléatoire
        }
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
  