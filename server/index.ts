import { Socket } from "socket.io";
import mongoose from "./db";

//const action = require('./fun.js');
//const database = require('./DbFun.js');
const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5174",
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
  socket.data.nickname = "User_" + socket.id;
})


server.listen(3000, () => {
  console.log('server running on port 3000.');
});