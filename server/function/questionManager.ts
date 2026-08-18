import {QuizzModel} from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import {QuestionModel, QCMModel, FreeModel, DCCModel, VFModel }  from '../Collection/questions';
import { QuestionMode } from '../Interface/Question';
import { Socket } from 'socket.io';
import quizzManager from './quizzManager';
import tagManager from './tagManager';
import notificationManager from './notificationManager';
import { cascadeAfterQuestionsDeleted } from './publicationCascade';
import { createEntityQueryHelpers } from './entityQueryHelpers';
import logger from "../utils/logger";
import type { QuestionStatus } from "../../shared-types/questionStatus";

const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * `folder_id` est optionnel côté question ("sans dossier" = absent) : un
 * `$set` classique ignore les clés `undefined` (Mongoose les retire avant
 * l'envoi à Mongo), donc retirer une question d'un dossier exige un `$unset`
 * explicite plutôt qu'un `$set: {folder_id: undefined}`.
 */
const buildQuestionUpdate = (fields: Record<string, unknown>, folder_id?: number) => ({
    $set: folder_id != null ? { ...fields, folder_id } : fields,
    ...(folder_id == null ? { $unset: { folder_id: "" } } : {}),
});

/**
 * Statut appliqué par un simple edit créateur (jamais choisi par le client) :
 * une question déjà `approved` repasse en `pending` (toute édition doit être
 * re-validée, pour empêcher de faire approuver un contenu anodin puis de le
 * changer librement ensuite) ; les autres statuts ne bougent pas via un edit.
 */
const resolveStatusOnEdit = async (question_id: number): Promise<QuestionStatus> => {
    const current = await QuestionModel.findOne().select("status").where("question_id").equals(question_id);
    return current?.status === "approved" ? "pending" : ((current?.status as QuestionStatus | undefined) ?? "private");
};

const createQCMQuestion = async ( questionObj : any) =>{
    logger.debug(questionObj);
    try {
        const newQuest = await QCMModel.create({
            creator: Number(questionObj.creator),
            tags: await tagManager.resolveTags(questionObj.tags ?? []),
            title: questionObj.title,
            level: questionObj.level,
            status: "private",
            mode: QuestionMode.QCM,
            choices: questionObj.choices,
            answer: questionObj.answer,
        });
        return({success : true, creator : newQuest.creator, question_id : newQuest.question_id});
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false, creator : 0, question_id : 0});
    }
};

const updateQCMQuestion = async ( information : any) =>{
    logger.debug("on modifie le qcm");
    try {
        let questionObj = information.data;
        await QCMModel.updateOne({ question_id: information.question_id }, buildQuestionUpdate({
            tags: await tagManager.resolveTags(questionObj.tags ?? []),
            title: questionObj.title,
            level: questionObj.level,
            status: await resolveStatusOnEdit(information.question_id),
            mode: QuestionMode.QCM,
            choices: questionObj.choices,
            answer: questionObj.answer,
        }, questionObj.folder_id));
        return({success : true});
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false});
    }
};

const createFreeQuestion = async( questionObj : any) => {
    try {
        const newQuest = await FreeModel.create({
            creator: Number(questionObj.creator),
            tags: await tagManager.resolveTags(questionObj.tags ?? []),
            title: questionObj.title,
            level: questionObj.level,
            status: "private",
            mode: QuestionMode.FREE,
            answers: questionObj.answers,
        });
        return({success : true, creator : newQuest.creator, question_id : newQuest.question_id});

    } catch (error) {
        if (error instanceof Error) {
        console.error(error.message);
        } else {
        console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false, creator : 0, question_id : 0});
    }
};

const updateFreeQuestion = async ( information : any) =>{
    try {
        let questionObj = information.data;
        await FreeModel.updateOne({ question_id: information.question_id }, buildQuestionUpdate({
            tags: await tagManager.resolveTags(questionObj.tags ?? []),
            title: questionObj.title,
            level: questionObj.level,
            status: await resolveStatusOnEdit(information.question_id),
            mode: QuestionMode.FREE,
            answers: questionObj.answers,
        }, questionObj.folder_id));
        return({success : true});
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false});
    }
};

