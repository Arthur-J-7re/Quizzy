import Quizz from '../Collection/quizz';
import User from "../Collection/user";
import Emission from "../Collection/emission";
import Quest from '../Collection/questions';

const { QuestionModel, QCMModel, FreeModel, DCCModel } = Quest;

const getQuestionByOwner =async (id : number) => {
    const retour = await QuestionModel.find().where('author').equals(Number(id));
    //console.log(retour);
    return retour;
};

const getQuestionsOfQuizz = async (id : number) => {
    const retour = await Quizz.findOne().where("quizz_id").equals(id);
    return retour?.questions;
};

const getQuizzOfQuestion = async (id : number) => {
    const retour = await QuestionModel.findOne().where("question_id").equals(id);
    return retour?.quizz;
};

const getQuizzByOwner = async (id : number) => {
    const retour = await Quizz.find().where("creator").equals(id);
    return retour;
};

/*const getQuizzByTags = async (tags) => {
    const retour;
    for tag in tags
}*/

const getIdByEmail = async (mail : string) => {
    try {
        const retour = await User.findOne().select("user_id").where("email").equals(mail);
        if (retour){
            return retour.user_id;
        }
    } catch (error) {
        console.error(error);
    }
};

const getIdByUsername = async (username : string) => {
    try {
        const retour = await User.findOne().select("user_id").where("username").equals(username);
        if (retour){
            return retour.user_id;
        }
    } catch (error) {
        console.error(error);
    }
};

const getPasswordByEmail = async (mail: string) => {
    try {
        const retour = await User.findOne().select('password').where('email').equals(mail);
        if (retour) {return retour.password};
    } catch(error){
        console.error(error);
    }
};

const getPasswordByUsername = async (username : string) => {
    try {
        const retour = await User.findOne().select('password').where('username').equals(username);
        if (retour) {return retour.password};
    } catch(error){
        console.error(error);
    }

};

const getIdByQuestionId = async (id : number)=>{
    try {
        const retour = await QuestionModel.findOne().select('id').where('question_id').equals(id);
        return retour?.id;
    } catch (error){
        console.error(error)
    }
};

const getQuestionAvailable = async (id : number)=>{
    try {
        let questOfId = await QuestionModel.find().where('author').equals(Number(id));
        let retour  = await QuestionModel.find().where('private').equals(false).where("author").ne(id);
        retour.forEach((quest) => {
            questOfId.push(quest);
            
        })
        return questOfId;
    } catch (error){
        console.error(error)
    }
}

const getOwnerOfQuestion = async (id: String | number) => {
    try {
        let retour = await QuestionModel.findOne().select("author").where('question_id').equals(id);
        console.log("dans le gette :", retour);
        return retour?.author;
    } catch (error) {
        console.error("erreur lors de la récupération de l'owner", error);
    }
}

const getOwnerOfQuizz = async (id: String | number) => {
    try {
        let retour = await Quizz.findOne().where('quizz_id').equals(id);
        return retour?.creator;
    } catch (error) {
        console.error("erreur lors de la récupération de l'owner", error);
    }
}

export default {getQuestionsOfQuizz,getQuizzOfQuestion, getQuestionByOwner, getQuizzByOwner, getIdByEmail, getIdByUsername, getPasswordByEmail, getPasswordByUsername, getIdByQuestionId, getQuestionAvailable, getOwnerOfQuestion, getOwnerOfQuizz}