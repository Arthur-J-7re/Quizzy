import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import getter from "./getter"
import User from "../Collection/user"
import dotenv from 'dotenv';
import { isUndefined } from "util";
dotenv.config();


const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const SECRET_KEY : string= process.env.JWT_SECRET || "sferkfjdddfeofjgrjkjdkdpcdfkvfd";



const login = async (data : any) => {
    console.log(data);
    let name = data.username;
    if (regexEmail.test(name)){
        return await loginEMail(data);
    } else {
        return await loginUsername(data);
    }
};

const loginEMail = async (data : any) => {
    let can = await emailExist(data.username);
    if (can){
        let matching = await match(data.username, data.password)
        console.log(matching);
        if (matching){
            let id;
            let username;
            try {
                const userInfo = await getter.getIdByEmail(data.username);
                id = userInfo?.id; 
                username = userInfo?.username;
            } catch (error) {
                console.error(error);
            }
            const token = jwt.sign(
                { id: id },
                SECRET_KEY,
                { expiresIn: '2190h' }
            );
            return {success : true, data :  {id: id, token: token}}
        }
        else {
            return {success : false , message : "Mauvais mot de passe ou identifiant." }
        }
    } else {
        return {success : false , message : "Mauvais mot de passe ou identifiant." }
    }
};

const loginUsername = async ( data : any) => {
    let cant = await usernameExist(data.username);
    if (cant){
        if (await match(data.username, data.password)){
            let id;
            try {
                id = await getter.getIdByUsername(data.username);
            } catch (error) {
                console.error(error);
            }
            const token = jwt.sign(
                { id: id },
                SECRET_KEY,
                { expiresIn: '2190h' }
            );
            
            return{success : true,data : {id: id, token:token, username : data.username}};
        }
        else {
            return {success : false , message : "Mauvais mot de passe ou identifiant." }
        }
    } else {
        return {success : false , message : "Mauvais mot de passe ou identifiant." }
    }
};

const register = async (data : any) => {

    let cantEMail = await emailExist(data.email);
    let cantUserName = await usernameExist(data.username);
    console.log("entrer dans le register");


    if (cantEMail){
        return {success : false , message : "Cette adresse e-mail est déjà utilisée." }
    } else if (cantUserName){
        return {success : false , message :  "Ce Username est déjà pris." }
    } else {
        try {const newUser = await User.create({
                username: data.username,
                email: data.email,
                password: data.password,
            });
            let id;
            try {
                id = await getter.getIdByUsername(data.username);
            } catch (error) {
                console.error(error);
            }
            const token = jwt.sign(
                { id: id },
                SECRET_KEY,
                { expiresIn: '2190h' }
            );
            
            console.log("après le create user");
            return{success : true, data: {id: id, token:token, username : data.username}};


        } catch(error) {
            console.error(error);
            return {success : false , message :  "Format d'adresse e-amil non valide."}
        }
    }
};

const updateUsername = async (id : any, username : any) => {
    console.log(id, username);
    try {
        await User.updateOne({ user_id: id },{$set : {
            username : username
        }});
        return ({username : username});
    } catch (error) {
        console.error("error lors de l'update du username");
    }
};

const match = async (accountname : string, password : string) => {
    if (regexEmail.test(accountname)){
        let expected = await getter.getPasswordByEmail(accountname);
        
        return (expected === password);
    } else {
        let expected = await getter.getPasswordByUsername(accountname);
        return (expected === password);
    }
};

const usernameExist = async (name : string) => {
    try {
        const retour = await User.findOne().where("username").equals(name);
        if (retour) {
            return true ;
        } else {
            return false;
        }
    } catch (error) {
        console.error(error)
    }
};

const emailExist = async (mail : string) => {
    try {
        const retour = await User.findOne().where("mail").equals(mail);
        if (retour) {
            return true ;
        } else {
            return false;
        }
    } catch (error) {
        console.error(error)
    }
};

const addQuizzToUser = async (user_id: number, quizz_id : number) => {
    console.log(quizz_id, user_id);
    try {
        const updatedUser = await User.updateOne(
            { user_id: user_id },
            {$addToSet: {quizz: quizz_id}
            });
            console.log(updatedUser);
        return ({success : true});
    } catch (error) {
        console.error("error lors de l'update du username");
    }
};

const addQuestionToUser = async (user_id: number, question_id : number) => {
    console.log(question_id, user_id);
    try {
        console.log("ça supprime un quizz au user");
        const updatedUser = await User.updateOne(
            { user_id: user_id },
            {$addToSet: {questions: question_id}
            });
        return ({success : true});
    } catch (error) {
        console.error("error lors de l'update du username");
    }
};

const deleteQuestionFromUser = async (user_id : number, question_id : number) => {
    try {
        console.log("ça supprime une question au user");
        const updatedUser =await User.updateOne(
            {user_id : user_id},
            {$pull: {questions: question_id}})
        console.log(updatedUser);
        return { success: true };
    } catch (error) {
        console.error("Erreur dans l'update des questions après la suppression d'un quizz", error);
        return { success: false };
    }
};

const deleteQuizzFromUser = async (user_id : number, quizz_id : number) => {
    try {
        const updatedUser = await User.updateOne(
            {user_id : user_id},
            {$pull: {quizz: quizz_id}})
            console.log(updatedUser);
        return { success: true };
    } catch (error) {
        console.error("Erreur dans l'update des questions après la suppression d'un quizz", error);
        return { success: false };
    }
};





export default {login, register, updateUsername, match, usernameExist, emailExist, addQuestionToUser, addQuizzToUser, deleteQuestionFromUser, deleteQuizzFromUser}