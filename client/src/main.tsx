//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './context/authentContext.tsx'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuestionCreationForm } from './pages/QuestionForm/QuestionCreationForm.tsx'
import {Home} from './pages/Home/Home'
import {Login} from './pages/Login/Login.tsx'
import { Profil } from './pages/Profil/Profil.tsx'
import { MyQuestions } from './pages/Library/MyQuestions.tsx'
import { MyThemes } from './pages/Library/MyThemes.tsx'
import { MyQuizzes } from './pages/Library/MyQuizzes.tsx'
import { MyEmissions } from './pages/Library/MyEmissions.tsx'
import { AccountUpdate} from './pages/Profil/AccountUpdate.tsx';
import { QuizzCreation } from './pages/QuizzForm/QuizzCreation.tsx';
import { GridQuizzCreation } from './pages/QuizzForm/GridQuizzCreation.tsx';
import { PickBanQuizzCreation } from './pages/QuizzForm/PickBanQuizzCreation.tsx';
import { TimerQuizzCreation } from './pages/QuizzForm/TimerQuizzCreation.tsx';
import { ThemeCreation } from './pages/ThemeCreation/ThemeCreation.tsx';
import PlayRoutes from './PlayRoutes.tsx'
import { EmissionCreation } from './pages/Emission/Emission.tsx';
import { QrShare } from './pages/QrShare/QrShare.tsx';
import { ErrorBoundary } from './component/ErrorBoundary/ErrorBoundary.tsx';
import { QuestionBacklog } from './pages/Admin/QuestionBacklog.tsx';
import { Messages } from './pages/Messages/Messages.tsx';
import { Dashboard } from './pages/Admin/Dashboard.tsx';
import { AdminUsers } from './pages/Admin/AdminUsers.tsx';


createRoot(document.getElementById('root')!).render(

  <ErrorBoundary>
  <AuthProvider>
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/my-questions" element={<MyQuestions />} />
        <Route path="/my-themes" element={<MyThemes />} />
        <Route path="/my-quizzes" element={<MyQuizzes />} />
        <Route path="/my-emissions" element={<MyEmissions />} />
        <Route path="/create-a-question" element={<QuestionCreationForm/>}/>
        <Route path="/modify-a-question" element={<QuestionCreationForm/>}/>
        <Route path="/modify-a-question/:question_id" element={<QuestionCreationForm/>}/>
        <Route path="/create-a-quizz" element={<QuizzCreation/>}/>
        <Route path="/modify-a-quizz" element={<QuizzCreation/>}/>
        <Route path="/modify-a-quizz/:quizz_id" element={<QuizzCreation/>}/>
        <Route path="/create-a-grid-quizz" element={<GridQuizzCreation/>}/>
        <Route path="/modify-a-grid-quizz" element={<GridQuizzCreation/>}/>
        <Route path="/modify-a-grid-quizz/:quizz_id" element={<GridQuizzCreation/>}/>
        <Route path="/create-a-pickban-quizz" element={<PickBanQuizzCreation/>}/>
        <Route path="/modify-a-pickban-quizz" element={<PickBanQuizzCreation/>}/>
        <Route path="/modify-a-pickban-quizz/:quizz_id" element={<PickBanQuizzCreation/>}/>
        <Route path="/create-a-timer-quizz" element={<TimerQuizzCreation/>}/>
        <Route path="/modify-a-timer-quizz" element={<TimerQuizzCreation/>}/>
        <Route path="/modify-a-timer-quizz/:quizz_id" element={<TimerQuizzCreation/>}/>
        <Route path="/create-a-theme" element={<ThemeCreation/>}/>
        <Route path="/modify-a-theme" element={<ThemeCreation/>}/>
        <Route path="/modify-a-theme/:theme_id" element={<ThemeCreation/>}/>
        <Route path="/create-an-emission" element={<EmissionCreation/>}/>
        <Route path="/modify-an-emission" element={<EmissionCreation/>}/>
        <Route path="/modify-an-emission/:emission_id" element={<EmissionCreation/>}/>
        <Route path="/modify-account" element={<AccountUpdate/>}/>
        <Route path="/qr-temp" element={<QrShare/>}/>
        <Route path="/admin/backlog" element={<QuestionBacklog/>}/>
        <Route path="/messages" element={<Messages/>}/>
        <Route path="/admin/dashboard" element={<Dashboard/>}/>
        <Route path="/admin/users" element={<AdminUsers/>}/>
        <Route path="/play/*" element={<PlayRoutes/>}/>
      </Routes>
    </Router>
  </AuthProvider>
  </ErrorBoundary>
  ,
)
