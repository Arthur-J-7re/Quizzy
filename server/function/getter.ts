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

const getQuesionsOfQuizz = async (id : number) => {
    const retour = await Quizz.findOne().where("id").equals(id);
    return retour;
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

const getIdByQuestionId = async (id : Number)=>{
    try {
        const retour = await QuestionModel.findOne().select('id').where('question_id').equals(id);
        return retour?.id;
    } catch (error){
        console.error(error)
    }
};

const getQuestionAvailable = async (id : Number)=>{
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

export default {getQuesionsOfQuizz, getQuestionByOwner, getQuizzByOwner, getIdByEmail, getIdByUsername, getPasswordByEmail, getPasswordByUsername, getIdByQuestionId, getQuestionAvailable}