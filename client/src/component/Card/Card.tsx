import {Https, Public} from "@mui/icons-material"
import "./Card.css";

class Card {
    private buttonAction;
    private title;
    private bottomText : string;
    private owned : boolean;
    private private : boolean;
    private selected : boolean;
    private badgeVariant? : string;
    private href? : string;
    private draggableEnabled : boolean;

    constructor(title : any, action : any, owned: boolean, isPrivate : boolean, bottomText : string, badgeVariant? : string, selected : boolean = false, href? : string, draggableEnabled : boolean = false){
        this.title = title;
        this.buttonAction = action;
        this.owned = owned;
        this.private = isPrivate;
        this.bottomText = bottomText;
        this.badgeVariant = badgeVariant;
        this.selected = selected;
        this.href = href;
        this.draggableEnabled = draggableEnabled;
    }

    // to be override
    getId():number{
        return 0;
    }

    //to be override
    getContent(){
    }

    //to be override
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    match(_data:any){
    }

    matchList(list : string[], regex : RegExp): boolean{
        return list.some((element: string) => this.matchText(element, regex));
    }

    matchArray(array : object, regex : RegExp): boolean{
        const list : string[] = Object.values(array);
        return this.matchList(list,regex)
    }

    matchText(text: string, regex : RegExp): boolean {
        return regex.test(text);
    }

    tronced(str : string, length : number = 55){
        if (str){
            if (str.length < length){
                return str;
            }
            return str.slice(0, length) + "...";
        }
        return ""
    }

    /**
     * Toute la carte déclenche l'action (édition ou sélection selon l'appelant) :
     * plus de bouton séparé. Quand `href` est fourni, la carte est un vrai lien
     * (ctrl/cmd/molette-clic ouvrent dans un nouvel onglet comme n'importe quel
     * lien) — seul le clic gauche simple passe par le routeur SPA. Sans `href`
     * (ex: bascule de sélection), reste un simple conteneur cliquable.
     *
     * `draggableEnabled` : dépose son id (texte brut) dans le dataTransfer,
     * ramassé par les tuiles de FolderGrid pour ranger l'élément glissé.
     */
    show(){
        const className = [
            "questionCardContainer",
            this.owned ? "owned" : "notOwned",
            this.selected ? "selected" : "",
        ].filter(Boolean).join(" ");
        const content = (
            <>
                <div className="top">
                    <h2 title={this.title || ""}>{this.tronced(this.title || "")}</h2>
                </div>
                <div className="bottom">
                    <div className={"mode" + (this.badgeVariant ? " type-" + this.badgeVariant.toLowerCase() : "")}>{this.bottomText}</div>
                    <div className="privateiIcon">{this.private ? <Https className="privateIcon"/> : <Public className="privateIcon"/>}</div>
                </div>
            </>
        );
        const dragProps = this.draggableEnabled ? {
            draggable: true,
            onDragStart: (e: React.DragEvent) => {
                e.dataTransfer.setData("text/plain", String(this.getId()));
                e.dataTransfer.effectAllowed = "move";
            },
        } : {};
        if (this.href) {
            return (
                <a
                    key={this.getId()}
                    href={this.href}
                    className={className}
                    onClick={(e) => {
                        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                        e.preventDefault();
                        this.buttonAction(this);
                    }}
                    {...dragProps}
                >
                    {content}
                </a>
            );
        }
        return (
            <div key={this.getId()} onClick={() => this.buttonAction(this)} className={className} {...dragProps}>
                {content}
            </div>
        )
    }
}


export default Card;
