import { useState, useEffect, useRef} from 'react';
import { useNavigate } from "react-router-dom";
import { useSocket } from '../context/socketContext';
import { Socket } from 'socket.io-client';
import Button from '@mui/material/Button';
//import GreenSwitch from '@mui/material/Switch'
import { Banner } from '../component/Banner/Banner';
import './Login.css';

export function Login () {
    const [isLogin, setIsLogin] = useState(true);
    const [checked, setChecked] = useState(true);

    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [signupData, setSignupData] = useState({
        username: '', nickname: '', email: '', password: ''
    });
    
    
    const socketRef = useRef<Socket | null>(null);
    const socket = useSocket();
    
    const navigate = useNavigate();
    
    const loginUser = async () => {
        if (socket){
        socket.emit("login", loginData);
        }
    }
    
    const registerUser = async () => {
        if (socket){
            socket.emit("register", signupData);
        }
    }
    
    /*const handleChange = (event : any) => {
        setChecked(event.target.checked);
        isLogin 
        ? setLoginData({ ...loginData, checked: event.target.checked }) 
        : setSignupData({ ...signupData, checked: event.target.checked })
    };*/
    // Référence pour garder l'instance du socket
    
    useEffect(() => {
        
    
        
        if (socket){
            socket.on("alert", (message) =>{
                alert(message);
            });

            socket.on("success", () =>{
                //localStorage.setItem("authToken", data.token);
                navigate("/");
            });

            socket.on("connect_error", (err) => {
                console.error("Erreur de connexion socket :", err.message);
              });
        }


           
          
        
    
        // Nettoyage : Déconnexion du socket lors du démontage du composant
        return () => {
          if (socketRef.current) {
            socketRef.current.disconnect();
            console.log("Utilisateur déconnecté !");
          }
        };
      }, [socket]); // L'initialisation du socket se fait une seule fois lors du montage
  return (
    <>
    <Banner></Banner>
    <div className= {checked ? 'container' : 'containerNight'}> 
        <div className={checked ? "login-container" : "login-containerNight"}>
            <div className="loginsignup-header" >
                    <Button
                        variant='contained'
                        onClick={() => setIsLogin(true)}
                        size='small'
                        sx={{
                            transition: 'all 0.2s ease',
                            borderRadius: '15px',
                            color: '#fff',
                            textTransform: 'none',
                            fontSize: '16px',
                            fontFamily: 'Open_sans, sans-serif',
                            fontWeight: isLogin ? 'bold' : 'regular',
                            backgroundColor:checked 
                            ? (isLogin ? '#4CAF50' : "#64e33d") 
                            : (isLogin ? '#E056B3' : '#FC6EDA'),
                            '&:hover': checked ? {
                                backgroundColor: '#4caf50',
                            } : {
                                backgroundColor: '#e056b3',
                            }
                            
                        }}>
                        Login
                    </Button>
                    {/*<GreenSwitch
                    checked={checked}
                    onChange={handleChange}
                    inputProps={{ 'aria-label': 'controlled' }}
                    />*/}
                    <Button
                        variant='contained'
                        onClick={() => setIsLogin(false)}
                        size='small'
                        sx={{
                            borderRadius: '15px',
                            color: '#fff',
                            transition: 'all 0.2s ease',
                            textTransform: 'none',
                            fontSize: '16px',
                            fontFamily: 'Open_sans, sans-serif',
                            fontWeight: isLogin ? 'regular' : 'bold',
                            backgroundColor:checked 
                            ? (isLogin ?  '#64e33d' :'#4CAF50') 
                            : (isLogin ?  '#FC6EDA' : "#E056B3"),
                            '&:hover': checked ? {
                                backgroundColor: '#4CAF50',
                            } : {
                                backgroundColor: '#E056B3',
                            }
                        }}>
                        Sign Up
                    </Button>
                </div>




                {isLogin ? (
                    <div className={`login-form ${isLogin ? 'active' : ''}`}>
                        <div className="login-input-group">
                            <label htmlFor="email-login" className="login-label">Username ou E-mail</label>
                            <input
                                type="email"
                                id="email-login"
                                className={checked ? 'login-input greenBorder' : 'login-input pinkBorder'}
                                value={loginData.username || ''}
                                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                                required
                            />
                        </div>

                        <div className="login-input-group">
                            <label htmlFor="password-login" className="login-label">Mot de passe</label>
                            <input
                                type="password"
                                id="password-login"
                                className={checked ? 'login-input greenBorder' : 'login-input pinkBorder'}
                                value={loginData.password || ''}
                                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                                required
                            /> 
                            
                        </div>

                        <div className='submit-container'>
                            <Button
                                variant='contained'
                                onClick={loginUser}
                                sx={{
                                    height: '45px',
                                    width: '120px',
                                    backgroundColor: '#2E3A59',
                                    color: '#fff',
                                    borderRadius: '15px',
                                    textTransform: 'none',
                                    fontSize: '16px',
                                    fontFamily: 'Open Sans, sans-serif',
                                    fontWeight: 'bold',
                                    transition: 'all 0.5s ease',
                                    '&:hover': {
                                        backgroundColor:checked ? '#64e33d' : '#FC6EDA',
                                        boxShadow:checked ? '' : '0 0 15px 5px rgba(252, 110, 218, 0.6)',
                                    }
                                }}>
                                Login
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className={`login-form ${!isLogin ? 'active' : ''}`}>
                        
                        
                        <div className="signup-input-group">
                            <label htmlFor="email-login" className="login-label">Username </label>
                            <input
                                type="text"
                                id="email-login"
                                className={checked ? 'login-input greenBorder' : 'login-input pinkBorder'}
                                value={signupData.username || ''}
                                onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                                required
                            />
                        </div>
                        {/*<div className='signup-input-group'>
                            <label htmlFor="surname-signup" className='sign-label'>Nickname</label>
                            <input
                                type='text'
                                id="surname-signup"
                                className={checked ? 'sign-input greenBorder' : 'sign-input pinkBorder'}
                                value={signupData.nickname || ''}
                                onChange={(e) => setSignupData({ ...signupData, nickname: e.target.value })}
                                required
                            />
                        </div>*/}
                        <div className="signup-input-group">
                            <label htmlFor="email-login" className="login-label"> E-mail</label>
                            <input
                                type="email"
                                id="email-login"
                                className={checked ? 'login-input greenBorder' : 'login-input pinkBorder'}
                                value={signupData.email || ''}
                                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                                required
                            />
                        </div>

                        <div className="signup-input-group">
                            <label htmlFor="password-login" className="login-label">Mot de passe</label>
                            <input
                                type="password"
                                id="password-login"
                                className={checked ? 'login-input greenBorder' : 'login-input pinkBorder'}
                                value={signupData.password || ''}
                                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                                required
                            /> 
                            
                        </div>
                        
                        
                        

                        <div className='submit-container'>
                            <Button variant='contained'
                                onClick={registerUser}
                                sx={{
                                    height: '45px',
                                    width: '120px',
                                    backgroundColor: '#2E3A59',
                                    color: '#fff',
                                    borderRadius: '15px',
                                    textTransform: 'none',
                                    fontSize: '16px',
                                    fontFamily: 'Open Sans, sans-serif',
                                    fontWeight: 'bold',
                                    transition: 'all 0.5s ease',
                                    '&:hover': {
                                        backgroundColor: checked ? '#64e33d' : '#FC6EDA',
                                        
                                    }
                                }}>
                                Sign Up
                            </Button>
                        </div>
                    </div>
                )}





        
        </div>
    </div>
    </>
  )
};




export default Login;