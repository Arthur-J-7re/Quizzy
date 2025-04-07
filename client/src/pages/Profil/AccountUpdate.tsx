import {useContext, useState, useEffect } from "react";
import { Button } from "@mui/material";
import { AuthContext } from "../../context/authentContext";
import "./profil.css"
import { Banner } from "../../component/Banner/Banner";

export function AccountUpdate(){
    const auth = useContext(AuthContext);
    const [username, setUsername] = useState("");
    const [changed, setChanged] = useState(false);
    const [id,setId] = useState("");
    
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
        if (id != ""){
            try {
                fetch("http://localhost:3000/user/updateUsername?id=" + id + "&username=" + username, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    mode: "cors"
                })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("Network response was not ok");
                    }
                    return response.json();
                })
                .then((data) => auth?.updateUser(data.username))
                .catch((error) => console.error("There was a problem with the fetch operation:", error));
            } catch(error) {
                console.error("error while updating user Information", error);
            }
        }


    }

    return (

        <div className="floatingForm">
            <Banner></Banner>
            <div className="container">
                <label>Modifiez votre Nom d'utilisateur</label>
                <div className="title">
                    <input
                        type='text'
                        id="username"
                        value={username || ''}
                        onChange={(e) => {setUsername(e.target.value ); setChanged(true)}}
                        required
                    />
                </div>
                <Button onClick={() => sendData()} disabled={!changed} className="update">Sauvegarder les modifications</Button>
            </div>
        </div>
    )
}