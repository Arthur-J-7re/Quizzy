//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SocketProvider } from './context/socketContext.tsx'
import { AuthProvider } from './context/authentContext.tsx'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuestionCreationForm } from './pages/QuestionCreationForm'
import {Home} from './pages/Home'
import {Login} from './pages/Login' 
import { Profil } from './pages/Profil.tsx'
import { QuestionModifier } from './pages/QuestionModifier.tsx';
import { QuizzCreation } from './pages/QuizzCreation.tsx';

createRoot(document.getElementById('root')!).render(
    <SocketProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profil" element={<Profil />} />
            <Route path="/create-a-question" element={<QuestionCreationForm/>}/>
            <Route path="/create-a-quizz" element={<QuizzCreation/>}/>
            <Route path="/Modify-a-question" element={<QuestionModifier/>}/>
          </Routes>
        </Router>
      </AuthProvider>
    </SocketProvider>
  ,
)
