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

    return (
        <div className='bannerContainer'>
            <div className='logoSection' onClick={() => navigate("/")}>
                <img className='logoBanner' src={logo} alt="logo Quizzi" />
                {/*<span className='brandName'>QUIZZY</span>*/}
            </div>
            <div className='menuButtonContainer'>
                <CreateMenu/>
                {(auth && auth.user) ? (
                    <ProfileMenu />
                ) : (
                    <Button 
                        variant="contained" 
                        className="connexionButton" 
                        onClick={() => navigate("/login")}
                    >
                        Se connecter
                    </Button>
                )}
            </div>
        </div>
    )
}