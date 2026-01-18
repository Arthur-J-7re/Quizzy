
import "../Card.css";
import Card from "../Card";

class EmissionCard extends Card{
    private emission;

    constructor(emission : any, action : any, text : any, owner : number, couleur : string = 'Green'){
        super(emission.title,action,text,owner === emission.creator,
            emission.isPrivate,"size :"+emission.steps.length ,couleur   
        )
        this.emission = emission;
    }

    override getId(){
        return this.emission.emission_id;
    }

    override getContent(){
        return this.emission;
    }

    override match(data : any): boolean{
        const regex = new RegExp(data.searchText, "i");
        if (data.type == "any" || data.type == this.emission.mode){
            switch (data.scope){
                default:
                    return this.matchList(this.emission.tags,regex) || this.matchText(this.emission.title, regex);
                case "tags": 
                    return this.matchList(this.emission.tags, regex);
                case "statement":
                    return this.matchText(this.emission.title, regex);

            }
        }
        return false
    }
}


export default EmissionCard;
