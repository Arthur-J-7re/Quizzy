import { Socket } from "socket.io";
import mongoose from "./db";
import getter from "./function/getter";
import QuestionCRUD from "./function/questionCRUD";
import AccountCRUD from "./function/accountCRUD";
import QuizzCRUD from "./function/quizzCRUD";
import cors from "cors";
import routes from "./routes/appRoutes";
import testSocket from "./GameFunction/testSocket";


//const action = require('./fun.js');
//const database = require('./QuestionCRUD.js');
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import questionCRUD from "./function/questionCRUD";
import test from "node:test";
dotenv.config();

const app = express();

declare module "socket.io" {
  interface Socket {
    user_id: number; // ou number selon ton type
    room_id: number;
    username : string;
  }
}


app.use(cors({ origin: "http://localhost:5180" })); 
const server = createServer(app);
export const io = new Server(server, {
    cors: {
        origin: "http://localhost:5180",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"]
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


  

io.on('connection',(socket : Socket ) => {
  console.log("Un utilisateur est connecté");

  socket.on("userInformation", (data) => {console.log("connection de ", data.username, "avec", data ); socket.user_id = data.id; socket.username = data.username});
  testSocket(io, socket);
  socket.on("disconnect", ()=>{
    console.log("socket deconnecté", socket.room_id)
  })

});

const update = async() => {
  await questionCRUD.update();
}



app.use(express.json());


app.use((req, res, next) => {

  //console.log(`[${req.method}] Requête reçue sur ${req.url}`);
  next();
});

app.use("/", routes);




server.listen(3000, () => {
  console.log('server running on port 3000.');
});