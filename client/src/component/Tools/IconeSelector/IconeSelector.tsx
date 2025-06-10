import { useEffect, useState } from "react";
import makeRequest from "../../../tools/requestScheme";
import { useContext } from "react";
import { AuthContext } from "../../../context/authentContext";
import { Button } from "@mui/material";
import { IconeGrid } from "./IconeGrid";




export function IconeSelector({file,setFile,canOpenGrid} : {file : string, setFile : any, canOpenGrid : boolean}) {
    const auth = useContext(AuthContext);
    const id = auth?.user?.id || 0;
    const [listOfFile, setListOfFile] = useState(["Archer", "Luffy", "Twice", "PumpkinMan"]);
    const [indice, setIndice] = useState(0);
    const [showGrid, setShowGrid] = useState(false)
    useEffect(()=>{
        const fun = async () =>{
            const newList = await makeRequest(`/icone?id=${id}`);
            setListOfFile(newList);
        }
        //fun()
    }) 
    useEffect(() => {
        if (file === ""){
            setFile(listOfFile[0] || "rien")
        }
    },[file])

    useEffect(() => {
        console.log(indice);
        setFile(listOfFile[indice]);
        console.log(listOfFile[indice],indice)
    }, [indice])

    const changeIcone = (sens : number) => {
        if (sens > 0){
            let newIndice = (indice + sens)%listOfFile.length;
            setIndice(newIndice);    
        } else {
            let newIndice = indice + sens;
            if (newIndice < 0){
                newIndice = listOfFile.length+newIndice
            }
            setIndice(newIndice)
        }
        
    }
    console.log("the file : ",listOfFile)
    const getPath = () => {
        console.log(`/Image/GameIcone/${file}.png`);
        return (`/Image/GameIcone/${file}.png`)
    }
    
    return(
    <div>
    {showGrid ? 
    
    <IconeGrid list={listOfFile} close={setShowGrid} setIndex={setIndice}/>:
    
    <div>
        <Button onClick={() => changeIcone(-1)}> {"<"} </Button>
        { canOpenGrid ? 
            <img src={getPath()} alt={file} onClick={() => {setShowGrid(true)}}></img> :
            <img src={getPath()} alt={file}></img>}
        <Button onClick={() => changeIcone(1)}> {">"} </Button>
    </div>
    }
    </div>)
}