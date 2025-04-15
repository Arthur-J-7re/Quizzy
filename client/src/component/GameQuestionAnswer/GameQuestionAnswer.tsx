import { Button } from "@mui/material";
import { useState, useEffect } from "react";
import "./GameQuestionAnswer.css"


export default function GameQuestionAnswer( { question, socket }: { question: any, socket: any }) {
    console.log(question);
    const [carre, setCarre] = useState(question? question.choices : {ans1 : "", ans2 : "", ans3 : "", ans4 : ""});
    const [title, setTitle] = useState(question.title);
    const [selectedAns, setSelectedAns] = useState(0);
    const sendAnswer = () =>{
        socket.emit("answerToQcm", {answer : selectedAns});
    }



    return (
        <div className="answerQcmContainer">
            <div className="answerQcmCarreArea">
                <div className='gameAnswerQcm' onClick={() => {setSelectedAns(1)}}> 
                    {carre.ans1}
                </div>
                <div className='gameAnswerQcm' onClick={() => {setSelectedAns(2)}}> 
                    {carre.ans2}
                </div>
                <div className='gameAnswerQcm' onClick={() => {setSelectedAns(3)}}> 
                    {carre.ans3}
                </div>
                <div className='gameAnswerQcm' onClick={() => {setSelectedAns(4)}}> 
                    {carre.ans4}
                </div>
            </div>
            <div>{selectedAns}</div>
            <Button className="buttonSendAnswer"onClick={()=>sendAnswer()}>Valider votre réponse</Button>
        </div>
    )
}