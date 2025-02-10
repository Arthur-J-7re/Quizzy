import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Quest from '../Collection/questions';

const { QuestionModel, QCMModel, FreeModel, DCCModel } = Quest;


const getQuestsionByOwner =async (id : number) => {
    const retour = await QuestionModel.find().where('owner').equals(id);
    return retour;
};

const getQuesionsOfQuizz = async (id : number) => {
    const retour = await Quizz.findOne().where("id").equals(id);
    return retour;
};

const getQuizzByOwner = async (id : number) => {
    const retour = await Quizz.findOne().where("owner").equals(id);
}