import { Button } from "@mui/material";
import { Banner } from "../component/Banner/Banner"
import { useNavigate } from "react-router-dom"

export function Home () {
    const navigate = useNavigate();
    return (
    <div>
    <Banner></Banner>
    <Button onClick={()=>navigate("/create-a-question")}>Créer une question</Button>
    
    </div>
)
}