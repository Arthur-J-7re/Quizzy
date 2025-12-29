import {QuizzModel, ListQuizzModel, GridQuizzModel, PickAndBanQuizzModel, BigBucketQuizzModel} from "../Collection/quizz";
import { QuizzMode } from "../Interface/Quizz";
import questionManager from "./questionManager";
import { Socket } from 'socket.io';

const createQuizz = async ( data : any) => {
    console.log("dans CreateQuizz")
    console.log(data); 
    switch (data.mode){
        case "LIST":
            return createListQuizz(data);
            break;
        case "GRID":
            return createGridQuizz(data);
            break;
        case "PICKANDBAN":
            return createPickAndBanQuizz(data);
            break;
        case "BIGBUCKET":
            return createBigBucketQuizz(data);
            break;
    }
};

const createListQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await ListQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.LIST,
            tags: data.tags,
            title: data.title,
            private: data.private,
            questions : data.questions
        });
        console.log("après la création List");
        await questionManager.addQuizzToQuestion(data.questions, newQuizz.quizz_id);
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updateListQuizzObj = async (quizzObj : any) =>{
    try {
        console.log("les infos de l'update", quizzObj);
        console.log("l'id", quizzObj.quizz_id);
        const quizzUPdated = await ListQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            questions : quizzObj.questions
        }});
        console.log(quizzUPdated);
        await questionManager.addQuizzToQuestion(quizzObj.questionList, quizzObj.quizz_id);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz liste", error);
        return({success : false});
    }
}

const createGridQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await GridQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.GRID,
            tags: data.tags,
            title: data.title,
            private: data.private,
            themes : data.themes,
            themeSize : data.themeSize,
            gridSize : data.gridSize
        });
        console.log("après la création Grid");
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updateGridQuizzObj = async (quizzObj : any) =>{
    try {
        console.log("les infos de l'update", quizzObj);
        console.log("l'id", quizzObj.quizz_id);
        const quizzUPdated = await GridQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            themes : quizzObj.themes,
            themeSize : quizzObj.themeSize,
            gridSize : quizzObj.gridSize
        }});
        console.log(quizzUPdated);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz grille", error);
        return({success : false});
    }
}

const createPickAndBanQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await PickAndBanQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.PICKANDBAN,
            tags: data.tags,
            title: data.title,
            private: data.private,
            themes : data.themes,
            size : data.size
        });
        console.log("après la création PickAndBan");
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updatePickAndBanQuizzObj = async (quizzObj : any) =>{
    try {
        console.log("les infos de l'update", quizzObj);
        console.log("l'id", quizzObj.quizz_id);
        const quizzUPdated = await PickAndBanQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            themes : quizzObj.themes,
            size : quizzObj.size
        }});
        console.log(quizzUPdated);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz pick and ban", error);
        return({success : false});
    }
}

const createBigBucketQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await BigBucketQuizzModel.create({
            creator: Number(data.creator),
            mode: QuizzMode.BIGBUCKET,
            tags: data.tags,
            title: data.title,
            private: data.private,
            themes : data.themes,
            width : data.width,
            height : data.height
        });
        console.log("après la création BigBucket");
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
}

const updateBigBucketQuizzObj = async (quizzObj : any) =>{
    try {
        console.log("les infos de l'update", quizzObj);
        console.log("l'id", quizzObj.quizz_id);
        const quizzUPdated = await BigBucketQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            themes : quizzObj.themes,
            width : quizzObj.width,
            height : quizzObj.height
        }});
        console.log(quizzUPdated);
        return({success : true});
    } catch (error) {
        console.error("Erreur lors de l'update du quizz big bucket", error);
        return({success : false});
    }
}

const updateQuizz = async (information : any) =>{
    console.log("on modifie le quizz");
    try {
        let quizzObj = information;
        switch (information.mode){
            case "LIST":
                return updateListQuizzObj(quizzObj);
                break;
            case "GRID":
                return updateGridQuizzObj(quizzObj);
                break;
            case "PICKANDBAN":
                return updatePickAndBanQuizzObj(quizzObj);
                break;
            case "BIGBUCKET":
                return updateBigBucketQuizzObj(quizzObj);
                break;
            default:
                return ({success:false})
        }
    } catch (error){
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return({success : false});
    }
};


const deleteQuizz = async (quizzId : string) => {
    try {
        const questionsToUpdate =await getQuestionsOfQuizz(Number(quizzId));
        await QuizzModel.deleteOne({quizz_id : quizzId});
        if (questionsToUpdate){
            await questionManager.handleDeletedQuizz(questionsToUpdate, Number(quizzId));
        }
        return ({success : true});
    } catch (error) {
        console.error("error de la suprression du quizz : " + quizzId, error);
        return ({success : false});
    }
};

const handleDeletedQuestion = async (quizzIds: number[], question_id: number) => {
    try {
        await Promise.all(quizzIds.map(async (quizz_id: number) => {
            await QuizzModel.updateOne(
                { quizz_id: quizz_id },
                { $pull: { questions: question_id } }
            );
        }));
        return { success: true };
    } catch (error) {
        console.error("Erreur dans l'update des questions après la suppression d'un quizz", error);
        return { success: false };
    }
};

const getQuestionsOfQuizz = async (id : number) => {
    const retour = await  ListQuizzModel.findOne().where("quizz_id").equals(id);
    return retour?.questions;
};
const getQuizzByCreator = async (id : number) => {
    const retour = await  QuizzModel.find().where("creator").equals(id);
    return retour;
};

const getAvailableQuizz = async (id ?: number ) => {
    try {
        let retour;
        if (id) {
            let quizzOfId = await  QuizzModel.find().where('creator').equals(Number(id));
            retour  = await  QuizzModel.find().where('private').equals(false).where("creator").ne(id);

            retour.forEach((quest) => {
                quizzOfId.push(quest);
                
            })
            return quizzOfId;
        } else {
            retour = await  QuizzModel.find().where('private').equals(false)
        }
        return retour;
    } catch(e){
        console.error("erreur lors du fetch des questions available : ", e)
        return([])
    }
};

const getPublicQuizz = async () => {
    try {
        const retour = await  QuizzModel.find().where('private').equals(false);
        return retour;
    }catch(e){
        console.error("erreur lors du fetch des questions public : ", e)
        return([])
    }
};

const getCreatorOfQuizz = async (id: String | number) => {
    try {
        let retour = await  QuizzModel.findOne().where('quizz_id').equals(id);
        return retour?.creator;
    } catch (error) {
        console.error("erreur lors de la récupération du créateur", error);
    }
}


export default{createQuizz,updateQuizz,deleteQuizz,
handleDeletedQuestion, getQuestionsOfQuizz,getPublicQuizz,
getQuizzByCreator, getAvailableQuizz, getCreatorOfQuizz};