const createDCCQuestion = async( questionObj : any) => {
    try {
        const newQuest = await DCCModel.create({
            creator: Number(questionObj.creator),
            tags: await tagManager.resolveTags(questionObj.tags ?? []),
            title: questionObj.title,
            level: questionObj.level,
            status: "private",
            mode: QuestionMode.DCC,
            carre: questionObj.carre,
            duo: questionObj.duo,
            answer: questionObj.answer,
            cash: questionObj.cash,
        });
        return({success : true, creator : newQuest.creator, question_id : newQuest.question_id});


    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false, creator : 0, question_id : 0});
    }

};

const updateDCCQuestion = async ( information : any) =>{
    try {
        let questionObj = information.data;
        await DCCModel.updateOne({ question_id: information.question_id }, buildQuestionUpdate({
            tags: await tagManager.resolveTags(questionObj.tags ?? []),
            title: questionObj.title,
            level: questionObj.level,
            status: await resolveStatusOnEdit(information.question_id),
            mode: QuestionMode.DCC,
            carre: questionObj.carre,
            duo: questionObj.duo,
            answer: questionObj.answer,
            cash: questionObj.cash,
        }, questionObj.folder_id));
        return({success : true});
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false});
    }
};

const createVFQuestion = async(questionObj : any) => {
    logger.debug("tentative de création de question");
    logger.debug(questionObj);
    try {
        const newQuest = await VFModel.create({
            creator: Number(questionObj.creator),
            tags: await tagManager.resolveTags(questionObj.tags ?? []),
            title: questionObj.title,
            level: questionObj.level,
            status: "private",
            mode: QuestionMode.VF,
            truth: questionObj.truth,
        });
        return({success : true, creator : newQuest.creator, question_id : newQuest.question_id});
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false, creator : 0, question_id : 0});
    }

};

const updateVFQuestion = async ( information : any) =>{
    try {
        let questionObj = information.data;
        await VFModel.updateOne({ question_id: information.question_id }, buildQuestionUpdate({
            tags: await tagManager.resolveTags(questionObj.tags ?? []),
            title: questionObj.title,
            level: questionObj.level,
            status: await resolveStatusOnEdit(information.question_id),
            mode: QuestionMode.VF,
            truth: questionObj.truth,
        }, questionObj.folder_id));
        return({success : true});
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false});
    }
};

const deleteQuestion = async (question_id: string | number) => {
    try {
        const quizzToUpdate =await getQuizzOfQuestion(Number(question_id));
        await QuestionModel.deleteOne({question_id : question_id});
        if (quizzToUpdate){
            await quizzManager.handleDeletedQuestion(quizzToUpdate, Number(question_id));
        }
        // Nettoie aussi les références mortes que handleDeletedQuestion ne
        // couvre pas (thèmes, thèmes embarqués, pool neutre Grid) et
        // repasse en privé + notifie tout ce qui en devient injouable
        // (cf. ROADMAP.md, Phase 4).
        await cascadeAfterQuestionsDeleted([Number(question_id)]);
        return ({success : true});
    } catch (error) {
        console.error("error de la suprression du quizz : " + question_id, error);
        return ({success : false});
    }
};

const handleDeletedQuizz = async (questionsId: number[], quizzId: number) => {
    try {
        await Promise.all(questionsId.map(async (questionId: number) => {
            await QuestionModel.updateOne(
                { question_id: questionId },
                { $pull: { quizz: quizzId } }
            );
        }));
        return { success: true };
    } catch (error) {
        console.error("Erreur dans l'update des questions après la suppression d'un quizz", error);
        return { success: false };
    }
};

const addQuizzToQuestion = async (questionsList : number[], quizz_id : any) => {
    logger.debug("la question list:",questionsList);
    try {
        if (quizz_id){
            await Promise.all(questionsList.map(async (question_id : number) =>{
                await QuestionModel.updateOne(
                    {question_id : question_id},
                    {$addToSet: {quizz: quizz_id}}
                );
            } ));
            return {success: true}
        }
        return {success : false};
    } catch(error){
        console.error("error lors de l'update de la question", error);
        return {success : false};
    }
}

const update = async () => {
    logger.debug("ça update là ?" );
    try {
        await QuestionModel.updateMany(
            {},
            { $set: { quizz: [] } }  // Remarque: tu peux remplacer [] par toute valeur par défaut
        );
        logger.debug("ah ça a bien tout update miam miam");
    } catch (error) {
        console.error("erreur lors de la màj : ", error);
    }
}

