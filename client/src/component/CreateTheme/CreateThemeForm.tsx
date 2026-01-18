import GetTags from "../Tags/Tags";
import PrivateButton from "../PrivateButton/PrivateButton";
import { Button } from "@mui/material";
import { useEffect, useState } from "react";
import makeRequest from "../../tools/requestScheme";
import SelectMultipleCard from "../Card/CardArea/SelectMultipleCard";


export default function CreateThemeForm(
    {
        theme,
        setTheme,
        saveData,
        deleteTheme = null
    } : {
        theme:any,
        setTheme:any,
        saveData:Function,
        deleteTheme:Function | null
    }
) {
    console.log("le theme dans le form : ",theme);
    const [availableQuestions,setAvailableQuestions] = useState<number[]>([]);

    useEffect(()=>{
        let fun= async () => {
            try {
                const questions = await makeRequest("/question/available-questions");
                if (questions){
                    setAvailableQuestions(questions)
                }
            } catch (e){
                console.error(e);
            }
        }
        fun()
    },[])

    return (
        <>
        <div className="flex-center full-width">
            <h1>{theme.title}</h1>
            <input 
            type="text"
            value={theme.title}
            onChange={(e)=>setTheme({...theme,title: e.target.value})}
            placeholder="ex: Thème cinéma"/>

            <PrivateButton entity={theme} setEntity={setTheme} />
            {availableQuestions.length}
            <SelectMultipleCard entityType="Question" usedIn="Theme" entities={availableQuestions} usedEntities={theme.questions} setUsedEntities={(questions : number[]) => setTheme({...theme, questions})}/>
            <GetTags entity={theme} setEntity={setTheme} limit={5}/>
            <Button onClick={()=>{
                console.log("on appuie sur le bouton sauvegarde de theme",theme);
                saveData(theme)
            }}>Sauvegarder</Button>
            {
                deleteTheme != null ? <Button onClick={()=>{deleteTheme()}}>Supprimer</Button> : ""
            }
        </div>
        </>
    )
}