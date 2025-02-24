import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import dbAction from "./dbAction";
import getter from "./getter"
import User from "../Collection/user"
import dotenv from 'dotenv';
import { isUndefined } from "util";
dotenv.config();


const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const SECRET_KEY : string= process.env.JWT_SECRET || "sferkfjdddfeofjgrjkjdkdpcdfkvfd";



const login = async (socket : Socket, data : any) => {
    let name = data.username;
    if (regexEmail.test(name)){
        loginEMail(socket, data);
    } else {
        loginUsername(socket, data);
    }
};

const loginEMail = async (socket: Socket, data : any) => {
    let can = await dbAction.emailExist(data.username);
    if (can){
        let match = await dbAction.match(data.username, data.password)
        console.log(match);
        if (match){
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
    let cant = await dbAction.usernameExist(data.username);
    if (cant){
        if (await dbAction.match(data.username, data.password)){
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
            
            socket.emit("success", {id: id, token:token});
        }
        else {
            socket.emit("alert", "Mauvais mot de passe.");
        }
    } else {
        socket.emit("alert", "Ce username n'est pas enregistré.");
    }
};

const register = async (socket : Socket, data : any) => {

    let cantEMail = await dbAction.emailExist(data.email);
    let cantUserName = await dbAction.usernameExist(data.username);
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
            
            socket.emit("success", {id: id, token:token});
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


export default {login, register}