/**
 * `Question.tags` est stocké en ids canoniques (cf. Collection/tag.ts) : on
 * les repeuple en noms lisibles avant de répondre au client, qui continue de
 * manipuler des strings comme avant (aucun changement requis côté front).
 */
const attachTagNames = async (docs: any[]) => {
    const plainDocs = docs.map((doc) => (doc?.toObject ? doc.toObject() : doc));
    const allIds = plainDocs.flatMap((doc) => doc.tags ?? []);
    const nameMap = await tagManager.getNameMapForIds(allIds);
    return plainDocs.map((doc) => ({
        ...doc,
        tags: (doc.tags ?? []).map((id: number) => nameMap.get(id)).filter(Boolean),
    }));
};

const {
    getByCreator: getQuestionByCreator,
    getAvailable: getAvailableQuestions,
    getPublic: getPublicQuestions,
    getByIds: getQuestionsByIds,
    getCreatorOf: getCreatorOfQuestion,
} = createEntityQueryHelpers({
    model: QuestionModel,
    idField: "question_id",
    entityLabel: "questions",
    // Pas de cascade ici (contrairement à quizz/thème/émission) : le statut
    // "approved" est la seule condition de visibilité publique d'une question.
    publicFilter: { status: "approved" },
    postProcess: attachTagNames,
});

const getQuestionById = async (id : number) => {
    const retour = await QuestionModel.findOne().where("question_id").equals(id);
    return retour;
}

export interface QuestionSearchQuery {
    scope?: "mine" | "public" | "all";
    folder_id?: number | "none";
    tags?: string[];
    mode?: string;
    search?: string;
    skip?: number;
    limit?: number;
}

/**
 * Recherche filtrée/paginée poussée dans la requête Mongo, au contraire de
 * `getAvailableQuestions` (tout, non filtré, filtré ensuite côté client) —
 * gardée à part plutôt que remplacée en place tant que d'autres appelants
 * (formulaires de création) n'ont pas migré vers ce nouvel endpoint.
 */
const getFilteredQuestions = async (userId: number, query: QuestionSearchQuery) => {
    try {
        const filter: Record<string, unknown> = {};

        if (query.scope === "mine") {
            filter.creator = userId;
        } else if (query.scope === "public") {
            filter.status = "approved";
            filter.creator = { $ne: userId };
        } else {
            filter.$or = [{ creator: userId }, { status: "approved" }];
        }

        if (query.folder_id === "none") {
            filter.folder_id = { $exists: false };
        } else if (query.folder_id !== undefined) {
            filter.folder_id = query.folder_id;
        }

        if (query.tags?.length) {
            const tagIds = await tagManager.lookupTagIds(query.tags);
            // Un des tags recherchés n'existe pas encore comme tag canonique :
            // aucune question ne peut matcher tous les tags demandés, sinon
            // $all sur une liste d'ids plus courte que prévu remonterait des
            // faux positifs (questions n'ayant qu'une partie des tags voulus).
            if (tagIds.length < new Set(query.tags.map((t) => t.trim().toUpperCase())).size) {
                return { items: [], total: 0 };
            }
            filter.tags = { $all: tagIds };
        }
        if (query.mode) {
            filter.mode = query.mode;
        }
        if (query.search) {
            filter.title = { $regex: query.search, $options: "i" };
        }

        const skip = query.skip ?? 0;
        const limit = Math.min(query.limit ?? 50, 200);

        const [items, total] = await Promise.all([
            QuestionModel.find(filter).skip(skip).limit(limit),
            QuestionModel.countDocuments(filter),
        ]);
        return { items: await attachTagNames(items), total };
    } catch (error) {
        logger.error("erreur lors de la recherche de questions", error);
        return { items: [], total: 0 };
    }
};

export interface BacklogQuery {
    mode?: string;
    tags?: string[];
    skip?: number;
    limit?: number;
}

