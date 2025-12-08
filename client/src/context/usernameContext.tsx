import { createContext, useState, useEffect, ReactNode } from "react";



// Définition du type pour le contexte d'authentification
interface UsernameContextType {
  username: string;
  setName:(name : string) =>void;
  getName: () => string;
}

// Création du contexte avec un type explicite
export const UsernameContext = createContext<UsernameContextType | null>(null);

interface UsernameProviderProps {
  children: ReactNode;
}



export const UsernameProvider: React.FC<UsernameProviderProps> = ({ children }) => {
    const [username, setName] = useState("");
    function getName(){
        return username;
    }

    return (
        <UsernameContext.Provider value={{ username, getName, setName }}>
        {children}
        </UsernameContext.Provider>
    );
};

