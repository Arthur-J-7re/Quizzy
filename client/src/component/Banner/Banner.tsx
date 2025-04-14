import Button from '@mui/material/Button';
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext"; 
import logo from "../../assets/Image/logo/logoV1.png"
import './Banner.css'
import ProfileMenu from '../ProfilMenu/ProfilMenu';
import CreateMenu from '../CreateMenu/CreateMenu';



export function Banner () {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    /*if (auth){
        const { user, login, logout } = auth;
    }*/
    return (
        <div className='bannerContainer'>
            <div>
                <img className='logoBanner' src={logo} alt="logo Quizzi" onClick={() => navigate("/") }></img>
            </div>
            <div className='menuButtonContainer'>
                <CreateMenu/>
                {(auth && auth.user) ?  <ProfileMenu /> : <Button className="Connexion" onClick={() => navigate("/login")}> Se connecter</Button>}
            </div>
        </div>
    )
}