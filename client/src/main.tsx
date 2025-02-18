import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SocketProvider } from './context/socketContext.tsx'
import { AuthProvider } from './context/authentContext.tsx'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuestionCreationForm } from './pages/QuestionCreationForm'
import {Home} from './pages/Home'
import {Login} from './pages/Login' 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SocketProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/create-a-question" element={<QuestionCreationForm/>}/>
          </Routes>
        </Router>
      </AuthProvider>
    </SocketProvider>
  </StrictMode>,
)
