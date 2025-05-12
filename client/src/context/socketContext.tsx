import { createContext, useContext, useState, useEffect } from 'react';
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
  
  useEffect(() => {
    const socketInstance = io("http://localhost:3000" , { reconnection: false });
    setSocket(socketInstance);

    // Gérer les événements du socket ici
    socketInstance.on("connect", () => {
      console.log("Utilisateur connecté au serveur socket");
      socketInstance.emit("userInformation", {username : auth? auth.user?.Username : "", id : auth? auth.user?.id : ""})
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket déconnecté");
    });

    // Déconnexion lors du démontage
    return () => {

      socketInstance.disconnect();
      console.log("Socket déconnecté lors du démontage");
    };
  }, []);

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

