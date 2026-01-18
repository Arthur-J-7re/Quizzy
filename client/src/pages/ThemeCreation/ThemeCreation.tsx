import { useNavigate, useLocation } from "react-router-dom"
import { useEffect, useState, useRef, useCallback } from "react";
import makeRequest from "../../tools/requestScheme";
import CreateThemeForm from "../../component/CreateTheme/CreateThemeForm"

export function ThemeCreation () {
    const navigate = useNavigate();
    const location = useLocation();
    const isModifying = location.pathname === "/modify-a-theme";
    const existingTheme = (isModifying && location.state?.theme) ? location.state?.theme : null;

    useEffect(() => {
        if (existingTheme === null) {
            navigate("/create-a-theme")
        }
    }, [existingTheme])

    const [theme, setTheme] = useState(
        {
        theme_id: existingTheme ? existingTheme.theme_id : "",
        title:existingTheme ? existingTheme.title : "",
        private: existingTheme ? existingTheme.private : false,
        imgOrString: existingTheme ? existingTheme.imgOrString : false,
        img :existingTheme ? existingTheme.img : "",
        questions :existingTheme ? existingTheme.questions : [],
        tags: existingTheme ? existingTheme.tags : []
    })

    const saveData = useCallback(async (newTheme : any) => {
        console.log("ça save le theme", theme, newTheme)
        return isModifying ?
        await updateTheme(newTheme):
        await createTheme(newTheme)
    },[]);

    const createTheme = async (newTheme : any) => {
        console.log("ça create");
        return await makeRequest("/theme/create", "POST", newTheme)
    }

    const updateTheme = async (newTheme : any) => {
        console.log("ça update", newTheme);
        return await makeRequest("/theme/update", "PUT", newTheme)
    }

    const deleteTheme = useCallback(async () => {
        if (existingTheme && existingTheme.theme_id){
            return await makeRequest("/theme/delete", "DELETE", {theme_id : existingTheme.theme_id})
        }
    },[]);

    useEffect(()=>{
        console.log("useEffect du theme :", theme.questions,theme)
    },[theme])

    return (
        <CreateThemeForm theme={theme} setTheme={setTheme} saveData={saveData} deleteTheme={existingTheme ? deleteTheme : null}/>
    )
}