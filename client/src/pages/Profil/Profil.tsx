import { Button } from "@mui/material";
import {Edit}from '@mui/icons-material';
import { Banner } from "../../component/Banner/Banner"
import { useNavigate } from "react-router-dom"
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/authentContext";
import  QuestionCard  from "../../component/QuestionCard/QuestionCard";
import "../CommonCss.css";
import "./profil.css";
import "../../component/QuestionCard/QuestionCard.css";
import makeRequest from "../../tools/requestScheme";

export function Profil () {
    const auth = useContext(AuthContext);
    const [questions, setQuestions] = useState([]);
    const [questionCards, setQuestionCards] = useState<QuestionCard[]>([]);
    const [quizz,setQuizz] = useState([]);
    const [quizzCards, setQuizzCards] = useState<QuestionCard[]>([]);
    const navigate = useNavigate();

    const buttonPressedQuestion = (questionCard : QuestionCard) => {
      navigate("/modify-a-question", {state : {question : questionCard.getContent()}});
    }

    const buttonPressedQuizz = (questionCard : QuestionCard) => {
      navigate("/modify-a-quizz", {state : {quizz : questionCard.getContent()}});
    }

    useEffect(() => {
      const fetchData = async () => {
        if (auth?.user?.id) {
          try {
            const responseQuestions = await makeRequest("/question?id=" + auth.user.id);
            setQuestions(responseQuestions);
    
            const responseQuizz = await makeRequest("/quizz?id=" + auth.user.id);
            setQuizz(responseQuizz);
          } catch (error) {
            console.error("Erreur lors du fetch :", error);
          }
        }
      };
    
      fetchData();
    }, [auth?.user?.id]);
    
    useEffect(() => {
      setQuestionCards([]);
      /*if (questions.length === 0){
        let listNum = [1,2,3,4,5,6,7,8,9,10,11,12];
        listNum.map((i : number) => {
          let newQC = new QuestionCard({
            id : i,
            title : "titre mias genre en un peu plus long, t'sais si le mec il a pas dosé et tout genre malade mental quoi le gars mdr. nan plus sérieusement qu'est ce qu'il se passerait si l'intitulé de la question était immense, il faudrait le bloqué nan ? "+  i,
            mode : "QCM",
            private : false
          }, buttonPressed, <Edit/>, 0);
          setQuestionCards((prevCards) => [...prevCards, newQC])
      
        })
      }*/
      if (questions){
        questions.map((question : any) =>{
          let newQC = new QuestionCard(question, buttonPressedQuestion, <Edit className="ActionIcon"/>,  Number(auth?.user?.id));
          setQuestionCards((prevCards) => [...prevCards, newQC])
        });
      }
    }, [questions]);

    useEffect(() => {
      setQuizzCards([]);
      /*if (questions.length === 0){
        let listNum = [1,2,3,4,5,6,7,8,9,10,11,12];
        listNum.map((i : number) => {
          let newQC = new QuestionCard({
            id : i,
            title : "titre mias genre en un peu plus long, t'sais si le mec il a pas dosé et tout genre malade mental quoi le gars mdr. nan plus sérieusement qu'est ce qu'il se passerait si l'intitulé de la question était immense, il faudrait le bloqué nan ? "+  i,
            mode : "QCM",
            private : false
          }, buttonPressed, <Edit/>, 0);
          setQuestionCards((prevCards) => [...prevCards, newQC])
      
        })
      }*/
      if (quizz){
        quizz.map((quizz : any) =>{
          let newQC = new QuestionCard(quizz, buttonPressedQuizz, <Edit className="ActionIcon"/>,  Number(auth?.user?.id));
          setQuizzCards((prevCards) => [...prevCards, newQC])
        });
      }
    }, [quizz]);


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
          {quizzCards.map((quizzCard : QuestionCard) => (
              quizzCard.show()
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

