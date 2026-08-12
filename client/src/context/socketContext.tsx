import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ReactNode } from "react";
import { Socket, io } from "socket.io-client";
import { AuthContext } from './authentContext';
const server_url = import.meta.env.VITE_SERVER_URL;


// Créer un contexte pour le socket
const SocketContext = createContext<Socket | null>(null);




interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children })  => {

  const [socket, setSocket] = useState<Socket | null>(null);
  const auth = useContext(AuthContext);
  // L'effet ne doit pas recréer le socket à chaque changement d'auth, mais
  // "connect" doit émettre l'identité à jour : on la lit via une ref.
  const userRef = useRef(auth?.user);
  userRef.current = auth?.user;

  useEffect(() => {
    // Comme pour les requêtes HTTP (cf. requestScheme.ts) : un joueur qui a
    // ouvert la page via ngrok ou une IP locale doit passer par le proxy Vite
    // (même origine, /socket.io) plutôt que par l'URL absolue localhost:3000.
    const isLocalHost = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const socketInstance = isLocalHost
      ? io(server_url)
      : io();
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      socketInstance.emit("userInformation", {
        username: userRef.current?.Username ?? "",
        id: userRef.current?.id ?? "",
      });
    });

    // Déconnexion lors du démontage
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Si l'utilisateur se connecte après le montage, on renvoie son identité au
  // serveur sans recréer le socket.
  useEffect(() => {
    if (socket?.connected) {
      socket.emit("userInformation", {
        username: auth?.user?.Username ?? "",
        id: auth?.user?.id ?? "",
      });
    }
  }, [socket, auth?.user?.id, auth?.user?.Username]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// Utiliser le socket dans n'importe quel composant
export const useSocket = () => {
  return useContext(SocketContext);
};

