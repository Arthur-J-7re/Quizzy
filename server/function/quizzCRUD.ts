import Quizz from "../Collection/quizz";
import questionCRUD from "./questionCRUD";
import { Socket } from 'socket.io';

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
            questions : data.questionList
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


const deleteQuizz = async (quizzId : string) => {
    try {
        await Quizz.deleteOne({quizz_id : quizzId});
    } catch (error) {
        console.error("error de la suprression du quizz : " + quizzId, error);
    }
}



export default{createQuizz,deleteQuizz};