import { Button } from "@mui/material";
import { Switch } from '@mui/material';
import { Banner } from "../../component/Banner/Banner"
import { useSocket } from "../../context/socketContext";
import { useNavigate } from "react-router-dom"
import { useContext, useEffect, useState } from "react";
import { useRef } from "react";
import { useCallback } from "react";
import { Socket } from 'socket.io-client';
import { AuthContext } from "../../context/authentContext";
import  QuestionCard  from "../../component/QuestionCard/QuestionCard";
import Toast from "../../tools/toast/toast";
import "../CommonCss.css";


export function QuizzCreation () {
    const auth = useContext(AuthContext);
    const user_id = auth?.user?.id || "0";
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [questionCards, setQuestionCards] = useState<QuestionCard[]>([]);
    const [title, setTitle] = useState("");
    const socket = useSocket();
    const [isPrivate, setPrivate] = useState(true);
    const [questionCardsOfQuizz, setQuestionCardsOfQuizz] = useState<QuestionCard[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [messageInfo, setMessageInfo] = useState("");
    const [showMessage, setShowMessage] = useState(false);

    const fetched = useRef(false);

    useEffect(() => {
        //if (fetched.current) return; // Empêche un deuxième fetch
        fetched.current = true; // Marque le fetch comme effectué

        if (auth?.user?.id) {
            fetch("http://localhost:3000/questions?id=" + auth?.user?.id)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then((data) => setQuestions(data))
                .catch((error) => console.error("There was a problem with the fetch operation:", error));
        }
    }, [auth?.user?.id]);
    
    
    const buttonPressed = useCallback((questionCard: QuestionCard) => {
        setQuestionCardsOfQuizz(prevCards => {
            const found = prevCards.find(card => card.getId() === questionCard.getId());
            if (found) {
                console.log("On remove la card");
                questionCard.setButtonText("Ajouter la question au Quizz");
                return prevCards.filter(card => card.getId() !== questionCard.getId());
            } else {
                console.log("On add la card");
                questionCard.setButtonText("Retirer la question du Quizz");
                return [...prevCards, questionCard];
            }
        });
    }, []);

    
    const addTag = (tag : string) => {
        if (!tags.includes(tag) && tags.length < 5) {
            setTags([...tags, tag]);
        }
    };
    
    const removeTag = (tagToRemove : string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));  
    };
    
    const changePrivate = () =>{
        setPrivate(!isPrivate);
    };

    const validateQuizz = () => {
        if (!title.trim()) {
            setMessageInfo("Il faut un nom pour le Quizz !");
            setShowMessage(true);
            return false;
        }
        
        if (questionCardsOfQuizz.length === 0) {
            setMessageInfo("Il faut au moins une question !");
            setShowMessage(true);
            return false;
        }
        
        
        return true;
    }
    
    const sendData = () => {
        if (socket instanceof Socket && validateQuizz()) {
            console.log(questionCardsOfQuizz.length);
            let retour = questionCardsOfQuizz.map((card) => card.getId()); // Utilisation correcte de map()
            
            socket.emit("createQuizz", {
                user_id: user_id,
                title: title,
                private: isPrivate, 
                tags: tags,
                questionList: retour
            });
        }
    };

    useEffect(() => {
      setQuestionCards([]);
      questions.map((question : any) =>{
        let newQC = new QuestionCard(question, buttonPressed, "Ajouter la question au quizz");
        setQuestionCards((prevCards) => [...prevCards, newQC])
      });
    }, [questions]);

    useEffect(() => {
        

    }, [questionCards, questionCardsOfQuizz])



    return (
    (auth && auth.user) ? 
    <div>
        <Banner></Banner>
        <div className="titre">
            <input
                type='text'
                id="title"
                value={title || ''}
                onChange={(e) => setTitle(e.target.value )}
                required
            />
        </div>
        <div className='privateswitch'>
            <label className='sign-label' onClick={() => setPrivate(false)}>Quizz public</label>
            <Switch
                type='checkbox'
                checked={isPrivate}
                onClick={() => changePrivate()}
            />
            <label className='sign-label' onClick={() => setPrivate(true)}>Quizz privé</label>
        </div>
        <div >
        {questionCards.length > 0  ?  questionCards.map((questionCard : QuestionCard) => (
            questionCard.show()
          )): <h2>Chargement des questions {questionCards.length}</h2>}
        </div>
        <div>
            {questionCardsOfQuizz.length > 0 ? questionCardsOfQuizz.map((questionCard : QuestionCard)=> (
                console.log("il y a " + questionCardsOfQuizz.length),
                questionCard.show()
            )) : <h2>Sélectionnez des questions pour votre quizz !</h2>}
        </div>
        <div className='tagList'>
                <div>
                    {tags.map(tag => (
                    <span key={tag} onClick={() => removeTag(tag)} style={{ margin: "5px", cursor: "pointer", background: "#ddd", padding: "5px", borderRadius: "5px" }}>
                        {tag} ❌
                    </span>
                    ))}
                </div>
                {tags.length < 5 ? (
                    <input 
                    type="text" 
                    onKeyDown={(e) => {
                        const inputElement = e.target as HTMLInputElement;
                        if (e.key === "Enter" && inputElement.value.trim()) {
                        addTag(inputElement.value.trim());
                        inputElement.value = "";
                        }
                    }} 
                    placeholder="Ajouter un tag"
                    />
                ) : (
                    <p style={{ color: "red" }}>Maximum 5 tags atteints</p>
                )}
            </div>
        <div>
            <Button className="send-Quizz" onClick={() => sendData()}>Créer le quizz</Button>
        </div>
        <div className= 'RedText'>{
            showMessage &&
            <Toast message={messageInfo} onClose={()=>{setShowMessage(false)}} />}
        </div>
    
    </div> 
    : 
    <div>
        <Banner></Banner>
        <div className='PleaseLogin'>
            <h1>Veuillez-vous inscrire pour pouvoir créer un quizz</h1>
            <Button className='linkLogin' onClick={() => navigate("/login")}>Page de connection !</Button>
        </div>
    </div>

)
};