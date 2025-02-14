import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Quest from '../Collection/questions';
import { Socket } from 'socket.io';

const {Mode, QuestionModel, QCMModel, FreeModel, DCCModel } = Quest;

const createQCMQuestion = async (socket : Socket, questionObj : any) =>{
    console.log("tentative de création de question");
    console.log(questionObj);
    try {
        let newQuest;
        
        newQuest = await QCMModel.create({
            author: socket.data.id,
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.QCM,
            choices: questionObj.choices,
            answer: questionObj.answer,
        });

        console.log(newQuest);
                
        //await newQuest.save();

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
            author: socket.data.id,
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.FREE,
            answers: questionObj.answers,
        });
        
    } catch (error) {
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
                
        newQuest = await DCCModel.create({
            author: socket.data.id,
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.DCC,
            carre: questionObj.carre,
            duo: questionObj.duo,
            cash: questionObj.cash,
        });
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }

};

const createVFQuestion = async(socket : Socket, questionObj : any) => {
    try {
        let newQuest;
                
        newQuest = await DCCModel.create({
            author: socket.data.id,
            tags: questionObj.tags,
            title: questionObj.title,
            private: questionObj.private,
            mode: Mode.VF,
            truth: questionObj.truth,
        });
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
    }

};





export default {createQCMQuestion, createFreeQuestion, createDCCQuestion, createVFQuestion};