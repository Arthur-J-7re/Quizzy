import { Button } from "@mui/material";
import { Banner } from "../component/Banner/Banner"
import { useNavigate } from "react-router-dom"
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/authentContext";
import  QuestionCard  from "../component/QuestionCard/QuestionCard";


export function Profil () {
    const auth = useContext(AuthContext);
    const [questions, setQuestions] = useState([]);
    const [questionCards, setQuestionCards] = useState<QuestionCard[]>([]);
    const navigate = useNavigate();

    const buttonPressed = (question : any) => {
      navigate("/modify-a-question", {state : {question : question}});
    }
    useEffect(() => {
        (auth?.user?.id) ? 
        fetch("http://localhost:3000/questions?id=" + auth?.user?.id)
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            console.log(response.json);
            return response.json();
          })
          .then((data) => {console.log(data);setQuestions(data)})
          .catch((error) => console.error("There was a problem with the fetch operation:", error))
        : "";
      }, [auth?.user?.id]);
    
    useEffect(() => {
      setQuestionCards([]);
      questions.map((question : any) =>{
        let newQC = new QuestionCard(question, buttonPressed);
        setQuestionCards((prevCards) => [...prevCards, newQC])
      });
    }, [questions]);


    return (
    (auth && auth.user) ? 
    <div>
        <Banner></Banner>
        {questionCards.map((questionCard : QuestionCard) => (
            questionCard.show()
          ))}
    
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

