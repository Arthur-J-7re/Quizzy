import { useState} from 'react';
import { useNavigate } from "react-router-dom";
import { AuthContext } from '../../context/authentContext';
import { useContext } from 'react';
import Button from '@mui/material/Button';
//import GreenSwitch from '@mui/material/Switch'
import { Banner } from '../../component/Banner/Banner';
import './Login.css';
import "../CommonCss.css";
import makeRequest from '../../tools/requestScheme';

export function Login () {
    const [isLogin, setIsLogin] = useState(true);
    const checked=true;

    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [signupData, setSignupData] = useState({
        username: '', nickname: '', email: '', password: ''
    });
    
    
    const auth = useContext(AuthContext);
    
    const navigate = useNavigate();
    
    const loginUser = async () => {
        const retour = await makeRequest("/login", "POST", {loginData : loginData});
        if (retour.success){
            const data = retour.data;
            auth?.login({id : data.id, Username : data.username, currentRoom : "", token : data.token  })
            navigate("/");
        } else {
            alert(retour.message);
        }

    }
    
    const registerUser = async () => {
        const retour = await makeRequest("/register", "POST", {signupData : signupData});
        if (retour.success){
            const data = retour.data;
            auth?.login({id : data.id, Username : data.username, currentRoom : "", token : data.token  })
            navigate("/");
        } else {
            alert(retour.message);
        }
    }
    
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
                            backgroundColor:
                            isLogin ? '#1DD75E' : "#4BE782",
                            '&:hover': {
                                backgroundColor: '#1DD75E',
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
                            backgroundColor: (isLogin ?  '#4BE782' :'#1DD75E') ,
                            '&:hover':{
                                backgroundColor: '#1DD75E',
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
                                    backgroundColor: '#4BE782',
                                    color: '#fff',
                                    borderRadius: '15px',
                                    textTransform: 'none',
                                    fontSize: '16px',
                                    fontFamily: 'Open Sans, sans-serif',
                                    fontWeight: 'bold',
                                    transition: 'all 0.5s ease',
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
                                    backgroundColor: '#4BE782',
                                    color: '#fff',
                                    borderRadius: '15px',
                                    textTransform: 'none',
                                    fontSize: '16px',
                                    fontFamily: 'Open Sans, sans-serif',
                                    fontWeight: 'bold',
                                    transition: 'all 0.5s ease',
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