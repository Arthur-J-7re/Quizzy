
import "../Card.css";
import Card from "../Card";

class EmissionCard {
    private emission;
    private owner : number;
    private showing : boolean = false;
    private Card : Card;

    constructor(emission : any, action : any, text : any, owner : number, couleur : string = 'Green'){
        this.emission = emission;
        this.owner = owner;
        this.Card = new Card(emission.title, emission,action,text,
            this.owner === emission.creator,emission.isPrivate,"size :"+emission.steps.length    
        )
    }

    getId(){
        return this.emission.emission_id;
    }

    getContent(){
        return this.emission;
    }

    isShowing(){
        return this.showing;
    }

    matchTags(text: string): boolean {
        if (text.length > 0) {
            const regex = new RegExp(text, "i"); // "i" pour ignorer la casse
    
            return this.emission.tags.some((element: string) => regex.test(element));
        } 
    
        return true;
    }

    matchAnswers(regex : RegExp): boolean{
        switch (this.emission.mode){
            case "QCM":
                return this.matchArrayAnswer(this.emission.choices,regex);
            case "DCC":
                return this.matchListAnswer(this.emission.cash,regex) || 
                this.matchArrayAnswer(this.emission.carre,regex);
            case "FREE":
                return this.matchListAnswer(this.emission.answers,regex);
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
    
            return regex.test(this.emission.title) || this.matchAnswers(regex);
        } 
        return true;
    }

    match(data : any): boolean{
        if (data.emissionType == "any" || data.emissionType == this.emission.mode){
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


export default EmissionCard;
