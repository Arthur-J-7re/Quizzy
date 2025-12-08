import { Button } from "@mui/material";
import { Banner } from "../../component/Banner/Banner";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext";
import "../CommonCss.css";
import "./Home.css";

export function Home() {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const isConnected = auth && auth.user;

  return (
    <div className="homeContainer">
      <Banner />
      
      <div className="hero-section">
        <h1 className="hero-title">Bienvenue sur QUIZZY</h1>
        <p className="hero-subtitle">
          L'outil ultime pour créer et partager vos quizz
        </p>
      </div>

      <div className="cards-container">
        {/* Bloc Créer */}
        <div className="feature-card create-card">
          <div className="card-icon">✏️</div>
          <h2 className="card-title">Créer</h2>
          <p className="card-description">
            Donnez vie à vos idées en créant des questions et des quizz personnalisés
          </p>
          <div className="card-actions">
            <Button
              variant="contained"
              className="card-button primary-button"
              onClick={() => {
                isConnected ? navigate("/create-a-question") : navigate("/login");
              }}
            >
              Créer une question
            </Button>
            <Button
              variant="contained"
              className="card-button primary-button"
              onClick={() => {
                isConnected ? navigate("/create-a-quizz") : navigate("/login");
              }}
            >
              Créer un quizz
            </Button>
          </div>
        </div>

        {/* Bloc Jouer */}
        <div className="feature-card play-card">
          <div className="card-icon">🎮</div>
          <h2 className="card-title">Jouer</h2>
          <p className="card-description">
            Testez vos connaissances et défiez-vous avec nos quizz
          </p>
          <div className="card-actions">
            <Button
              variant="contained"
              className="card-button secondary-button"
              onClick={() => navigate("/play")}
            >
              Commencer à jouer
            </Button>
          </div>
          <div className="dev-badge">En développement</div>
        </div>

        {/* Bloc Connexion (si non connecté) */}
        {!isConnected && (
          <div className="feature-card login-card">
            <div className="card-icon">🔐</div>
            <h2 className="card-title">Se connecter</h2>
            <p className="card-description">
              Connectez-vous pour accéder à toutes les fonctionnalités et sauvegarder vos créations
            </p>
            <div className="card-actions">
              <Button
                variant="contained"
                className="card-button accent-button"
                onClick={() => navigate("/login")}
              >
                Se connecter
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}