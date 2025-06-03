import getter from "../function/getter";
import { current, normalizeText} from "./testSocket";
import {io} from "../index"
import quizzCRUD from "../function/quizzCRUD";

interface dccAnswer {mode : string, answer : string |number}

interface Step {mode : string,quizz : any, place : number, keep : boolean, dccAs : string, last : boolean, played : boolean}

interface User  {name:string, role : string,socketId:string, id?:number, hasAnswered:boolean, answer:any , score:number, life : number}
interface Room { room_id: number | string,name: string,mode: string, isPrivate: boolean, password:string,emission:any,currentQuestion: number,withRef : boolean, withPresentator: boolean,numberOfParticipantMax : number, player: {[name : string]: User}, defaultLife : number }

export default class Thread {
    private room;
    private players;
    private currentStep;
    private answers = <{[question_id : number | string] : []}>{}

    private scoreboard = <{[name : string] : number}>{};
    private lifeBoard = <{[name: string] : number}>{};
    private dccMode = <{[name: string]: string}>{};
    private currentAnswer = <{[name : string] : {answer : string | number |dccAnswer, hasAnswered : boolean}}>{};

    private currentQuestion : any;

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

    public async setUpStep(){
        console.log("le thread start (", this.room.room_id, ")")
        switch (this.currentStep.mode){
            case "Points":
                await this.playPoints();
                break;
            /*case "BR":
                this.playBR();
                break;*/
        }
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

    public async playPoints(){
        

        for (let playername  in this.room.player){
            this.scoreboard[playername] = 0;
        }

        const questions = await getter.getQuestionsOfQuizz(this.currentStep.quizz);
        if (!questions){
            return;
        }
        for (let question of questions){
            /*if (this.room.withPresentator){
                this.wait = true;
            }*/

            console.log("passe à la question suivante : ", question)
            
            for (let playername  in this.room.player){
                this.currentAnswer[playername] = {answer : "", hasAnswered : false}
            }
            const questionToSend = await getter.getQuestionById(question);
            if (questionToSend){
                this.currentQuestion = questionToSend;
                
                io.to(String(this.room.room_id)).emit("newQuestion", questionToSend);

                await new Promise(resolve => setTimeout(resolve, 10000)); // modifier les temps de réponse ici 

                for (let playername in this.room.player){
                    if (!this.currentAnswer[playername].hasAnswered){
                        console.log("on tente de récup la réponse de ", playername);
                        io.to(this.players[playername].socketId).emit("getQuestion")
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                let presentatorAnswers = <{[name : string] : boolean}>{};
                console.log("on passe à la vérification des réponses");
                for (let playername  in this.room.player){
                    if (this.currentAnswer[playername].hasAnswered){
                        if (this.verify(playername)){
                            this.scoreboard[playername] += this.getValueOfQuestion();
                            presentatorAnswers[playername] = true;
                        } else {
                            presentatorAnswers[playername] = false;
                        }
                    } else {
                        presentatorAnswers[playername] = false;
                    }
                }
                console.log("bonne réponse ? ",presentatorAnswers);
                console.log("scorboard", this.scoreboard)
                this.sendPresentator("AnswersToTheQuestion", {answers : presentatorAnswers, scoreboard :this.scoreboard});
                if (this.currentQuestion.mode === "DCC"){
                    
                    this.resetDccMode();
                } else {
                    console.log(this.currentQuestion.mode)
                }

                
            }
            /*while(this.wait){

            }*/
               
        }
        console.log("on envoie le scoreboard aux joueurs");
        io.to(String(this.room.room_id)).emit("PointsResult", this.scoreboardToList());

    }


    public verify (name : string){
        console.log("ça verifie la réponse de : ", name);
        const answer = this.currentAnswer[name].answer;
        switch (this.currentQuestion.mode){
            case "QCM" : 
                if (answer === this.currentQuestion.answer){
                    io.to(String(this.players[name].socketId)).emit("goodAnswer");
                    return true;
                } else {
                    io.to(String(this.players[name].socketId)).emit("wrongAnswer", {answer : this.currentQuestion.answer});
                    return false;
                }
            case "FREE" : 
                let success = false;
                let normalizedUserAnswer = normalizeText(String(answer));
        
                this.currentQuestion.answers.forEach((answer: string) => {
                    const normalizedExpectedAnswer = normalizeText(answer);
        
                    if (normalizedUserAnswer === normalizedExpectedAnswer) {
                        success = true;
                    }
                });
        
                if (success) {
                    io.to(this.players[name].socketId).emit("goodAnswer");
                } else {
                    io.to(this.players[name].socketId).emit("wrong answer", { answer: this.currentQuestion.answers[0] });
                }
                return success;

            case "VF" : 
                if ((answer === "vrai" && this.currentQuestion.truth) || (answer === "faux" && (!this.currentQuestion.truth)) ){
                    io.to(this.players[name].socketId).emit("goodAnswer");
                    return true;
                } else {
                    io.to(this.players[name].socketId).emit("wrongAnswer", {answer : this.currentQuestion.truth ? "vrai": "faux"});
                    return false;
                }
            case "DCC" :  
                return this.verifyDcc(name, answer);
            default:
                return false;
        }
    }

    public verifyDcc (name : string, answer : any){
        const mode = answer.mode;
        if (mode){
            switch(mode){
                case "CASH":
                    let success = false;
                    let normalizedUserAnswer = normalizeText(String(answer.value));
            
                    this.currentQuestion.cash.forEach((answer: string) => {
                        const normalizedExpectedAnswer = normalizeText(answer);
            
                        if (normalizedUserAnswer === normalizedExpectedAnswer) {
                            success = true;
                        }
                    });
            
                    if (success) {
                        io.to(this.players[name].socketId).emit("goodAnswer");
                    } else {
                        io.to(this.players[name].socketId).emit("wrong answer", { answer: this.currentQuestion.answers[0] });
                    }
                    return success;
                case "CARRE":
                    if (answer.value === this.currentQuestion.answer){
                        io.to(String(this.players[name].socketId)).emit("goodAnswer");
                        return true;
                    } else {
                        io.to(String(this.players[name].socketId)).emit("wrongAnswer", {answer : this.currentQuestion.answer});
                        return false;
                    }
                case "DUO":
                    if (answer.value === this.currentQuestion.answer){
                        io.to(String(this.players[name].socketId)).emit("goodAnswer");
                        return true;
                    } else {
                        io.to(String(this.players[name].socketId)).emit("wrongAnswer", {answer : this.currentQuestion.answer});
                        return false;
                    }
                default :
                    return false;

            }
        } else {
            return false
        }
    }

    public getValueOfQuestion(){
        return 1;
    }

    public scoreboardToList(){
        const sortedEntries = Object.entries(this.scoreboard).sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
        return sortedEntries
    }

    public sendPresentator(emit : string, obj : any){
        const players = this.room.player;
        for( let player in players){
            if (players[player].role === "presentator"){
                io.to(String(players[player].socketId)).emit(emit, obj);
            }
        }
    }


}