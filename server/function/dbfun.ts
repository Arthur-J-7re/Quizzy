import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Quest from '../Collection/questions';
import { Socket } from 'socket.io';

const {Mode, QuestionModel, QCMModel, FreeModel, DCCModel } = Quest;

const createQuestion = async (socket : Socket, questionObj : any) =>{
    try {
        let newQuest;
        switch (questionObj.typeOfQuestion) {
            case "QCM":
                newQuest = await QCMModel.create({
                    author: socket.data.id,
                    tags: questionObj.tags,
                    title: questionObj.title,
                    mode: Mode.QCM,
                    choices: questionObj.choices,
                    answer: questionObj.answer,
                });
                break;
            case "Free":
                newQuest = await FreeModel.create({
                    author: socket.data.id,
                    tags: questionObj.tags,
                    title: questionObj.title,
                    mode: Mode.FREE,
                    answers: questionObj.answers,
                });
                break;
            case "DCC":
                newQuest = await DCCModel.create({
                    author: socket.data.id,
                    tags: questionObj.tags,
                    title: questionObj.title,
                    mode: Mode.DCC,
                    carre: questionObj.carre,
                    duo: questionObj.duo,
                    cash: questionObj.cash,
                });
                break;
            default:
                throw new Error("Type de question invalide");
        }
        await newQuest.save();

    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
          } else {
            console.error("Une erreur inconnue est survenue", error);
          }
    }

};






export default {createQuestion};