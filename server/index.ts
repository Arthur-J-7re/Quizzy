import { Socket } from "socket.io";
import mongoose from "./db";
import getter from "./function/getter";
import dbfun from "./function/dbAction";
import fun from "./function/fun"
import cors from "cors";


//const action = require('./fun.js');
//const database = require('./DbFun.js');
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors({ origin: "http://localhost:5180" })); 
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5180",
        methods: ["GET", "POST"],
    }
});

(async () => {
    try {
      if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is not defined in the environment variables.");
      }
      await mongoose.connect(process.env.MONGO_URI);
      console.log("Connexion réussie avec la base de données");
    } catch (error){
      if (error instanceof Error) {
        console.error(error.message);
      } else {
        console.error("Une erreur inconnue est survenue", error);
      }
    }
  })();


  

io.on('connection',(socket : Socket) => {
  console.log("Un utilisateur est connecté");
  socket.data.id = 2;
  socket.data.nickname = "User_" + socket.id;
  socket.on("register", (data) => fun.register(socket, data));
  socket.on("login", (data) => fun.login(socket, data));
  socket.on("createQuizz", (data) => dbfun.createQuizz(socket, data));
  socket.on("createQCMQuestion", (data) => dbfun.createQCMQuestion(socket, data));
  socket.on("createFreeQuestion", (data) => dbfun.createFreeQuestion(socket, data));
  socket.on("createDCCQuestion", (data) => dbfun.createDCCQuestion(socket, data));
  socket.on("createVFQuestion", (data) => {dbfun.createVFQuestion(socket, data)});
  socket.on("modificationQCMQuestion", (data) => dbfun.modifyQCMQuestion(socket,data));
  socket.on("modificationFreeQuestion", (data) => dbfun.modifyFreeQuestion(socket,data));
  socket.on("modificationDCCQuestion", (data) => dbfun.modifyDCCQuestion(socket,data));
  socket.on("modificationVFQuestion", (data) => dbfun.modifyVFQuestion(socket,data));
});


app.get("/questions", async (req,res) => {
  console.log("appelle au question");
  const id = Number(req.query.id);
  try {
    const retour =await getter.getQuestsionByOwner(id);
    res.json(retour);
    
  } catch (error) {
    console.error(error);
  }
});


server.listen(3000, () => {
  console.log('server running on port 3000.');
});