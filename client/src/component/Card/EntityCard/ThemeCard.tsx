
import "../Card.css";
import Card from "../Card";

class ThemeCard extends Card{ 
    private theme;
    private questions;

    constructor(theme : any, action : any, text : any, owner : number, couleur : string = 'Green'){
        super(theme.title,action,text,
            owner === theme.creator,theme.isPrivate,"size :"+String(theme.questions.length),couleur
        )
        this.questions= theme.questions;
        this.theme = theme;
    }

    override getId(){
        return this.theme.theme_id;
    }

    override getContent(){
        return this.theme;
    }

    getQuestions(){
        return this.questions
    }

    override match(data : any): boolean{
        const regex = new RegExp(data.searchText, "i");
        if (data.type == "any" || data.type == this.theme.mode){
            switch (data.scope){
                default:
                    return this.matchList(this.theme.tags,regex) || this.matchText(this.theme.title,regex);
                case "tags": 
                    return this.matchList(this.theme.tags, regex);
                case "statement":
                    return this.matchText(this.theme.title, regex);

            }
        }
        return false
    }
}


export default ThemeCard;
