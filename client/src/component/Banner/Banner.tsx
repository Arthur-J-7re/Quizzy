import Button from '@mui/material/Button';
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext";
import logo from "../../assets/Image/logo/logoV1.png"
import './Banner.css'


export function Banner () {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    /*if (auth){
        const { user, login, logout } = auth;
    }*/
    return (
        <div className='bannerContainer'>
            <img className='logoBanner' src={logo} alt="logo Quizzi" onClick={() => navigate("/") }></img>
            <Button className='Connexion' onClick={() => navigate("/login")}> Se connecter</Button>
        </div>
    )
}