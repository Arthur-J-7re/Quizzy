//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './context/authentContext.tsx'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuestionCreationForm } from './pages/QuestionForm/QuestionCreationForm.tsx'
import {Home} from './pages/Home/Home'
import { TestRequest } from './component/TestRequest/TestRequest.tsx'
import {Login} from './pages/Login/Login.tsx' 
import { Profil } from './pages/Profil/Profil.tsx'
import { AccountUpdate} from './pages/Profil/AccountUpdate.tsx';
import { QuestionModifier } from './pages/QuestionForm/QuestionModifier.tsx';
import { QuizzCreation } from './pages/QuizzForm/QuizzCreation.tsx';
import PlayRoutes from './PlayRoutes.tsx'
import { EmissionCreation } from './pages/Emission/Emission.tsx';


createRoot(document.getElementById('root')!).render(
    
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/test" element={<TestRequest />} />
        <Route path="/create-a-question" element={<QuestionCreationForm/>}/>
        <Route path="/modify-a-question" element={<QuestionCreationForm/>}/>
        <Route path="/create-a-quizz" element={<QuizzCreation/>}/>
        <Route path="/modify-a-quizz" element={<QuizzCreation/>}/>
        <Route path="/create-an-emission" element={<EmissionCreation/>}/>
        <Route path="/modify-an-emission" element={<EmissionCreation/>}/>
        <Route path="/modify-account" element={<AccountUpdate/>}/>  
        <Route path="/play/*" element={<PlayRoutes/>}/>
      </Routes>
    </Router>
  </AuthProvider>
   
  ,
)
