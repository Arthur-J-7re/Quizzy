//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SocketProvider } from './context/socketContext.tsx'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import {Home} from './pages/Home/Home'

export default function PlayRoutes (){

    return (
        <SocketProvider>
            
            <Routes>
                <Route path="/" element={<Home />} />
            </Routes>
            
        </SocketProvider>
    )
}
