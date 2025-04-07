//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SocketProvider } from './context/socketContext.tsx'
import { AuthProvider } from './context/authentContext.tsx'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuestionCreationForm } from './pages/QuestionForm/QuestionCreationForm.tsx'
import {Home} from './pages/Home/Home'
import {Login} from './pages/Login/Login.tsx' 
import { Profil } from './pages/Profil/Profil.tsx'
import { AccountUpdate} from './pages/Profil/AccountUpdate.tsx';
import { QuestionModifier } from './pages/QuestionForm/QuestionModifier.tsx';
import { QuizzCreation } from './pages/QuizzForm/QuizzCreation.tsx';


createRoot(document.getElementById('root')!).render(
    <SocketProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/profil" element={<Profil />} />
            {/*<Route path="/create-a-question" element={<QuestionCreationForm/>}/>*/}
            <Route path="/create-a-question" element={<QuestionModifier/>}/>
            <Route path="/create-a-quizz" element={<QuizzCreation/>}/>
            <Route path="/modify-a-quizz" element={<QuizzCreation/>}/>
            <Route path="/Modify-a-question" element={<QuestionModifier/>}/>
            <Route path="/modify-account" element={<AccountUpdate/>}/>
            
          </Routes>
        </Router>
      </AuthProvider>
    </SocketProvider>
  ,
)
