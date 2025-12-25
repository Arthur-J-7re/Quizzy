import {QuizzModel, ListQuizzModel, GridQuizzModel, PickAndBanQuizzModel, BigBucketQuizzModel} from "../Collection/quizz";
import { QuizzMode } from "../Interface/Quizz";
import getter from "../function/getter";
import questionCRUD from "./questionCRUD";
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
            creator: Number(data.user_id),
            mode: QuizzMode.LIST,
            tags: data.tags,
            title: data.title,
            private: data.private,
            questions : data.questions
        });
        console.log("après la création List");
        await questionCRUD.addQuizzToQuestion(data.questionList, newQuizz.quizz_id);
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
    console.log("les infos de l'update", quizzObj);
    console.log("l'id", quizzObj.quizz_id);
    const quizzUPdated = await ListQuizzModel.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
        tags: quizzObj.tags,
        title: quizzObj.title,
        private: quizzObj.private,
        questions : quizzObj.questions
    }});
    console.log(quizzUPdated);
    await questionCRUD.addQuizzToQuestion(quizzObj.questionList, quizzObj.quizz_id);
    return({success : true});
}

const createGridQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await GridQuizzModel.create({
            creator: Number(data.user_id),
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
}

const createPickAndBanQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await PickAndBanQuizzModel.create({
            creator: Number(data.user_id),
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
}

const createBigBucketQuizz = async (data : any) =>{
    try {
        let newQuizz;
                
        newQuizz = await BigBucketQuizzModel.create({
            creator: Number(data.user_id),
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
        const questionsToUpdate =await getter.getQuestionsOfQuizz(Number(quizzId));
        await QuizzModel.deleteOne({quizz_id : quizzId});
        if (questionsToUpdate){
            await questionCRUD.handleDeletedQuizz(questionsToUpdate, Number(quizzId));
        }
        return ({success : true});
    } catch (error) {
        console.error("error de la suprression du quizz : " + quizzId, error);
        return ({success : false});
    }
};

const handleDeletedQuestion = async (quizzIds: number[], questionId: number) => {
    try {
        await Promise.all(quizzIds.map(async (quizzId: number) => {
            await QuizzModel.updateOne(
                { quizz_id: quizzId },
                { $pull: { questions: questionId } }
            );
        }));
        return { success: true };
    } catch (error) {
        console.error("Erreur dans l'update des questions après la suppression d'un quizz", error);
        return { success: false };
    }
};



export default{createQuizz,updateQuizz,deleteQuizz, handleDeletedQuestion};