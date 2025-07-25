import Button from '@mui/material/Button';
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/authentContext"; 
import logo from "../../assets/Image/logo/logoV1.png"
import './Banner.css'
import ProfileMenu from '../ProfilMenu/ProfilMenu';



export function Banner () {
    const auth = useContext(AuthContext);
    const navigate = useNavigate();

    return (
        <div className='bannerContainer'>
            <div>
                <img className='logoBanner' src={logo} alt="logo Quizzi" onClick={() => navigate("/") }></img>
            </div>
            <div className='menuButtonContainer'>
                {(auth && auth.user) ?  <ProfileMenu /> : <Button className="Connexion" onClick={() => navigate("/login")}> Se connecter</Button>}
            </div>
        </div>
    )
}