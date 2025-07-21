import getter from "../../function/getter";
import { normalizeText, verify, getValueOfQuestion } from "../../GameFunction/threadHelper";
import {io} from "../../index"
import quizzCRUD from "../../function/quizzCRUD";
import Thread from "./Thread";

interface dccAnswer {mode : string, answer : string |number}

interface Step {mode : string,quizz : any, place : number, keep : boolean, dccAs : string, last : boolean, played : boolean, other : any}
interface User  {name:string, role : string,socketId:string, id?:number, hasAnswered:boolean, answer:any , connected: boolean}

interface Room { room_id: number | string,name: string,creator: string, isPrivate: boolean, password:string,emission:any,currentQuestion: number,withRef : boolean, withPresentator: boolean,numberOfParticipantMax : number, player: {[name : string]: User}, defaultLife : number }

export default class ThreadPoints extends Thread{

    protected scoreboard = <{[name : string] : number}>{};
    protected lifeBoard = <{[name: string] : number}>{};
    protected dccMode = <{[name: string]: string}>{};
    protected currentAnswer = <{[name : string] : {answer : string | number |dccAnswer, hasAnswered : boolean}}>{};

    protected currentQuestion : any;

    constructor(room : Room) {
        super(room)
    }

    public override async play(){
        

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
                
                io.to(String(this.room.room_id)).emit("newQuestion", {question :questionToSend, canAnswer: true});

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
                        if (verify(playername, this.currentQuestion, this.currentAnswer[playername].answer)){
                            this.scoreboard[playername] += getValueOfQuestion(this.currentQuestion);
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
        this.sendAll("PointsResult", this.scoreboardToList());

    }

    public scoreboardToList(){
        const sortedEntries = Object.entries(this.scoreboard).sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
        return sortedEntries
    }

}