import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QuestionCreationForm } from './pages/QuestionCreationForm'
import {Home} from './pages/Home'
import {Login} from './pages/Login'
import "./App.css"

function App() {
  

  return (
    <div className='container'>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/create-a-question" element={<QuestionCreationForm/>}/>
        </Routes>
      </Router>
    </div>
  )
}

export default App
