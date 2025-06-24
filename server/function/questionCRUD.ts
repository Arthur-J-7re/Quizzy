import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Question from '../Collection/questions';
import getter from './getter';
import { Socket } from 'socket.io';
import quizzCRUD from './quizzCRUD';

const {Mode, QuestionModel, QCMModel, FreeModel, DCCModel, VFModel } = Question;
const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const createQCMQuestion = async ( questionObj : any) =>{
    console.log(questionObj);
    try {
        const newQuest = await QCMModel.create({
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.QCM,
            choices: questionObj.choices,
            answer: questionObj.answer,
        });
        return({success : true, creator : newQuest.author, question_id : newQuest.question_id});
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
        let id = await getter.getIdByQuestionId(information.question_id);
        await QCMModel.updateOne({ _id: id},{$set : {
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.QCM,
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
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.FREE,
            answers: questionObj.answers,
        });
        return({success : true, creator : newQuest.author, question_id : newQuest.question_id});
        
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
        let id = await getter.getIdByQuestionId(information.question_id);
        await FreeModel.updateOne({ _id: id },{$set : {
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.FREE,
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
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.DCC,
            carre: questionObj.carre,
            duo: questionObj.duo,
            answer: questionObj.answer,
            cash: questionObj.cash,
        });
        return({success : true, creator : newQuest.author, question_id : newQuest.question_id});
        
            
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
        let id = await getter.getIdByQuestionId(information.question_id);
        await DCCModel.updateOne({ _id: id },{$set : {
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.DCC,
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
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.VF,
            truth: questionObj.truth,
        });
        return({success : true, creator : newQuest.author, question_id : newQuest.question_id});  
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false, creator : 0, question_id : 0});
    }

};

const createVFQuestionSocket = async(socket : any, questionObj : any) => {
    console.log("tentative de création de question");
    console.log(questionObj);
    try {
        await VFModel.create({
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.VF,
            truth: questionObj.truth,
        });
        socket.emit("questionCreated");
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false});
    }
};

const updateVFQuestion = async ( information : any) =>{
    try {
        let questionObj = information.data;
        let id = await getter.getIdByQuestionId(information.question_id);
        await VFModel.updateOne({ _id: id },{$set : {
            tags: questionObj.tags,
            title: questionObj.title,
            level: questionObj.level,
            private: questionObj.private,
            mode: Mode.VF,
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
        const quizzToUpdate =await getter.getQuizzOfQuestion(Number(question_id));
        await QuestionModel.deleteOne({question_id : question_id});
        if (quizzToUpdate){
            await quizzCRUD.handleDeletedQuestion(quizzToUpdate, Number(question_id));
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







export default {update, createQCMQuestion,updateQCMQuestion, createFreeQuestion, updateFreeQuestion, createDCCQuestion, updateDCCQuestion, createVFQuestion, createVFQuestionSocket, updateVFQuestion, deleteQuestion, handleDeletedQuizz, addQuizzToQuestion};