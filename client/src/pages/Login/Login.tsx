import { useState} from 'react';
import { useNavigate } from "react-router-dom";
import { AuthContext } from '../../context/authentContext';
import { useContext } from 'react';
import Button from '@mui/material/Button';
import { Banner } from '../../component/Banner/Banner';
import './Login.css';
import "../CommonCss.css";
import makeRequest from '../../tools/requestScheme';

export function Login () {
    const [isLogin, setIsLogin] = useState(true);

    const [loginData, setLoginData] = useState({ username: '', password: '' });
    const [signupData, setSignupData] = useState({
        username: '', nickname: '', email: '', password: ''
    });

    const auth = useContext(AuthContext);

    const navigate = useNavigate();

    const [error, setError] = useState("");

    const submit = async (url: string, body: object) => {
        setError("");
        try {
            const retour = await makeRequest(url, "POST", body);
            const data = retour.data;
            auth?.login({id : data.id, Username : data.username, currentRoom : "", token : data.token, role : data.role});
            navigate("/");
        } catch (err) {
            // ApiError porte le message du serveur (identifiants invalides,
            // e-mail déjà pris, serveur injoignable...).
            setError(err instanceof Error ? err.message : "Une erreur est survenue.");
        }
    }

    const loginUser = () => submit("/login", {loginData : loginData});

    const registerUser = () => submit("/register", {signupData : signupData});

  return (
    <>
    <Banner></Banner>
    <div className="loginPage">
        <div className="login-container">
            <div className="loginsignup-header">
                <button
                    type="button"
                    className={isLogin ? "loginTab active" : "loginTab"}
                    onClick={() => { setIsLogin(true); setError(""); }}
                >
                    Connexion
                </button>
                <button
                    type="button"
                    className={!isLogin ? "loginTab active" : "loginTab"}
                    onClick={() => { setIsLogin(false); setError(""); }}
                >
                    Inscription
                </button>
            </div>

            {error && <div className="login-error">{error}</div>}
            {isLogin ? (
                <div className="login-form active">
                    <div className="login-input-group">
                        <label htmlFor="username-login" className="login-label">Username ou E-mail</label>
                        <input
                            type="email"
                            id="username-login"
                            className="login-input"
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
                            className="login-input"
                            value={loginData.password || ''}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div className='submit-container'>
                        <Button className="loginSubmitButton" onClick={loginUser}>
                            Connexion
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="login-form active">
                    <div className="signup-input-group">
                        <label htmlFor="username-signup" className="login-label">Username</label>
                        <input
                            type="text"
                            id="username-signup"
                            className="login-input"
                            value={signupData.username || ''}
                            onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                            required
                        />
                    </div>
                    <div className="signup-input-group">
                        <label htmlFor="email-signup" className="login-label">E-mail</label>
                        <input
                            type="email"
                            id="email-signup"
                            className="login-input"
                            value={signupData.email || ''}
                            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className="signup-input-group">
                        <label htmlFor="password-signup" className="login-label">Mot de passe</label>
                        <input
                            type="password"
                            id="password-signup"
                            className="login-input"
                            value={signupData.password || ''}
                            onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                            required
                        />
                    </div>

                    <div className='submit-container'>
                        <Button className="loginSubmitButton" onClick={registerUser}>
                            Inscription
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
