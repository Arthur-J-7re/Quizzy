import { Button } from "@mui/material";
import { Banner } from "../component/Banner/Banner"
import { useNavigate } from "react-router-dom"
import { useContext } from "react";
import { AuthContext } from "../context/authentContext";

export function Home () {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();
    return (
    <div>
    <Banner></Banner>
    <Button onClick={()=>{(auth && auth.user) ? navigate("/create-a-question") : navigate("/login")}}>Créer une question</Button>
    
    </div> 
)
}