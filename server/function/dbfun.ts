import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Quest from '../Collection/questions';

const { QuestionModel, QCMModel, FreeModel, DCCModel } = Quest;

const createQuestion = async (socket, questionObj) =>{
    try {
        const newQuest = await QCMModel.create({
            author : socket.data.id,
            tags : questionObj.tags,
        });
        switch (questionObj.typeOfQuestion) {
            case "QCM" : 
                newQuest.mode = "QCM";
                
                break;
            case "Free" : 
                

        } 
        await newQuest.save();

    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
          } else {
            console.error("Une erreur inconnue est survenue", error);
          }
    }

}