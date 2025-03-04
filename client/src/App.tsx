import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuestionCreationForm } from './pages/QuestionForm/QuestionCreationForm'
import {Home} from './pages/Home/Home'
import { Profil } from './pages/Profil/Profil';
import {Login} from './pages/Login/Login'
import { QuestionModifier } from './pages/QuestionForm/QuestionModifier';
import "./App.css"

function App() {
  

  return (
    <div className='container'>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profile" element={<Profil />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-a-question" element={<QuestionCreationForm/>}/>
          <Route path="/modify-a-question" element={<QuestionModifier/>}/>
        </Routes>
      </Router>
    </div>
  )
}

export default App
