import { Button } from "@mui/material";
import {Edit}from '@mui/icons-material';
import { Banner } from "../../component/Banner/Banner"
import { useNavigate } from "react-router-dom"
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/authentContext";
import  QuestionCard  from "../../component/Card/EntityCard/QuestionCard";
import ThemeCard from "../../component/Card/EntityCard/ThemeCard";
import EmissionCard from "../../component/Card/EntityCard/EmissionCard";
import "../CommonCss.css";
import "./profil.css";
import "../../component/Card/Card.css";
import makeRequest from "../../tools/requestScheme";
import QuizzCard from "../../component/Card/EntityCard/QuizzCard";

export function   Profil () {
    const auth = useContext(AuthContext);
    const [questions, setQuestions] = useState([]);
    const [questionCards, setQuestionCards] = useState<QuestionCard[]>([]);
    const [quizz,setQuizz] = useState([]);
    const [quizzCards, setQuizzCards] = useState<QuizzCard[]>([]);
    const [themes, setThemes] = useState([]);
    const [themeCards, setThemeCards] = useState<ThemeCard[]>([]);
    const [emissions, setEmissions] = useState([]);
    const [emissionCards, setEmissionCards] = useState<EmissionCard[]>([]);
    const navigate = useNavigate();

    const buttonPressedQuestion = (questionCard : QuestionCard) => {
      navigate("/modify-a-question", {state : {question : questionCard.getContent()}});
    }

    const buttonPressedQuizz = (questionCard : QuestionCard) => {
      navigate("/modify-a-quizz", {state : {quizz : questionCard.getContent()}});
    }

    const buttonPressedTheme = (themeCard : ThemeCard) => {
      navigate("/modify-a-theme", {state : {theme : themeCard.getContent()}});
    }

    const buttonPressedEmission = (emissionCard : EmissionCard) => {
      navigate("/modify-an-emission", {state: {emission : emissionCard.getContent()}});
    }

    useEffect(() => {
      const fetchData = async () => {
        if (auth?.user?.id) {
          try {
            const responseQuestions = await makeRequest("/question");
            const responseQuizz = await makeRequest("/quizz");
            const responseTheme = await makeRequest("/theme");
            const responseEmission = await makeRequest("/emission");

            setQuestions(responseQuestions);
            setQuizz(responseQuizz);
            setThemes(responseTheme);
            setEmissions(responseEmission);
          } catch (error) {
            console.error("Erreur lors du fetch :", error);
          }
        }
      };
    
      fetchData();
    }, [auth?.user?.id]);
    
    useEffect(() => {
      setQuestionCards([]);
      if (questions){
        questions.map((question : any) =>{
          let newQC = new QuestionCard(question, buttonPressedQuestion, <Edit className="ActionIcon"/>,  Number(auth?.user?.id));
          setQuestionCards((prevCards) => [...prevCards, newQC])
        });
      }
    }, [questions]);

    useEffect(() => {
      setQuizzCards([]);
      if (quizz){
        quizz.map((quizz : any) =>{
          let newQC = new QuizzCard(quizz, buttonPressedQuizz, <Edit className="ActionIcon"/>,  Number(auth?.user?.id));
          setQuizzCards((prevCards) => [...prevCards, newQC])
        });
      }
    }, [quizz]);

    useEffect(() => {
      setThemeCards([]);
      if (themes){
        themes.map((theme : any)=>{
          let newTC = new ThemeCard(theme, buttonPressedTheme, <Edit className="ActionIcon"/>, Number(auth?.user?.id));
          setThemeCards((prevCards) => [...prevCards, newTC])
        });
      }
    },[themes])

    useEffect(() => {
      setEmissionCards([]);
      if (emissions){
        emissions.map((emission : any) => {
          let newEC = new EmissionCard(emission, buttonPressedEmission, <Edit className="ActionIcon"/>, Number(auth?.user?.id));
          setEmissionCards((prevCards) => [...prevCards, newEC])
        });
      }
    },[emissions])


    return (
    (auth && auth.user) ? 
    <div>
        <Banner></Banner>
        <div className="profilBlock">
          <div className="subTitle"> Vos Questions</div>
          <div className="questionCardArea">
          {questionCards.map((questionCard : QuestionCard) => (
              questionCard.show()
            ))}
          </div>
        </div>
        
        <div className="profilBlock">
          <div className="subTitle"> Vos Quizz</div>
          <div className="questionCardArea">
          {quizzCards.map((quizzCard : QuizzCard) => (
              quizzCard.show()
            ))}
          </div>
        </div>

        <div className="profilBlock">
          <div className="subTitle"> Vos Themes</div>
          <div className="questionCardArea">
          {themeCards.map((themeCard : ThemeCard) => (
              themeCard.show()
            ))}
          </div>
        </div>

        <div className="profilBlock">
          <div className="subTitle"> Vos Emissions</div>
          <div className="questionCardArea">
          {emissionCards.map((emissionCard : EmissionCard) => (
              emissionCard.show()
            ))}
          </div>
        </div>
    </div> 
    : 
    <div>
        <Banner></Banner>
        <div className='PleaseLogin'>
            <h1>Veuillez-vous inscrire pour créer une question</h1>
            <Button className='linkLogin' onClick={() => navigate("/login")}>Page de connection !</Button>
        </div>
    </div>
)
};

