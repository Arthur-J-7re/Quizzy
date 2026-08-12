
import "../Card.css";
import Card from "../Card";
import { getQuestionModeLabel } from "../../../tools/text/text";

class QuestionCard extends Card {
    private question;

    constructor(question : any, action : any, owner : number, selected : boolean = false, href? : string, draggableEnabled : boolean = false){
        super(question.title, action,
            owner === question.creator, question.private, getQuestionModeLabel(question.mode), question.mode, selected, href, draggableEnabled
        )
        this.question = question;
    }

    override getId(){
        return this.question.question_id;
    }

    override getContent(){
        return this.question;
    }

    matchAnswers(regex : RegExp): boolean{
        switch (this.question.mode){
            case "QCM":
                return this.matchArray(this.question.choices,regex);
            case "DCC":
                return this.matchList(this.question.cash,regex) || 
                this.matchArray(this.question.carre,regex);
            case "FREE":
                return this.matchList(this.question.answers,regex);
            default:
                return false;
        }
    }

    override match(data : any): boolean{
        const regex = new RegExp(data.searchText, "i");
        if (data.type == "all" || data.type == this.question.mode){
            switch (data.scope){
                default:
                    return this.matchList(this.question.tags, regex) || this.matchText(this.question.title, regex);
                case "tags": 
                    return this.matchList(this.question.tags, regex);
                case "statement":
                    return this.matchText(this.question.title, regex);

            }
        }
        return false
    }
}


export default QuestionCard;
