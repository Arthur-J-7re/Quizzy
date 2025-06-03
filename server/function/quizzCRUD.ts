import Quizz from "../Collection/quizz";
import getter from "../function/getter";
import questionCRUD from "./questionCRUD";
import { Socket } from 'socket.io';

const createQuizz = async ( data : any) => {
    console.log("dans CreateQuizz")
    console.log(data);
    try {
        let newQuizz;
                
        newQuizz = await Quizz.create({
            creator: Number(data.user_id),
            tags: data.tags,
            title: data.title,
            private: data.private,
            questions : data.questionList
        });
        console.log("après la création");
        return ({success : true, quizz_id : newQuizz.quizz_id, creator:newQuizz.creator})
        
            
    } catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        } else {
            console.error("Une erreur inconnue est survenue", error);
        }
        return ({success : false});
    }
};

const updateQuizz = async (information : any) =>{
    console.log("on modifie le quizz");
    try {
        let quizzObj = information;
        console.log("les infos de l'update", quizzObj);

        console.log("l'id", quizzObj.quizz_id);
        const quizzUPdated = await Quizz.updateOne({ quizz_id: quizzObj.quizz_id},{$set : {
            tags: quizzObj.tags,
            title: quizzObj.title,
            private: quizzObj.private,
            questions : quizzObj.questionList
        }});
        console.log(quizzUPdated);
        await questionCRUD.addQuizzToQuestion(quizzObj.questionList, quizzObj.quizz_id);
        return({success : true});
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
        await Quizz.deleteOne({quizz_id : quizzId});
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
            await Quizz.updateOne(
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