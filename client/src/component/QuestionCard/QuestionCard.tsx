import { Button } from "@mui/material";

class QuestionCard {
    private buttonAction;
    private question;
    private buttonText;

    constructor(question : any, action : any, text : string){
        this.question = question;
        this.buttonAction = action;
        this.buttonText = text;
    }

    getId(){
        return this.question.question_id;
    }

    getQuestion(){
        return this.question;
    }

    setButtonText(message : string){
        this.buttonText = message;
    }

    show(){
        return (
            <div className="questionCardContainer">
                <div className="Top">
                    <h2>{this.question.title}</h2>
                    <Button className="Modify" onClick={()=> this.buttonAction(this)}>{this.buttonText}</Button>
                </div>
                <div className="Bottom">
                    <div className="mode"><h3>{this.question.mode}</h3></div>
                    <div className="private"><h3>{this.question.private ? "Private" : "Publique"}</h3></div>
                </div>
            </div>
        )
    }
}


export default QuestionCard;
