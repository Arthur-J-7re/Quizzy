import dotenv from 'dotenv';
dotenv.config();

import { Socket } from "socket.io";
import mongoose from "./db";
import cors from "cors";
import routes from "./routes/appRoutes";
import roomSocket from "./GameFunction/RoomFunction";
import threadSocket from "./GameFunction/ThreadFunction";
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { networkInterfaces } from 'node:os';
import isAllowedOrigin from "./utils/allowedOrigin";
import errorHandler from "./utils/errorHandler";

const app = express();

declare module "socket.io" {
  interface Socket {
    user_id: number;
    room_id: string;
    username : string;
  }
}

app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)) }));
const server = createServer(app);
export const io = new Server(server, {
    cors: {
        origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
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
  socket.on("userInformation", (data) => {
    socket.user_id = data.id;
    socket.username = data.username;
  });

  roomSocket(io, socket);
  // threadSocket n'était jamais branché : les événements startGame,
  // answerToQuestion et setMode partaient du client dans le vide.
  threadSocket(io, socket);
});

app.use(express.json());

// Permet au client de retrouver l'URL publiquement joignable (tunnel ngrok en
// mode jeu local, ou IP du réseau local à défaut) pour partager le lien d'un salon.
app.get("/connection-url", async (_req: express.Request, res: express.Response): Promise<void> => {
  try {
    const response = await fetch("http://localhost:4040/api/tunnels");
    const data: any = await response.json();
    const tunnel = data.tunnels?.find((t: any) => t.proto === "https");
    if (tunnel?.public_url) {
      res.json({ url: tunnel.public_url, isNgrok: true });
      return;
    }
  } catch {
    // pas d'agent ngrok local actif, on retombe sur l'IP locale
  }

  const interfaces = networkInterfaces();
  for (const list of Object.values(interfaces)) {
    for (const info of list ?? []) {
      if (info.family === "IPv4" && !info.internal) {
        res.json({ url: `http://${info.address}:5180`, isNgrok: false });
        return;
      }
    }
  }

  res.json({ url: "http://localhost:5180", isNgrok: false });
});

app.use("/", routes);

// Doit rester le dernier middleware : c'est lui qui traduit les exceptions des
// routes en réponses HTTP (400 / 403 / 404 / 500) au lieu d'un 200 vide.
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log(`server running on port ${PORT}.`);
});
