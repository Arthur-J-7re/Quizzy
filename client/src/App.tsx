import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuestionCreationForm } from './pages/QuestionCreationForm'
import {Home} from './pages/Home'
import { Profil } from './pages/Profil';
import {Login} from './pages/Login'
import { QuestionModifier } from './pages/QuestionModifier';
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
