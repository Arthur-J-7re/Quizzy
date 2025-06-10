import { Button } from "@mui/material"

export function IconeGrid ({list, close, setIndex} : {list : any, close : any, setIndex : any}) {
    const getPath = (file : string) => {
        console.log(`/Image/GameIcone/${file}.png`);
        return (`/Image/GameIcone/${file}.png`)
    }
    
    let ind = 0;
    return (
        <div>
            <Button onClick={() => {close(false)}}>X</Button>
            <div>
                {list.map((file : string) => {
                    const thisind = ind;
                    ind = ind+1;
                    return (<img src={getPath(file)} alt={file} onClick={() => {console.log("on set l'index", thisind);setIndex(thisind); close(false)}}></img>)
                })}
                    
            </div>
        </div>
        
    )
}