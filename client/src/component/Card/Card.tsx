import { Button } from "@mui/material";
import {Https, Public} from "@mui/icons-material"
import "./Card.css";

class Card {
    private buttonAction;
    private title;
    private icon :any;
    private bottomText : string;
    private couleur : String;
    private owned : boolean;
    private showing : boolean = false;
    private private : boolean;

    constructor(title : any, action : any, icon : any, owned: boolean, isPrivate : boolean,bottomText : string, couleur : string = 'Green'){
        this.title = title;
        this.buttonAction = action;
        this.icon = icon;
        this.couleur = couleur;
        this.owned = owned;
        this.private = isPrivate;
        this.bottomText = bottomText;
    }

    // to be override
    getId():number{
        return 0;
    }

    //to be override
    getContent(){
    }

    //to be override
    match(data:any){
    }

    matchList(list : string[], regex : RegExp): boolean{
        return list.some((element: string) => this.matchText(element, regex));
    }

    matchArray(array : Object, regex : RegExp): boolean{
        let list : string[] = Object.values(array);
        return this.matchList(list,regex)
    }

    matchText(text: string, regex : RegExp): boolean { 
        return regex.test(text);
    }

    setButtonText(message : any){
        this.icon = message;
    }

    setColor(couleur : String){
        this.couleur = couleur;
    }

    setShowing(status : boolean){
        this.showing = status;
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


    show(){
        return (
            <div onClick={() => {this.showing = !this.showing}} className={(this.owned) ? "questionCardContainer owned"  : "questionCardContainer notOwned"  }>
                <div className="top">
                    <h2>{this.tronced(this.title || "")}</h2>
                    <Button className={"modify " + this.couleur} onClick={()=> this.buttonAction(this)}>{this.icon}</Button>
                    
                </div>
                <div className="bottom">
                    <div className="mode">{this.bottomText}</div>
                    <div className="privateiIcon">{this.private ? <Https className="privateIcon"/> : <Public className="privateIcon"/>}</div>
                </div>
            </div>
        )
    }
}


export default Card;