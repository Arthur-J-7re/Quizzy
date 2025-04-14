import { createContext, useState, useEffect, ReactNode } from "react";

// Définition du type User
interface User {
  id: string;
  Username: string;
  currentRoom : string;
  token: string;
}

// Définition du type pour le contexte d'authentification
interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUser: (usrename : string) => void;
}

// Création du contexte avec un type explicite
export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

// Vérifie si le token est expiré
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiration = payload.exp * 1000;
    return Date.now() > expiration;
  } catch (error) {
    console.error("Failed to parse token", error);
    return true;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        return parsedUser.token && !isTokenExpired(parsedUser.token) ? parsedUser : null;
      } catch (error) {
        console.error("Erreur lors du parsing de l'utilisateur :", error);
      }
    }
    return null;
  });

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) { 
      try {
        const parsedUser: User = JSON.parse(storedUser);
        if (parsedUser.token && isTokenExpired(parsedUser.token)) {
          logout();
        } else {
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Erreur lors du parsing de l'utilisateur :", error);
      }
    }
  }, []);
  
  // Fonction de connexion
  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  // Fonction de déconnexion
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const updateUser = (new_username : string) => {
    let user = JSON.parse(localStorage.getItem("user") || "");
    if (user != "") {
      user.Username = new_username;
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      console.log("Aucun utilisateur trouvé dans le localStorage");
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

