import QuestionCard from "../EntityCard/QuestionCard";
import QuizzCard from "../EntityCard/QuizzCard";
import Card from "../Card";
import { Searchbar } from "../../Searchbar/Searchbar";
import { useState,useContext, useCallback, useEffect } from "react";
import { AuthContext } from "../../../context/authentContext";
import {Remove, Add} from "@mui/icons-material";
import { getQuestionFilter, getDefaultFilter } from "../../../tools/props/Props";
import ThemeCard from "../EntityCard/ThemeCard";
import EmissionCard from "../EntityCard/EmissionCard";
import { CardArea } from "./CardArea";
import { getPruralOf } from "../../../tools/text/text"

export default function SelectMultipleCard (
    {
        entityType,
        usedIn,
        entities,
        usedEntities,
        setUsedEntities
    } : {
        entityType : string,
        usedIn : string,
        entities : any[],
        usedEntities : number[],
        setUsedEntities : Function
    }
) {
    const auth = useContext(AuthContext);
    const user_id = auth?.user?.id || 0;
    const [modified, setModified] = useState(false);
    const [filterData,setFilterData] = useState(getFilterData());
    
    const buttonPressed = useCallback((questionCard: QuestionCard) => {
        setModified(true);
        setUsedCard(prevCards => {
            console.log("Quiz creation : ",questionCard.getId());
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

    const [entityCard,setEntityCard] = useState<Card[]>(createCard());
    const [filteredCard, setFilteredCard] = useState<Card[]>([]);
    const [usedCard, setUsedCard] = useState<Card[]>([]);

    useEffect(()=>{
        setFilteredCard(entityCard.filter((Card) => Card.match(filterData)));
    },[entityCard,filterData])

    useEffect(() => {
        const createdCard = createCard();

        setUsedCard(
            createdCard.filter((card : Card)=> usedEntities.includes(card.getId()))
        );
        createdCard.forEach((card : Card) => {
            if (usedEntities.includes(card.getId())){
                card.setButtonText(<Remove className="ActionIcon"/>);
                card.setColor("Red");   
            }
        })
        setEntityCard(createdCard)
    },[entities]);

    useEffect(()=>{
        console.log(entityCard);
    },[entityCard])
    
    useEffect(()=>{
        console.log(modified);
        modified &&
        setUsedEntities(usedCard.map((card:Card)=>{
            return card.getId()
        }))
    },[usedCard])

    function getFilterData(){
        switch (entityType){
            case "Question":
                return getQuestionFilter();
            default : 
                return getDefaultFilter()
        }
    } 
    
    function createCard(){
        let button = <Add className="ActionIcon"/>;
        switch (entityType){
            case "Question":
                return entities.map((question : any)=>{
                    return new QuestionCard(question,buttonPressed,button,user_id)
                })
            case "Quizz":
                return entities.map((quizz : any)=>{
                    return new QuizzCard(quizz,buttonPressed,button,user_id)
                })
            case "Theme":
                return entities.map((theme : any)=>{
                    return new ThemeCard(theme,buttonPressed,button,user_id)
                })
            case "Emission":
                return entities.map((emission : any)=>{
                    return new EmissionCard(emission,buttonPressed,button,user_id)
                })
            default: 
                return []
        }
    }


    return (
        <>
            <Searchbar filterData={filterData} setFilterData={setFilterData}/>
            <CardArea title={"Les "+getPruralOf(entityType) + " utilisables"} 
            emptyText={"Aucune " + entityType + " ne correspond à votre recherche"}
            cards={filteredCard} link="" draggable={false} setUsedCard={setUsedCard}/>
            <CardArea title={"Les " + getPruralOf(entityType) + " de votre " + usedIn} 
            emptyText={"Sélectionnez des "+ getPruralOf(entityType)+" pour votre "+ usedIn + " !"}
            cards={usedCard} link="" draggable={true} setUsedCard={setUsedCard}/>
        </>
    )
}