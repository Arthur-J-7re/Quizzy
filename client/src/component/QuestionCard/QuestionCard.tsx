import { Button } from "@mui/material";
import {Https, Public, ExpandLess, ExpandMore} from "@mui/icons-material"
import "./QuestionCard.css";

class QuestionCard {
    private buttonAction;
    private question;
    private buttonText;
    private couleur : String;
    private owner : number;
    private showing : boolean = false;

    constructor(question : any, action : any, text : any, owner : number){
        this.question = question;
        this.buttonAction = action;
        this.buttonText = text;
        this.couleur = "Green";
        this.owner = owner;
    }

    getId(){
        return this.question.question_id;
    }

    getQuestion(){
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

    tronced(str : String, length : number = 35){
        if (str){
            if (str.length < length){
                return str;
            } 
            return str.slice(0, length) + "...";
        } 
        return ""
    }

    showLess(){
        return (
            <div onClick={() => {this.showing = !this.showing}} className={(Number(this.question.author) === this.owner ) ? "questionCardContainer owned" : "questionCardContainer notOwned" }>
                <div className="top">
                    <h2>{this.tronced(this.question.title)}</h2>
                    <div className="mode"><h3>{this.question.mode}</h3></div>
                    <Button className={"modify " + this.couleur} onClick={()=> this.buttonAction(this)}>{this.buttonText}</Button>
                    <Button className="Expande" onClick={()=> this.showing = true}><ExpandMore/></Button>
                </div>
            </div>
        )
    }

    show(){
        return (
            <div onClick={() => {this.showing = !this.showing}} className={(Number(this.question.author) === this.owner ) ? "questionCardContainer owned" : "questionCardContainer notOwned" }>
                <div className="top">
                    <h2>{this.tronced(this.question.title)}</h2>
                    <Button className={"modify " + this.couleur} onClick={()=> this.buttonAction(this)}>{this.buttonText}</Button>
                    {/*<Button className="Expande" onClick={()=> this.showing = false}><ExpandLess/></Button>*/}
                </div>
                <div className="bottom">
                    <div className="mode"><h3>{this.question.mode}</h3></div>
                    <div className="private">{this.question.private ? <Https/> : <Public/>}</div>
                </div>
            </div>
        )
    }
}


export default QuestionCard;
