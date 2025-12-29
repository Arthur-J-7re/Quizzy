import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../Collection/user"
import dotenv from 'dotenv';
import { isUndefined } from "util";
import {hashPassword, comparePassword} from '../utils/encryptPassword';
dotenv.config();


const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const SECRET_KEY : string= process.env.JWT_SECRET || "sferkfjdddfeofjgrjkjdkdpcdfkvfd";



const login = async (data : any) => {
    console.log(data);
    let name = data.username;
    if (regexEmail.test(name)){
        return await loginEmail(data);
    } else {
        return await loginUsername(data);
    }
};

const loginEmail = async (data : any) => {
    let can = await emailExist(data.username);
    if (can){
        let matching = await match(data.username, data.password)
        console.log(matching);
        if (matching){
            let id;
            let username;
            try {
                const userInfo = await getIdByEmail(data.username);
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
                id = await getIdByUsername(data.username);
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
        try {
            const newUser = await User.create({
                username: data.username,
                email: data.email,
                password:await hashPassword(data.password),
            });
            let id = newUser.user_id;
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

const updateUsername = async (id : number, username : string) => {
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
        let expected = await getPasswordByEmail(accountname);
        
        return await comparePassword(password,expected);
    } else {
        let expected = await getPasswordByUsername(accountname);
        return await comparePassword(password,expected);
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

const addEmissionToUser = async (user_id: number, emission_id : number) => {
    console.log(emission_id, user_id);
    try {
        const updatedUser = await User.updateOne(
            { user_id: user_id },
            {$addToSet: {emissions: emission_id}
            });
            console.log(updatedUser);
        return ({success : true});
    } catch (error) {
        console.error("error lors de l'update des émissions");
    }   
};

const addThemeToUser = async (user_id: number, theme_id : number) => {
    console.log(theme_id, user_id);
    try {
        const updatedUser = await User.updateOne(
            { user_id: user_id },
            {$addToSet: {themes: theme_id}
            });
            console.log(updatedUser);
        return ({success : true});
    } catch (error) {
        console.error("error lors de l'update des thèmes");
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

const deleteEmissionFromUser = async (user_id : number, emission_id : number) => {
    try {
        const updatedUser = await User.updateOne(
            {user_id : user_id},
            {$pull: {emissions: emission_id}})
            console.log(updatedUser);
        return { success: true };
    } catch (error) {
        console.error("Erreur dans l'update des émissions après la suppression d'une émission", error);
        return { success: false };
    }
};

const deleteThemeFromUser = async (user_id : number, theme_id : number) => {
    try {
        const updatedUser = await User.updateOne(   
            {user_id : user_id},
            {$pull: {themes: theme_id}})
            console.log(updatedUser);
        return { success: true };
    } catch (error) {
        console.error("Erreur dans l'update des thèmes après la suppression d'un thème", error);
        return { success: false };
    }
};

const getIdByEmail = async (mail : string) => {
    try {
        const retour = await User.findOne().where("email").equals(mail);
        if (retour){
            return {id : retour.user_id, username : retour.username};
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

const getPasswordByEmail = async (mail: string): Promise<string> => {
    try {
        const user = await User.findOne().select('password').where('email').equals(mail);
        if (user && user.password) {return user.password} else { return "";};
    } catch(error){
        console.error(error);
        return "";
    }
};

const getPasswordByUsername = async (username : string): Promise<string> => {
    try {
        const user = await User.findOne().select('password').where('username').equals(username);
        if (user && user.password) {return user.password} else { return "";};
    } catch(error){
        console.error(error);
        return "";
    }

};

export default {login, register, updateUsername, match,
usernameExist, emailExist, addQuestionToUser, addQuizzToUser,
addEmissionToUser, addThemeToUser, deleteQuestionFromUser, deleteQuizzFromUser,
deleteEmissionFromUser, deleteThemeFromUser, getIdByEmail, 
getIdByUsername, getPasswordByEmail, getPasswordByUsername};