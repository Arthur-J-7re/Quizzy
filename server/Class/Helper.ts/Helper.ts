import Thread from "../Thread/_Thread";

export default class  Helper {
    private master : Thread;
    private currentQuestion : number;
    private currentAnswers : {[name : string] : any};

    constructor (master : Thread){
        this.master = master;
        this.currentQuestion = 0;
        this.currentAnswers = {};
    }

    public receive (message : string) : void{
        
    }

    protected send (message: string, all : boolean = true) : void {
        this.master.send(message, all);
    }

    public getCurrentQuestion() : any {
        return this.currentQuestion
    }
}