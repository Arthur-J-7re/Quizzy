import {QuizzModel, ListQuizzModel, GridQuizzModel, PickAndBanQuizzModel, BigBucketQuizzModel, TimerQuizzModel} from "../Collection/quizz";
import { QuizzMode } from "../Interface/Quizz";
import questionManager from "./questionManager";
import { Socket } from 'socket.io';
import logger from "../utils/logger";
import { isQuizzEffectivelyPublic, getQuizzBlockingCount } from "./publicationStatus";
import { cascadePrivatizeEmissionsUsingQuizz } from "./publicationCascade";
import { createEntityQueryHelpers } from "./entityQueryHelpers";

const {
    getByCreator: getQuizzByCreator,
    getAvailable: getAvailableQuizz,
    getPublic: getPublicQuizz,
    getByIds: getQuizzByIds,
    getCreatorOf: getCreatorOfQuizz,
    getPublicationStatus,
} = createEntityQueryHelpers({
    model: QuizzModel,
    idField: "quizz_id",
    entityLabel: "quizz",
    isEffectivelyPublic: isQuizzEffectivelyPublic,
    getBlockingCount: getQuizzBlockingCount,
});

const createQuizz = async ( data : any) => {
    switch (data.mode){
        case "LIST":
            return createListQuizz(data);
        case "GRID":
            return createGridQuizz(data);
        case "PICKANDBAN":
            return createPickAndBanQuizz(data);
        case "BIGBUCKET":
            return createBigBucketQuizz(data);
        case "TIMER":
            return createTimerQuizz(data);
        default:
            // Mode inconnu : la route traduit ça en 400 plutôt qu'un undefined
            // qui remontait jusqu'au client.
            return {success : false};
    }
};

const createListQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await ListQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.LIST,
            tags: data.tags,
            title: data.title,
            private: data.private,
            questions : data.questions,
            answerDurationMs : data.answerDurationMs,
            scoring : data.scoring,
            forcedType : data.forcedType
        });
        logger.debug("après la création List");
        await questionManager.addQuizzToQuestion(data.questions, newQuizz.quizz_id);
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updateListQuizzObj = async (quizzObj : any) =>{
    try {
        logger.debug("les infos de l'update", quizzObj);
        logger.debug("l'id", quizzObj.quizz_id);
        const quizzUPdated = await ListQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            questions : quizzObj.questions,
            answerDurationMs : quizzObj.answerDurationMs,
            scoring : quizzObj.scoring,
            forcedType : quizzObj.forcedType
        }});
        logger.debug(quizzUPdated);
        await questionManager.addQuizzToQuestion(quizzObj.questionList, quizzObj.quizz_id);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz liste", error);
        return({success : false});
    }
}

const createGridQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await GridQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.GRID,
            tags: data.tags,
            title: data.title,
            private: data.private,
            themes : data.themes,
            width : data.width,
            height : data.height,
            cellsPerTheme : data.cellsPerTheme,
            neutralQuestions : data.neutralQuestions,
            memorizeDurationMs : data.memorizeDurationMs,
            answerDurationMs : data.answerDurationMs,
            scoring : data.scoring,
            forcedType : data.forcedType
        });
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})


    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updateGridQuizzObj = async (quizzObj : any) =>{
    try {
        logger.debug("les infos de l'update", quizzObj);
        logger.debug("l'id", quizzObj.quizz_id);
        const quizzUPdated = await GridQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            themes : quizzObj.themes,
            width : quizzObj.width,
            height : quizzObj.height,
            cellsPerTheme : quizzObj.cellsPerTheme,
            neutralQuestions : quizzObj.neutralQuestions,
            memorizeDurationMs : quizzObj.memorizeDurationMs,
            answerDurationMs : quizzObj.answerDurationMs,
            scoring : quizzObj.scoring,
            forcedType : quizzObj.forcedType
        }});
        logger.debug(quizzUPdated);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz grille", error);
        return({success : false});
    }
}

const createPickAndBanQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await PickAndBanQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.PICKANDBAN,
            tags: data.tags,
            title: data.title,
            private: data.private,
            themes : data.themes,
            columns : data.columns,
            draftTurnDurationMs : data.draftTurnDurationMs,
            answerDurationMs : data.answerDurationMs,
            scoring : data.scoring,
            forcedType : data.forcedType,
            allowBan : data.allowBan
        });
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updatePickAndBanQuizzObj = async (quizzObj : any) =>{
    try {
        logger.debug("les infos de l'update", quizzObj);
        logger.debug("l'id", quizzObj.quizz_id);
        const quizzUPdated = await PickAndBanQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            themes : quizzObj.themes,
            columns : quizzObj.columns,
            draftTurnDurationMs : quizzObj.draftTurnDurationMs,
            answerDurationMs : quizzObj.answerDurationMs,
            scoring : quizzObj.scoring,
            forcedType : quizzObj.forcedType,
            allowBan : quizzObj.allowBan
        }});
        logger.debug(quizzUPdated);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz pick and ban", error);
        return({success : false});
    }
}

const createBigBucketQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await BigBucketQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.BIGBUCKET,
            tags: data.tags,
            title: data.title,
            private: data.private,
            themes : data.themes,
            width : data.width,
            height : data.height
        });
        logger.debug("après la création BigBucket");
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updateBigBucketQuizzObj = async (quizzObj : any) =>{
    try {
        logger.debug("les infos de l'update", quizzObj);
        logger.debug("l'id", quizzObj.quizz_id);
        const quizzUPdated = await BigBucketQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            themes : quizzObj.themes,
            width : quizzObj.width,
            height : quizzObj.height
        }});
        logger.debug(quizzUPdated);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz big bucket", error);
        return({success : false});
    }
}

const createTimerQuizz = async (data : any) =>{
    try {
        let newQuizz;

        newQuizz = await TimerQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.TIMER,
            tags: data.tags,
            title: data.title,
            private: data.private,
            themes : data.themes,
            turnDurationMs : data.turnDurationMs,
            hostModeEnabled : Boolean(data.hostModeEnabled),
            scoring : data.scoring,
            forcedType : data.forcedType
        });
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})

    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updateTimerQuizzObj = async (quizzObj : any) =>{
    try {
        logger.debug("les infos de l'update", quizzObj);
        logger.debug("l'id", quizzObj.quizz_id);
        const quizzUPdated = await TimerQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            themes : quizzObj.themes,
            turnDurationMs : quizzObj.turnDurationMs,
            hostModeEnabled : Boolean(quizzObj.hostModeEnabled),
            scoring : quizzObj.scoring,
            forcedType : quizzObj.forcedType
        }});
        logger.debug(quizzUPdated);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz timer", error);
        return({success : false});
    }
}

const updateQuizz = async (information : any) =>{
    logger.debug("on modifie le quizz");
    try {
        let quizzObj = information;
        const updateByMode: Record<string, (obj: any) => Promise<{ success: boolean }>> = {
            LIST: updateListQuizzObj,
            GRID: updateGridQuizzObj,
            PICKANDBAN: updatePickAndBanQuizzObj,
            BIGBUCKET: updateBigBucketQuizzObj,
            TIMER: updateTimerQuizzObj,
        };
        const update = updateByMode[information.mode];
        if (!update) {
            return ({success:false});
        }
        const retour = await update(quizzObj);
        if (retour.success && quizzObj.private) {
            // Privatisation manuelle : les émissions qui dépendaient de ce
            // quizz public doivent repasser privées aussi (cf. ROADMAP.md,
            // Phase 4) — no-op si rien n'en dépendait ou s'il était déjà privé.
            await cascadePrivatizeEmissionsUsingQuizz([Number(quizzObj.quizz_id)]);
        }
        return retour;
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false});
    }
};


const deleteQuizz = async (quizzId : string | number) => {
    try {
        const questionsToUpdate =await getQuestionsOfQuizz(Number(quizzId));
        await QuizzModel.deleteOne({quizz_id : quizzId});
        if (questionsToUpdate){
            await questionManager.handleDeletedQuizz(questionsToUpdate, Number(quizzId));
        }
        // Toute émission publique dont une étape référençait ce quizz devient
        // injouable immédiatement (résolu en direct au lancement, pas une
        // copie figée) — cf. ROADMAP.md, Phase 4.
        await cascadePrivatizeEmissionsUsingQuizz([Number(quizzId)]);
        return ({success : true});
    } catch (error) {
        console.error("error de la suprression du quizz : " + quizzId, error);
        return ({success : false});
    }
};

const handleDeletedQuestion = async (quizzIds: number[], question_id: number) => {
    try {
        await Promise.all(quizzIds.map(async (quizz_id: number) => {
            // `questions` n'existe que sur le schéma discriminator LIST : passer
            // par le modèle de base `QuizzModel` fait taire silencieusement le
            // $pull (mode strict Mongoose, champ inconnu du schéma de base).
            await ListQuizzModel.updateOne(
                { quizz_id: quizz_id },
                { $pull: { questions: question_id } }
            );
        }));
        return { success: true };
    } catch (error) {
        console.error("Erreur dans l'update des questions après la suppression d'un quizz", error);
        return { success: false };
    }
};

const getQuestionsOfQuizz = async (id : number) => {
    const retour = await  ListQuizzModel.findOne().where("quizz_id").equals(id);
    return retour?.questions;
};
/** Quizz LIST complet (questions, durée de réponse). */
const getListQuizz = async (id : number) => {
    return await ListQuizzModel.findOne().where("quizz_id").equals(id);
};

/** Quizz TIMER complet (thèmes, durée de tour). */
const getTimerQuizz = async (id : number) => {
    return await TimerQuizzModel.findOne().where("quizz_id").equals(id);
};

/** Quizz GRID complet (thèmes, dimensions, questions neutres). */
const getGridQuizz = async (id : number) => {
    return await GridQuizzModel.findOne().where("quizz_id").equals(id);
};

/** Quizz PICKANDBAN complet (thèmes avec leurs images et questions). */
const getPickAndBanQuizz = async (id : number) => {
    return await PickAndBanQuizzModel.findOne().where("quizz_id").equals(id);
};

export default{createQuizz,updateQuizz,deleteQuizz,
handleDeletedQuestion, getQuestionsOfQuizz,getPublicQuizz,
getQuizzByCreator, getAvailableQuizz, getQuizzByIds, getCreatorOfQuizz, getListQuizz, getGridQuizz, getPickAndBanQuizz, getTimerQuizz,
getPublicationStatus};