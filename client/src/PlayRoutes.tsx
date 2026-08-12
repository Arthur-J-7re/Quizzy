import './index.css'
import { useSocket } from './context/socketContext.tsx';
import { SocketProvider } from './context/socketContext.tsx'
import { UsernameProvider } from './context/usernameContext.tsx';
import { useContext, useEffect } from "react";
import { AuthContext } from "./context/authentContext";

import { Routes, Route } from "react-router-dom";
import {GameHome} from './pages/Game/HomeGame/GameHomePage.tsx'
import { Test } from './pages/Game/Test/Test.tsx';
import RoomHub from './pages/Game/RoomPage/RoomHub.tsx';
import { Joiner } from './pages/Game/HomeGame/Joiner.tsx';
import ShowPage from './pages/Show/ShowPage.tsx';
export default function PlayRoutes (){
    return (
        <SocketProvider>
            <UsernameProvider>
                <PlayRoutesContent />
            </UsernameProvider>
        </SocketProvider>
    )
}

function PlayRoutesContent (){
    const socket = useSocket();
    const auth = useContext(AuthContext);

    useEffect(()=>{
        if (socket){
            socket.emit("connectionRouter", {username : auth? auth.user?.Username : ""})
        }
    }, [socket, auth])

    return (
        <Routes>
            <Route path="/" element={<GameHome />} />
            <Route path='/test' element={<Test />} />
            <Route path='/room/:room_id' element={<RoomHub/>} />
            <Route path='/join' element={<Joiner/>}/>
            <Route path='/show/:room_id' element={<ShowPage/>}/>
        </Routes>
    )
}
