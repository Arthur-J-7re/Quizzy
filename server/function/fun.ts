import { Socket } from "socket.io";
import dbAction from "./dbAction";
import getter from "./getter"
import User from "../Collection/user"

const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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
            socket.data.id = await getter.getIdByEmail(data.username);
            /*const token = jwt.sign(
                { id: socket.data.id, nickname: socket.data.nickname },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );*/
            socket.emit("success");
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
            socket.data.id = await getter.getIdByUsername(data.username);
            /*const token = jwt.sign(
                { id: socket.data.id, nickname: socket.data.nickname, checked : data.checked },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );*/
            
            socket.emit("success");
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


    if (!cantEMail){
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
            socket.data.id = await getter.getIdByUsername(data.username);
            console.log("après le create user");

            /*const token = jwt.sign(
                { id: socket.data.id, nickname: socket.data.nickname },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );*/
            socket.emit("success");
            
            return true;
        } catch(error) {
            console.error(error);
            socket.emit("alert", "Format d'adresse e-amil non valide.")

        }
    }
};


export default {login, register}