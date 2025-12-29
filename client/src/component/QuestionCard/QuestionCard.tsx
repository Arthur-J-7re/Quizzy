import { Button } from "@mui/material";
import {Https, Public} from "@mui/icons-material"
import "./QuestionCard.css";

class QuestionCard {
    private buttonAction;
    private question;
    private buttonText :any;
    private couleur : String;
    private owner : number;
    private showing : boolean = false;

    constructor(question : any, action : any, text : any, owner : number, couleur : string = 'Green'){
        this.question = question;
        this.buttonAction = action;
        this.buttonText = text;
        this.couleur = couleur;
        this.owner = owner;
    }

    getId(){
        return this.question.question_id;
    }

    getContent(){
        return this.question;
    }

    setButtonText(message : any){
        this.buttonText = message;
    }

    setColor(couleur : String){
        this.couleur = couleur;
    }

    isShowing(){
        return this.showing;
    }

    matchTags(text: string): boolean {
        if (text.length > 0) {
            const regex = new RegExp(text, "i"); // "i" pour ignorer la casse
    
            return this.question.tags.some((element: string) => regex.test(element));
        } 
    
        return true;
    }

    matchAnswers(regex : RegExp): boolean{
        switch (this.question.mode){
            case "QCM":
                return this.matchArrayAnswer(this.question.choices,regex);
            case "DCC":
                return this.matchListAnswer(this.question.cash,regex) || 
                this.matchArrayAnswer(this.question.carre,regex);
            case "FREE":
                return this.matchListAnswer(this.question.answers,regex);
            default:
                return false;
        }
    }

    matchListAnswer(list : string[], regex : RegExp): boolean{
        return list.some((element: string) => regex.test(element));
    }

    matchArrayAnswer(array : Object, regex : RegExp): boolean{
        let list : string[] = Object.values(array);
        return this.matchListAnswer(list,regex)
    }

    matchText(text: string): boolean {
        if (text.length > 0) {
            const regex = new RegExp(text, "i"); // "i" pour ignorer la casse
    
            return regex.test(this.question.title) || this.matchAnswers(regex);
        } 
        return true;
    }

    match(data : any): boolean{
        if (data.questionType == "any" || data.questionType == this.question.mode){
            switch (data.scope){
                default:
                    return this.matchTags(data.searchText) || this.matchText(data.searchText);
                case "tags": 
                    return this.matchTags(data.searchText);
                case "statement":
                    return this.matchText(data.searchText);

            }
        }
        return false
    }

    tronced(str : String, length : number = 35){
        if (str){
            if (str.length < length){
                return str;
            } 
            return str.slice(0, length) + "...";
        } 
        return ""
    }


    show(){
        return (
            <div onClick={() => {this.showing = !this.showing}} className={(Number(this.question.author) === this.owner || Number(this.question.creator) === this.owner) ? "questionCardContainer owned"  : "questionCardContainer notOwned"  }>
                <div className="top">
                    <h2>{this.tronced(this.question.title || "")}</h2>
                    <Button className={"modify " + this.couleur} onClick={()=> this.buttonAction(this)}>{this.buttonText}</Button>
                    
                </div>
                <div className="bottom">
                    <div className="mode"><h3>{this.question.mode || ""}</h3></div>
                    <div className="mode"><h3>{this.question.tags.length || ""}</h3></div>
                    <div className="privateiIcon">{this.question.private ? <Https className="privateIcon"/> : <Public className="privateIcon"/>}</div>
                </div>
            </div>
        )
    }
}


export default QuestionCard;
