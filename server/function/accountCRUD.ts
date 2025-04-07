import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import getter from "./getter"
import User from "../Collection/user"
import dotenv from 'dotenv';
import { isUndefined } from "util";
dotenv.config();


const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const SECRET_KEY : string= process.env.JWT_SECRET || "sferkfjdddfeofjgrjkjdkdpcdfkvfd";



const login = async (socket : Socket, data : any) => {
    console.log(data);
    let name = data.username;
    if (regexEmail.test(name)){
        loginEMail(socket, data);
    } else {
        loginUsername(socket, data);
    }
};

const loginEMail = async (socket: Socket, data : any) => {
    let can = await emailExist(data.username);
    if (can){
        let matching = await match(data.username, data.password)
        console.log(matching);
        if (matching){
            let id;
            try {
                id = await getter.getIdByEmail(data.username);
            } catch (error) {
                console.error(error);
            }
            socket.data.id = id;
            const token = jwt.sign(
                { id: socket.data.id, nickname: socket.data.nickname },
                SECRET_KEY,
                { expiresIn: '1h' }
            );
            socket.emit("success", {id: id, token: token});
        }
        else {
            socket.emit("alert", "Mauvais mot de passe.");
        }
    } else {
        socket.emit("alert", "Ce mail n'est pas enregistré.");
    }
};

const loginUsername = async (socket : Socket, data : any) => {
    let cant = await usernameExist(data.username);
    if (cant){
        if (await match(data.username, data.password)){
            let id;
            try {
                id = await getter.getIdByUsername(data.username);
            } catch (error) {
                console.error(error);
            }
            socket.data.id = id;
            const token = jwt.sign(
                { id: id },
                SECRET_KEY,
                { expiresIn: '2190h' }
            );
            
            socket.emit("success", {id: id, token:token, username : data.username});
        }
        else {
            socket.emit("alert", "Mauvais mot de passe.");
        }
    } else {
        socket.emit("alert", "Ce username n'est pas enregistré.");
    }
};

const register = async (socket : Socket, data : any) => {

    let cantEMail = await emailExist(data.email);
    let cantUserName = await usernameExist(data.username);
    console.log("entrer dans le register");


    if (cantEMail){
        socket.emit("alert", "Cette adresse e-mail est déjà utilisée.");
        return false;
    } else if (cantUserName){
        socket.emit("alert", "Ce Username est déjà pris.");
        return false;
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
            socket.data.id = id;
            const token = jwt.sign(
                { id: id },
                SECRET_KEY,
                { expiresIn: '2190h' }
            );
            
            socket.emit("success", {id: id, token:token, username : data.username});
            console.log("après le create user");

            /*const token = jwt.sign(
                { id: socket.data.id, nickname: socket.data.nickname },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );*/

            
            return true;
        } catch(error) {
            console.error(error);
            socket.emit("alert", "Format d'adresse e-amil non valide.")
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
}

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




export default {login, register, updateUsername, match, usernameExist, emailExist}