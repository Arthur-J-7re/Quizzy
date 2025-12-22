import Room from "../Room";
import User from "../../Interface/User";
import Helper from "../Helper.ts/Helper";
import HelperPoint from "../Helper.ts/HelperPoint";

export default class Thread {
    public room:Room;
    public players:{[name : string]: User};
    public started:boolean = false;
    public currentStep = 0;
    public helper : Helper|null = null;

    constructor (room : Room){
        this.room = room;
        this.players = room.players
        this.changeHelper();
    }

    public changeHelper(): void{
        if (this.room && this.room.emission){
            switch (this.room.emission.getCurrentStepType(this.currentStep)){
                case "POINTS":
                    this.helper = new HelperPoint(this, this.players, this.room.emission[this.currentStep]);
                    break;
                default:
                    break;
            }
        }
    }

    public start(username : string) : void {
        console.log("Thread started by ", username);
    }

    public send(message: string, all: boolean = true, players : number[] | null = null): void{
        if (all){
            //send to all players
        } else {
            //send to specific player
        }
    }

    public receive(message : any) : void {
        //check nature of message
        if (this.helper){
            this.helper.receive(message);
        }
    }

    public getCurrentQuestion() : any {
        if (this.helper){
            return this.helper.getCurrentQuestion();
        }
    }

}