import {QuizzModel} from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import {QuestionModel, QCMModel, FreeModel, DCCModel, VFModel }  from '../Collection/questions';
import { QuestionMode } from '../Interface/Question';
import { Socket } from 'socket.io';
import quizzManager from './quizzManager';

const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const createQCMQuestion = async ( questionObj : any) =>{
    console.log(questionObj);
    try {
        const newQuest = await QCMModel.create({
            creator: Number(questionObj.creator),
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
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
    console.log("on modifie le qcm");
    try {
        let questionObj = information.data;
        await QCMModel.updateOne({ question_id: information.question_id },{$set : {
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: QuestionMode.QCM,
            choices: questionObj.choices,
            answer: questionObj.answer,
        }});
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
            creator: Number(questionObj.user_id),    
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
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
        await FreeModel.updateOne({ question_id: information.question_id },{$set : {
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: QuestionMode.FREE,
            answers: questionObj.answers,
        }});
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
            creator: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
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
        await DCCModel.updateOne({ question_id: information.question_id },{$set : {
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: QuestionMode.DCC,
            carre: questionObj.carre,
            duo: questionObj.duo,
            answer: questionObj.answer,
            cash: questionObj.cash,
        }});
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
    console.log("tentative de création de question");
    console.log(questionObj);
    try {
        const newQuest = await VFModel.create({
            creator: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
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
        await VFModel.updateOne({ question_id: information.question_id },{$set : {
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: QuestionMode.VF,
            truth: questionObj.truth,
        }});
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

const deleteQuestion = async (question_id: String) => {
    try {
        const quizzToUpdate =await getQuizzOfQuestion(Number(question_id));
        await QuestionModel.deleteOne({question_id : question_id});
        if (quizzToUpdate){
            await quizzManager.handleDeletedQuestion(quizzToUpdate, Number(question_id));
        }
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
    console.log("la question list:",questionsList);
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
    console.log("ça update là ?" );
    try {
        await QuestionModel.updateMany(
            {},
            { $set: { quizz: [] } }  // Remarque: tu peux remplacer [] par toute valeur par défaut
        );
        console.log("ah ça a bien tout update miam miam");
    } catch (error) {
        console.error("erreur lors de la màj : ", error);
    }
}

const getQuestionByCreator =async (id : number) => {
    const retour = await QuestionModel.find().where('creator').equals(Number(id));
    return retour;
};

const getQuestionById = async (id : number) => {
    const retour = await QuestionModel.findOne().where("question_id").equals(id);
    return retour;
}

const getAvailableQuestions = async (id : number)=>{
    try {
        let questOfId = await QuestionModel.find().where('creator').equals(Number(id));
        let retour  = await QuestionModel.find().where('private').equals(false).where("creator").ne(id);
        retour.forEach((quest) => {
            questOfId.push(quest);
            
        })
        return questOfId;
    } catch (error){
        console.error(error)
    }
}

const getPublicQuestions = async () => {
    try {
        const retour = await QuestionModel.find().where('private').equals(false);
        return retour;
    } catch (error) {
        console.error("erreur lors de la récupération des questions publiques", error);
        return [];
    }
};

const getQuizzOfQuestion = async (id : number) => {
    const retour = await QuestionModel.findOne().where("question_id").equals(id);
    return retour?.quizz;
};

const getCreatorOfQuestion = async (id: String | number) => {
    try {
        let retour = await QuestionModel.findOne().select("creator").where('question_id').equals(id);
        console.log("dans le gette :", retour);
        return retour?.creator;
    } catch (error) {
        console.error("erreur lors de la récupération du créateur", error);
    }
}

export default {update, createQCMQuestion,updateQCMQuestion, 
createFreeQuestion, updateFreeQuestion, createDCCQuestion, 
updateDCCQuestion, createVFQuestion, updateVFQuestion, 
deleteQuestion, handleDeletedQuizz, addQuizzToQuestion,
getQuestionByCreator, getQuestionById, getAvailableQuestions,
getPublicQuestions,getQuizzOfQuestion, getCreatorOfQuestion
};