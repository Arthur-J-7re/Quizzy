
import "../Card.css";
import Card from "../Card";

class QuizzCard extends Card{
    private quizz;

    constructor(quizz : any, action : any, text : any, owner : number, couleur : string = 'Green'){
        super(quizz.title,action,text,
            owner === quizz.creator,
            quizz.private,quizz.mode,couleur
        )
        this.quizz = quizz;
    }

    override getId(){
        return this.quizz.quizz_id
    }

    override getContent(){
        return this.quizz
    }

    override match(data : any): boolean{
        const regex = new RegExp(data.searchText, "i");
        if (data.type == "any" || data.type == this.quizz.mode){
            switch (data.scope){
                default:
                    return this.matchList(this.quizz.tags,regex) || this.matchText(this.quizz.title,regex);
                case "tags": 
                    return this.matchList(this.quizz.tags,regex);
                case "statement":
                    return this.matchText(this.quizz.title, regex);

            }
        }
        return false
    }
}


export default QuizzCard;
