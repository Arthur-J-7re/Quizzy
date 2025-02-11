import { Socket } from "socket.io";
import mongoose from "./db";
import "./function/getter";
import dbfun from "./function/dbAction";
import "./function/fun"


//const action = require('./fun.js');
//const database = require('./DbFun.js');
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
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
  socket.on("createQCMQuestion", (data) => dbfun.createQCMQuestion(socket, data));
  socket.on("createFreeQuestion", (data) => dbfun.createFreeQuestion(socket, data));
  socket.on("createDCCQuestion", (data) => dbfun.createDCCQuestion(socket, data));
})


server.listen(3000, () => {
  console.log('server running on port 3000.');
});