/** Backlog de modération (cf. ROADMAP.md, Phase 2) : questions en attente d'un admin, même forme paginée que getFilteredQuestions. */
const getPendingBacklog = async (query: BacklogQuery) => {
    try {
        const filter: Record<string, unknown> = { status: "pending" };

        if (query.tags?.length) {
            const tagIds = await tagManager.lookupTagIds(query.tags);
            if (tagIds.length < new Set(query.tags.map((t) => t.trim().toUpperCase())).size) {
                return { items: [], total: 0 };
            }
            filter.tags = { $all: tagIds };
        }
        if (query.mode) {
            filter.mode = query.mode;
        }

        const skip = query.skip ?? 0;
        const limit = Math.min(query.limit ?? 50, 200);

        const [items, total] = await Promise.all([
            QuestionModel.find(filter).skip(skip).limit(limit),
            QuestionModel.countDocuments(filter),
        ]);
        return { items: await attachTagNames(items), total };
    } catch (error) {
        logger.error("erreur lors de la récupération du backlog de modération", error);
        return { items: [], total: 0 };
    }
};

/**
 * Demande de publication du créateur : private/rejected -> pending. La
 * propriété est vérifiée côté route (assertOwner), comme update/delete.
 */
const requestPublication = async (question_id: number) => {
    try {
        const question = await QuestionModel.findOne().where("question_id").equals(question_id);
        if (!question) {
            return { success: false, message: "Cette question n'existe pas." };
        }
        if (question.status !== "private" && question.status !== "rejected") {
            return { success: false, message: "Cette question ne peut pas être soumise dans son état actuel." };
        }
        await QuestionModel.updateOne(
            { question_id },
            { $set: { status: "pending" }, $unset: { rejectionReason: "" } }
        );
        return { success: true };
    } catch (error) {
        console.error("erreur lors de la demande de publication", error);
        return { success: false };
    }
};

/**
 * Approbation admin : passe la question en `approved`, avec d'éventuelles
 * corrections (orthographe, tags, réponses...) appliquées au passage —
 * `edits` porte les mêmes champs qu'un update créateur (title/level/tags et
 * les champs propres au mode), tous optionnels.
 */
const approveQuestion = async (question_id: number, edits: Record<string, unknown> = {}) => {
    try {
        const question = await QuestionModel.findOne().select("creator title").where("question_id").equals(question_id);
        const fields: Record<string, unknown> = { ...edits, status: "approved" };
        if (Array.isArray(edits.tags)) {
            fields.tags = await tagManager.resolveTags(edits.tags as string[]);
        }
        await QuestionModel.updateOne({ question_id }, { $set: fields, $unset: { rejectionReason: "" } });
        if (question) {
            const title = (edits.title as string | undefined) ?? question.title;
            await notificationManager.create(
                question.creator,
                "question_approved",
                `Votre question "${title}" a été approuvée et est maintenant publique.`
            );
        }
        return { success: true };
    } catch (error) {
        console.error("erreur lors de l'approbation de la question", error);
        return { success: false };
    }
};

/** Refus admin : motif obligatoire, affiché au créateur (cf. QuestionCreationForm). */
const rejectQuestion = async (question_id: number, reason: string) => {
    try {
        const question = await QuestionModel.findOne().select("creator title").where("question_id").equals(question_id);
        await QuestionModel.updateOne({ question_id }, { $set: { status: "rejected", rejectionReason: reason } });
        if (question) {
            await notificationManager.create(
                question.creator,
                "question_rejected",
                `Votre question "${question.title}" a été refusée. Motif : ${reason}`
            );
        }
        return { success: true };
    } catch (error) {
        console.error("erreur lors du refus de la question", error);
        return { success: false };
    }
};

const getQuizzOfQuestion = async (id : number) => {
    const retour = await QuestionModel.findOne().where("question_id").equals(id);
    return retour?.quizz;
};

export default {update, createQCMQuestion,updateQCMQuestion,
createFreeQuestion, updateFreeQuestion, createDCCQuestion,
updateDCCQuestion, createVFQuestion, updateVFQuestion,
deleteQuestion, handleDeletedQuizz, addQuizzToQuestion,
getQuestionByCreator, getQuestionById, getQuestionsByIds, getAvailableQuestions,
getFilteredQuestions,
getPublicQuestions,getQuizzOfQuestion, getCreatorOfQuestion,
getPendingBacklog, requestPublication, approveQuestion, rejectQuestion
};
