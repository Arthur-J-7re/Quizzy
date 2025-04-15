import { Button, Switch } from "@mui/material";
import {Remove, Add} from "@mui/icons-material";
import { Banner } from "../../component/Banner/Banner"
import { useNavigate, useLocation } from "react-router-dom"
import { useContext, useEffect, useState, useRef, useCallback } from "react";
import { AuthContext } from "../../context/authentContext";
import  QuestionCard  from "../../component/QuestionCard/QuestionCard";
import Toast from "../../tools/toast/toast"; 
import "../CommonCss.css";
import "../../component/QuestionCard/QuestionCard.css";
import "./QuizzForm.css";
import { Searchbar } from "../../component/Searchbar/Searchbar";
import makeRequest from "../../tools/requestScheme";


export function QuizzCreation () {
    const navigate = useNavigate();
    const location = useLocation();
    const [quizz, setQuizz] =useState((location.state?.quizz && location.pathname === "/modify-a-quizz")|| {title : "", Private : false, questions : [], tags: []});
    const [creating, setCreating] = useState(location.pathname === "/modify-a-quizz" ? false : true);
    let list = quizz?.questions;
    const auth = useContext(AuthContext);
    const user_id = auth?.user?.id || "0";
    const [questions, setQuestions] = useState([]);
    const [questionCards, setQuestionCards] = useState<QuestionCard[]>([]);
    const [title, setTitle] = useState(quizz?.title || "");

    const [isPrivate, setPrivate] = useState(quizz?.private || true);
    const [questionCardsOfQuizz, setQuestionCardsOfQuizz] = useState<QuestionCard[]>([]);
    const [tags, setTags] = useState<string[]>(quizz?.tags || []);
    const [messageInfo, setMessageInfo] = useState("");
    const [showMessage, setShowMessage] = useState(false);
    const [filterData, setFilterData] = useState({ questionType : "any", scope : "all", searchText : ""});
    const [questionCardsBuild, setQuestionCardsBuild] = useState(false);
    const [endTaskToast, setEndTaskToast] = useState(() => {});

    const fetched = useRef(false);

    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, index: number) => {
        event.dataTransfer.setData("index", index.toString());
    };
    
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); // Permet le drop
    };
    
    const handleDrop = (event: React.DragEvent<HTMLDivElement>, newIndex: number) => {
        event.preventDefault();
        const oldIndex = Number(event.dataTransfer.getData("index"));
    
        // Réorganise la liste des questions
        verifyDnD("avant");
        setQuestionCardsOfQuizz((prevCards) => {
            const updatedCards = [...prevCards];
            const [movedCard] = updatedCards.splice(oldIndex, 1);
            updatedCards.splice(newIndex, 0, movedCard);
            return updatedCards;
        });
        verifyDnD("après");

    };    


    useEffect(() => {
        //if (fetched.current) return; // Empêche un deuxième fetch
        fetched.current = true; // Marque le fetch comme effectué

        const fetchData = async () => {
            if (auth?.user?.id) {
              try {
                const responseQuestions = await makeRequest("/question/questionsAvailable?id=" + auth.user.id);
                setQuestions(responseQuestions);
              } catch (error) {
                console.error("Erreur lors du fetch :", error);
              }
            }
          };
        
        fetchData();
        if (location.state?.quizz) {
            setQuizz(location.state.quizz);
        }

    }, [auth?.user?.id, location.state?.quizz]);

    useEffect(() => {
        if ((quizz?.title?.length === 0  && location.pathname === "/modify-a-quizz")) {
          navigate("/create-a-quizz");
        }
      }, [quizz?.questions, location.pathname]);

    useEffect(()=>{
        if (questionCardsBuild || questionCards.length > 0){
            setQuestionCardsBuild(true);
        }
    }, [questionCards])

    useEffect(()=>{
        console.log("useState de quizz");
        setTitle(quizz?.title || "");
        setTags(quizz?.tags || []);
        setPrivate(quizz?.private || true);
        setCreating(quizz?.title ? false : true);



        if (!quizz || !questionCards || !quizz?.questions) return;

        console.log("la list : ", list);
        
        const toBeSeted = list
            .map((id : any) => questionCards.find((questionCard) => questionCard.getId() === Number(id)))
            .filter((questionCard : any) => questionCard !== undefined) as QuestionCard[]; // TypeScript sait que c'est sûr
        console.log("questionCards de base");
        toBeSeted.map((card : any) => console.log(card.getId()));
        setQuestionCardsOfQuizz(toBeSeted);
    }, [quizz, questionCardsBuild]);
    
    
    const buttonPressed = useCallback((questionCard: QuestionCard) => {
        setQuestionCardsOfQuizz(prevCards => {
            const found = prevCards.find(card => card.getId() === questionCard.getId());
            if (found) {
                questionCard.setButtonText(<Add className="ActionIcon"/>);
                questionCard.setColor("Green");
                return prevCards.filter(card => card.getId() !== questionCard.getId());
            } else {
                questionCard.setButtonText(<Remove className="ActionIcon"/>);
                questionCard.setColor("Red");
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

    const verifyDnD = (str : string) =>{
        let retour = questionCardsOfQuizz.map((card) => card.getId());
        console.log(str);
        console.log(retour);
    }

    const deleteQuizz = async () => {
        const confirmation = window.confirm("Êtes-vous sûr de vouloir supprimer définitivement la question ?");
        if (confirmation) {
            const response = await makeRequest("/quizz", "DELETE", {quizz_id : quizz.quizz_id, creator: quizz.creator});
            if (response.success){
                navigate("/profil")
            }
        }
    };

    const endTask = () =>{
        setMessageInfo("quizz créé avec succès");
        setShowMessage(true);
        setEndTaskToast(() => navigate(-1));
    }
    
    const sendData = async () => {
        if (validateQuizz()) {
            if (creating){
                console.log(questionCardsOfQuizz.length);
                let questionList = questionCardsOfQuizz.map((card) => card.getId()); // Utilisation correcte de map()
                const retour = await makeRequest("/quizz/create", "POST", {
                    user_id: user_id,
                    title: title,
                    private: isPrivate, 
                    tags: tags,
                    questionList: questionList
                });
                if (retour.success){
                    endTask();
                }
            } else {
                console.log("on tente d'update");
                let questionList = questionCardsOfQuizz.map((card) => card.getId()); // Utilisation correcte de map()
                const retour = await makeRequest("/quizz/update", "PUT", {
                    quizz_id: quizz.quizz_id,
                    user_id: user_id,
                    title: title,
                    private: isPrivate, 
                    tags: tags,
                    questionList: questionList
                });
                if (retour.success){
                    endTask();
                }
            }
        }
    };

    useEffect(() => {
        setQuestionCards([]);
        /*if (questions.length === 0){
        let listNum = [1,2,3,4,5,6,7,8,9,10,11,12];
        listNum.map((i : number) => {
            let newQC = new QuestionCard({
            question_id : i,
            title : "titre mias genre en un peu plus long, t'sais si le mec il a pas dosé et tout genre malade mental quoi le gars mdr. nan plus sérieusement qu'est ce qu'il se passerait si l'intitulé de la question était immense, il faudrait le bloqué nan ? "+  i,
            mode : "QCM",
            private : false
            }, buttonPressed, <Add/>, (0);
            setQuestionCards((prevCards) => [...prevCards, newQC])
        
        })
        }*/
        if (questions){
            questions.map((question : any) =>{
                const {button, couleur} = list?.includes(question.question_id) ? {button : <Remove className="ActionIcon"/>,couleur : "Red"}:{button : <Add className="ActionIcon"/>, couleur : 'Green'};
                let newQC = new QuestionCard(question, buttonPressed,button,(Number(auth?.user?.id) || 0), couleur);
                setQuestionCards((prevCards) => [...prevCards, newQC])
            });
        }
    }, [questions]);

    useEffect(() => {
        

    }, [questionCards, questionCardsOfQuizz])



    return (
    (auth && auth.user) ? 
    <div >
        <Banner></Banner>
        <div className="quizzFormContainer">
            <div className="title">
                <input
                    type='text'
                    id="titre"
                    value={title || ''}
                    onChange={(e) => setTitle(e.target.value )}
                    required
                />
            </div>
            <div className='privateswitch'>
                <label className='quizzCreation-label' onClick={() => setPrivate(false)}>Question public</label>
                <Switch
                    type='checkboxe'
                    checked={isPrivate}
                    className='isPrivate'
                    onClick={() => changePrivate()}
                />
                <label className='quizzCreation-label' onClick={() => setPrivate(true)}>Question privée</label>
            </div>
            
            <Searchbar filterData={filterData} setFilterData={setFilterData}/>
            <div className="subTitle">Les Questions utilisables</div>
            <div className="questionCardArea">
                {questionCards.length > 0 ? (
                    (() => {
                        const filteredCards = questionCards.filter((questionCard) => questionCard.match(filterData));

                        return filteredCards.length > 0 ? (
                            filteredCards.map((questionCard: QuestionCard) => questionCard.show())
                        ) : 
                            <h2 className="filler">Aucune question ne correspond à votre recherche.</h2>
                        ;
                    })()
                ) : (
                    <h2 className="filler">Chargement des questions...</h2>
                )}
            </div>
            
            <div className="subTitle">Les Questions utilisé dans Votre Quizz</div>
            <div className={questionCardsOfQuizz.length > 0 ? "questionCardArea" : "questionCardAreaWOGrid"}>
                {questionCardsOfQuizz.length > 0 ? (
                    questionCardsOfQuizz.map((questionCard, index) => (
                        <div
                            key={questionCard.getId()}
                            draggable
                            onDragStart={(event) => handleDragStart(event, index)}
                            onDragOver={handleDragOver}
                            onDrop={(event) => handleDrop(event, index)}
                            style={{
                                cursor: "grab",
                            }}
                            className="dragZone"
                        >
                            {questionCard.show()}
                        </div>
                    ))
                ) : (
                    <h2 className="filler">Sélectionnez des questions pour votre quizz !</h2>
                )}
            </div>
            
            <div className='tagList'>
                    <div>
                        {tags?.map(tag => (
                        <span key={tag} onClick={() => removeTag(tag)} style={{ margin: "5px", cursor: "pointer", background: "#ddd", padding: "5px", borderRadius: "5px" }}>
                            {tag} ❌
                        </span>
                        ))}
                    </div>
                    {tags?.length < 5 ? (
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
                <Button className="send-Quizz" onClick={() => sendData()}>{creating ? "Créer le quizz" : "Sauvegarder le quizz"}</Button>
            </div>
            <div>
                {creating ? "" : <Button onClick={() => deleteQuizz()}> supprimer le quizz</Button>}
            </div>
            <div className= 'RedText'>{
                showMessage &&
                <Toast message={messageInfo} onClose={()=>{setShowMessage(false); endTaskToast}} />}
            </div>
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