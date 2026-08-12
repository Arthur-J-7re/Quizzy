import {useContext, useState, useEffect } from "react";
import { Button } from "@mui/material";
import { AuthContext } from "../../context/authentContext";
import "./profil.css"
import { Banner } from "../../component/Banner/Banner";
import  makeRequest  from "../../tools/requestScheme";

export function AccountUpdate(){
    const auth = useContext(AuthContext);
    const [username, setUsername] = useState("");
    const [changed, setChanged] = useState(false);
    const [error, setError] = useState("");
    const [id,setId] = useState<number | null>(null);
    
    useEffect(() => {
        if (auth?.user?.Username) {
            setUsername(auth?.user?.Username);
        }
    }, [auth?.user?.Username]);

    useEffect(() => {
        if (auth?.user?.id){
            setId(auth?.user?.id);
        }
    }, [auth?.user?.id]);

    const sendData = async () => {
        if (username.trim() == ""){
            return;
        }
        setChanged(false);
        setError("");
        if (id !== null){
            try {
                // L'id n'est plus envoyé : le serveur le déduit du token.
                const response = await makeRequest("/user/updateUsername", "PUT", {username : username});
                auth?.updateUser(response.username)
            } catch(err) {
                setError(err instanceof Error ? err.message : "La modification a échoué.");
            }
        }


    }

    return (

        <div className="floatingForm">
            <Banner></Banner>
            <div className="accountUpdateContent">
                <label>Modifiez votre Nom d'utilisateur</label>
                <div className="accountUpdateTitle">
                    <input
                        type='text'
                        id="username"
                        value={username || ''}
                        onChange={(e) => {setUsername(e.target.value ); setChanged(true)}}
                        required
                    />
                </div>
                {error && <div className="login-error">{error}</div>}
                <Button onClick={() => sendData()} disabled={!changed} className="update">Sauvegarder les modifications</Button>
            </div>
        </div>
    )
}