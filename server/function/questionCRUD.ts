import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Question from '../Collection/questions';
import getter from './getter';
import { Socket } from 'socket.io';

const {Mode, QuestionModel, QCMModel, FreeModel, DCCModel, VFModel } = Question;
const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const createQCMQuestion = async ( questionObj : any) =>{
    
    try {
        let newQuest;
        
        newQuest = await QCMModel.create({
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.QCM,
            choices: questionObj.choices,
            answer: questionObj.answer,
        });
        return(true);
                
        //await newQuest.save();

    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const modifyQCMQuestion = async ( information : any) =>{
    console.log("on modifie le qcm");
    try {
        let questionObj = information.data;
        let id = await getter.getIdByQuestionId(information.question_id);
        let newQuest;
        newQuest = await QCMModel.updateOne({ _id: id},{$set : {
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.QCM,
            choices: questionObj.choices,
            answer: questionObj.answer,
        }});
        return(true);
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const createFreeQuestion = async( questionObj : any) => {
    try {
        let newQuest;
            
        newQuest = await FreeModel.create({
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.FREE,
            answers: questionObj.answers,
        });
        return(true);
        
    } catch (error) {
        if (error instanceof Error) {
        console.error(error.message);
        } else {
        console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const modifyFreeQuestion = async ( information : any) =>{
    try {
        let questionObj = information.data;
        let id = await getter.getIdByQuestionId(information.question_id);
        let newQuest;
        newQuest = await FreeModel.updateOne({ _id: id },{$set : {
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.FREE,
            answers: questionObj.answers,
        }});
        return(true);
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const createDCCQuestion = async( questionObj : any) => {
    try {
        let newQuest;
        console.log(questionObj);
                
        newQuest = await DCCModel.create({
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.DCC,
            carre: questionObj.carre,
            duo: questionObj.duo,
            answer: questionObj.answer,
            cash: questionObj.cash,
        });
        return(true);
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }

};

const modifyDCCQuestion = async ( information : any) =>{
    try {
        let questionObj = information.data;
        let id = await getter.getIdByQuestionId(information.question_id);
        let newQuest;
        newQuest = await DCCModel.updateOne({ _id: id },{$set : {
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.DCC,
            carre: questionObj.carre,
            duo: questionObj.duo,
            answer: questionObj.answer,
            cash: questionObj.cash,
        }});
        return(true);
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};



const createVFQuestion = async( questionObj : any) => {
    console.log("tentative de création de question");
    console.log(questionObj);
    try {
        let newQuest;
                
        newQuest = await VFModel.create({
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.VF,
            truth: questionObj.truth,
        });
        return(true);
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }

};

const modifyVFQuestion = async ( information : any) =>{
    try {
        let questionObj = information.data;
        let id = await getter.getIdByQuestionId(information.question_id);
        let newQuest;
        newQuest = await VFModel.updateOne({ _id: id },{$set : {
            author: Number(questionObj.user_id),
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.VF,
            truth: questionObj.truth,
        }});
        return(true);
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};


const deleteQuestion = async (question_id: String) => {
    try {
        await QuestionModel.deleteOne({question_id : question_id});
    } catch (error) {
        console.error("error de la suprression du quizz : " + question_id, error);
    }
}







export default {createQCMQuestion,modifyQCMQuestion, createFreeQuestion, modifyFreeQuestion, createDCCQuestion, modifyDCCQuestion, createVFQuestion, modifyVFQuestion, deleteQuestion};