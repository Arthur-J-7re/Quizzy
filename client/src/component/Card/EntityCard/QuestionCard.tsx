
import "../Card.css";
import Card from "../Card";

class QuestionCard {
    private question;
    private owner : number;
    private showing : boolean = false;
    private Card : Card;

    constructor(question : any, action : any, text : any, owner : number, couleur : string = 'Green'){
        this.question = question;
        this.owner = owner;
        this.Card = new Card(question.title, question,action,text,
            this.owner === question.creator,question.private,question.mode
        )
    }

    getId(){
        return this.question.question_id;
    }

    getContent(){
        return this.question;
    }

    setButtonText(message : any){
        this.Card.setButtonText(message);
    }

    setColor(couleur : String){
        this.Card.setColor(couleur);
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
        if (!this.owner === this.question.creator){
            console.log(this.question.title);
        } else {
            console.log(this.owner);
        }
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
            this.Card.show()
        )
    }
}


export default QuestionCard;
