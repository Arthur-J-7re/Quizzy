import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Quest from '../Collection/questions';
import getter from './getter';
import { Socket } from 'socket.io';

const {Mode, QuestionModel, QCMModel, FreeModel, DCCModel, VFModel } = Quest;
const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const createQCMQuestion = async (socket : Socket, questionObj : any) =>{
    
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
        socket.emit("questionCreated");
                
        //await newQuest.save();

    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const modifyQCMQuestion = async (socket: Socket, information : any) =>{
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
        socket.emit("modified");
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const createFreeQuestion = async(socket : Socket, questionObj : any) => {
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
        socket.emit("questionCreated");
        
    } catch (error) {
        if (error instanceof Error) {
        console.error(error.message);
        } else {
        console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const modifyFreeQuestion = async (socket: Socket, information : any) =>{
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
        socket.emit("modified");
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const createDCCQuestion = async(socket : Socket, questionObj : any) => {
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
        socket.emit("questionCreated");
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }

};

const modifyDCCQuestion = async (socket: Socket, information : any) =>{
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
        socket.emit("modified");
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};



const createVFQuestion = async(socket : Socket, questionObj : any) => {
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
        socket.emit("questionCreated");
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }

};

const modifyVFQuestion = async (socket: Socket, information : any) =>{
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
        socket.emit("modified");
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const createQuizz = async (socket : Socket, data : any) => {
    console.log("dans CreateQuizz")
    console.log(data);
    try {
        let newQuizz;
                
        newQuizz = await Quizz.create({
            creator: Number(data.user_id),
            tags: data.tags,
            title: data.title,
            private: data.private,
            questions : data.questionLists
        });
        console.log("après la création");
        socket.emit("questionCreated");
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }
};

const match = async (accountname : string, password : string) => {
    if (regexEmail.test(accountname)){
        let expected = await getter.getPasswordByEmail(accountname);
        
        return (expected === password);
    } else {
        let expected = await getter.getPasswordByUsername(accountname);
        return (expected === password);
    }
};

const usernameExist = async (name : string) => {
    try {
        const retour = await User.findOne().where("username").equals(name);
        if (retour) {
            return true ;
        } else {
            return false;
        }
    } catch (error) {
        console.error(error)
    }
};

const emailExist = async (mail : string) => {
    try {
        const retour = await User.findOne().where("mail").equals(mail);
        if (retour) {
            return true ;
        } else {
            return false;
        }
    } catch (error) {
        console.error(error)
    }
};





export default {createQCMQuestion,modifyQCMQuestion, createFreeQuestion, modifyFreeQuestion, createDCCQuestion, modifyDCCQuestion, createVFQuestion, modifyVFQuestion, createQuizz, match, usernameExist, emailExist};