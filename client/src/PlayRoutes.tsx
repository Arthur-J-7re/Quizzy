//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { useSocket } from './context/socketContext.tsx';
import { SocketProvider } from './context/socketContext.tsx'
import { useContext } from "react";
import { AuthContext } from "./context/authentContext";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import {GameHome} from './pages/Game/HomeGame/GameHomePage.tsx'
import { Test } from './pages/Game/Test/Test.tsx';
import { useEffect } from 'react';
import Room from './pages/Game/RoomPage/Room.tsx';
import RoomHub from './pages/Game/RoomPage/RoomHub.tsx';
export default function PlayRoutes (){
    const socket = useSocket();
    const auth = useContext(AuthContext);

    useEffect(()=>{
        if (socket){
            socket.emit("connectionRouter", {username : auth? auth.user?.Username : ""})
        }
    })

    return (
        <SocketProvider>
            
            <Routes>
                <Route path="/" element={<GameHome />} />
                <Route path='/test' element={<Test />} />
                <Route path='/room/:id' element={<RoomHub/>} />
            </Routes>
            
        </SocketProvider>
    )
}
