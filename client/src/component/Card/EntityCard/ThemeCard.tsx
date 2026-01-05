
import "../Card.css";
import Card from "../Card";

class ThemeCard {
    private theme;
    private owner : number;
    private showing : boolean = false;
    private Card : Card;

    constructor(theme : any, action : any, text : any, owner : number, couleur : string = 'Green'){
        let question : number[] = theme.questions;
        this.theme = theme;
        this.owner = owner;
        this.Card = new Card(theme.title, theme,action,text,
            this.owner === theme.creator,theme.isPrivate,"size :"+String(question.length)
        )
    }

    getId(){
        return this.theme.theme_id;
    }

    getContent(){
        return this.theme;
    }

    isShowing(){
        return this.showing;
    }

    matchTags(text: string): boolean {
        if (text.length > 0) {
            const regex = new RegExp(text, "i"); // "i" pour ignorer la casse
    
            return this.theme.tags.some((element: string) => regex.test(element));
        } 
    
        return true;
    }

    matchAnswers(regex : RegExp): boolean{
        switch (this.theme.mode){
            case "QCM":
                return this.matchArrayAnswer(this.theme.choices,regex);
            case "DCC":
                return this.matchListAnswer(this.theme.cash,regex) || 
                this.matchArrayAnswer(this.theme.carre,regex);
            case "FREE":
                return this.matchListAnswer(this.theme.answers,regex);
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
    
            return regex.test(this.theme.title) || this.matchAnswers(regex);
        } 
        return true;
    }

    match(data : any): boolean{
        if (data.themeType == "any" || data.themeType == this.theme.mode){
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


export default ThemeCard;
