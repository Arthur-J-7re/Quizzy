import { Button } from "@mui/material";

class QuestionCard {
    private navigate;
    private question;

    constructor(question : any, navigate : any){
        this.question = question;
        this.navigate = navigate;
    }

    show(){
        return (
            <div className="questionCardContainer">
                <div className="Top">
                    <h2>{this.question.title}</h2>
                    <Button className="Modify" onClick={()=> this.navigate(this.question)}>Modifier la question</Button>
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
