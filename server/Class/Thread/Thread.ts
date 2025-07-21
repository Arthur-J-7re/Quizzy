import getter from "../../function/getter";
import {io} from "../../index"
import quizzCRUD from "../../function/quizzCRUD";

interface dccAnswer {mode : string, answer : string |number}

interface Step {mode : string,quizz : any, place : number, keep : boolean, dccAs : string, last : boolean, played : boolean, other: any}
interface User  {name:string, role : string,socketId:string, id?:number, hasAnswered:boolean, answer:any , connected: boolean}

interface Room { room_id: number | string,name: string,creator: string, isPrivate: boolean, password:string,emission:any,currentQuestion: number,withRef : boolean, withPresentator: boolean,numberOfParticipantMax : number, player: {[name : string]: User}, defaultLife : number }


export default class Thread{
    protected room;
    protected players;
    protected currentStep;
    protected answers = <{[question_id : number | string] : []}>{}

    protected dccMode = <{[name: string]: string}>{};
    protected currentAnswer = <{[name : string] : {answer : string | number |dccAnswer, hasAnswered : boolean}}>{};

    protected currentQuestion : any;

    constructor(room : Room) {
        this.room = room;
        this.players = room.player;
        this.currentStep = room.emission.steps[0];
    }

    public async start(username : string){
        console.log("on tente de start la game");
        console.log("les players : ", this.room.player);
        console.log("notre player : ", this.room.player[username]);
        if (this.room.player[username].role === "creator"){
            io.to(String(this.room.room_id)).emit("Starting game");
            await this.setUpStep();
        }
    }

    public setPlayer(player: {[name : string]: User}){
        console.log("on change la valeur de player")
        this.players = player;
    }

    public async setUpStep(){
        console.log("le thread start (", this.room.room_id, ")")
        await this.play()
    }

    public getDccMode(name : string){
        if (this.currentStep.dccAs === "DCC"){
            if (this.dccMode[name]){
                return this.dccMode[name];
            } else {
                return null
            }
        } else {
            return this.currentStep.dccAs
        }
    }

    public getCurrentQuestion(){
        return this.currentQuestion
    }

    public setDccMode(name: string, mode: string){
        this.dccMode[name] = mode;
    }

    public resetDccMode(){
        console.log("on reset ça ",this.dccMode);
        for (let playername  in this.room.player){
            this.dccMode[playername] = "";
            io.to(this.players[playername].socketId).emit("DccMode","")
        }
    }

    public answer(data : any){
        var name = data.username;
        var answer = data.answer;
        var question = data.question;
        console.log("la room ", this.room.room_id, " a reçu la réponse ", answer, " de la part de ", name)
        this.currentAnswer[name] = {answer : answer, hasAnswered : true}
        console.log(this.currentAnswer);
        
    }

    public async play(){

    }


    public sendPresentator(emit : string, obj : any){
        const players = this.room.player;
        for( let player in players){
            if (players[player].role === "presentator"){
                io.to(String(players[player].socketId)).emit(emit, obj);
            }
        }
    }

    public sendAll(message : string, obj : any){
        io.to(String(this.room.room_id)).emit(message, obj);
    }


}