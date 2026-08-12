import User from "../Collection/user"
import {hashPassword, comparePassword} from '../utils/encryptPassword';
import { signUserToken } from '../utils/jwt';
import type { LoginInput, RegisterInput } from "../validation/userSchemas";

const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Message unique volontaire : ne pas révéler si c'est l'identifiant ou le mot
// de passe qui est faux (évite l'énumération de comptes).
const BAD_CREDENTIALS = "Mauvais mot de passe ou identifiant.";

export interface AuthResult {
    success: boolean;
    message?: string;
    data?: { id: number; token: string; username: string };
}

const login = async (data : LoginInput) : Promise<AuthResult> => {
    if (regexEmail.test(data.username)){
        return await loginEmail(data);
    }
    return await loginUsername(data);
};

const loginEmail = async (data : LoginInput) : Promise<AuthResult> => {
    if (!(await emailExist(data.username))){
        return {success : false, message : BAD_CREDENTIALS};
    }
    if (!(await match(data.username, data.password))){
        return {success : false, message : BAD_CREDENTIALS};
    }
    const userInfo = await getIdByEmail(data.username);
    if (!userInfo?.id){
        return {success : false, message : BAD_CREDENTIALS};
    }
    // On renvoie bien le username ici : sans lui le client stockait un
    // Username undefined pour toute connexion par e-mail.
    return {
        success : true,
        data : {id : userInfo.id, token : signUserToken(userInfo.id), username : userInfo.username ?? ""}
    };
};

const loginUsername = async (data : LoginInput) : Promise<AuthResult> => {
    if (!(await usernameExist(data.username))){
        return {success : false, message : BAD_CREDENTIALS};
    }
    if (!(await match(data.username, data.password))){
        return {success : false, message : BAD_CREDENTIALS};
    }
    const id = await getIdByUsername(data.username);
    if (!id){
        return {success : false, message : BAD_CREDENTIALS};
    }
    return {
        success : true,
        data : {id : id, token : signUserToken(id), username : data.username}
    };
};

const register = async (data : RegisterInput) : Promise<AuthResult> => {
    if (await emailExist(data.email)){
        return {success : false, message : "Cette adresse e-mail est déjà utilisée."};
    }
    if (await usernameExist(data.username)){
        return {success : false, message : "Ce nom d'utilisateur est déjà pris."};
    }
    try {
        const newUser = await User.create({
            username: data.username,
            email: data.email,
            password: await hashPassword(data.password),
        });
        // user_id est posé par le plugin mongoose-sequence, donc typé optionnel.
        const id = newUser.user_id;
        if (id === null || id === undefined){
            return {success : false, message : "La création du compte a échoué."};
        }
        return {success : true, data : {id : id, token : signUserToken(id), username : data.username}};
    } catch(error) {
        console.error("Erreur lors de la création du compte", error);
        // L'index unique de Mongo peut encore rejeter en cas de course entre
        // deux inscriptions simultanées sur la même adresse.
        if (error && typeof error === "object" && (error as {code?: number}).code === 11000){
            return {success : false, message : "Cette adresse e-mail est déjà utilisée."};
        }
        return {success : false, message : "La création du compte a échoué."};
    }
};

const updateUsername = async (id : number, username : string) => {
    try {
        await User.updateOne({ user_id: id },{$set : { username : username }});
        return ({success : true, username : username});
    } catch (error) {
        console.error("Erreur lors de l'update du username", error);
        return ({success : false});
    }
};

const match = async (accountname : string, password : string) => {
    const expected = regexEmail.test(accountname)
        ? await getPasswordByEmail(accountname)
        : await getPasswordByUsername(accountname);
    // bcrypt.compare sur une chaîne vide renvoie false : pas de court-circuit
    // qui permettrait de distinguer "compte inexistant" de "mauvais mot de passe".
    return await comparePassword(password, expected);
};

const usernameExist = async (name : string) : Promise<boolean> => {
    try {
        return (await User.findOne().where("username").equals(name)) !== null;
    } catch (error) {
        console.error("Erreur lors de la recherche par username", error);
        return false;
    }
};

const emailExist = async (mail : string) : Promise<boolean> => {
    try {
        // Le champ s'appelle "email" dans le schéma : chercher sur "mail"
        // renvoyait toujours null, donc aucun doublon n'était jamais détecté.
        return (await User.findOne().where("email").equals(mail)) !== null;
    } catch (error) {
        console.error("Erreur lors de la recherche par email", error);
        return false;
    }
};

// Les 4 collections d'un utilisateur, toutes gérées de la même façon.
type UserList = "questions" | "quizz" | "emissions" | "themes";

const addToUserList = async (list : UserList, user_id : number, item_id : number) => {
    try {
        await User.updateOne({ user_id }, { $addToSet: { [list]: item_id } });
        return { success : true };
    } catch (error) {
        console.error(`Erreur lors de l'ajout dans ${list} de l'utilisateur ${user_id}`, error);
        return { success : false };
    }
};

const removeFromUserList = async (list : UserList, user_id : number, item_id : number) => {
    try {
        await User.updateOne({ user_id }, { $pull: { [list]: item_id } });
        return { success : true };
    } catch (error) {
        console.error(`Erreur lors du retrait dans ${list} de l'utilisateur ${user_id}`, error);
        return { success : false };
    }
};

const addQuizzToUser = (user_id : number, quizz_id : number) => addToUserList("quizz", user_id, quizz_id);
const addQuestionToUser = (user_id : number, question_id : number) => addToUserList("questions", user_id, question_id);
const addEmissionToUser = (user_id : number, emission_id : number) => addToUserList("emissions", user_id, emission_id);
const addThemeToUser = (user_id : number, theme_id : number) => addToUserList("themes", user_id, theme_id);

const deleteQuizzFromUser = (user_id : number, quizz_id : number) => removeFromUserList("quizz", user_id, quizz_id);
const deleteQuestionFromUser = (user_id : number, question_id : number) => removeFromUserList("questions", user_id, question_id);
const deleteEmissionFromUser = (user_id : number, emission_id : number) => removeFromUserList("emissions", user_id, emission_id);
const deleteThemeFromUser = (user_id : number, theme_id : number) => removeFromUserList("themes", user_id, theme_id);

const getIdByEmail = async (mail : string) => {
    try {
        const retour = await User.findOne().where("email").equals(mail);
        if (retour){
            return {id : retour.user_id, username : retour.username};
        }
        return undefined;
    } catch (error) {
        console.error("erreur lors de la récupération de l'utilisateur par e-mail", error);
        return undefined;
    }
};

const getIdByUsername = async (username : string) => {
    try {
        const retour = await User.findOne().select("user_id").where("username").equals(username);
        if (retour){
            return retour.user_id;
        }
        return undefined;
    } catch (error) {
        console.error("erreur lors de la récupération de l'utilisateur par pseudo", error);
        return undefined;
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