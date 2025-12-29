import getter from "../../function/getter";
import { normalizeText, verify, getValueOfQuestion } from "../../GameFunction/threadHelper";
import {io} from "../../index"
import quizzManager from "../../function/quizzManager";
import Thread from "./Thread";
import Room from "../../Interface/Room";

export default class ThreadBr extends Thread{

    protected lifeBoard = <{[name: string] : number}>{};
    private currentPlayer = <string[]>[];
    protected currentQuestion : any;

    constructor(room : Room) {
        super(room)
    }

    public override async setUpStep(){
        console.log("le thread start (", this.room.room_id, ")")
        for (let playername in this.players){
            console.log("le playername dans setup", playername)
            this.currentPlayer = [...this.currentPlayer, playername]
            console.log("et le currentPlayer : ", this.currentPlayer)
        }
        await this.play()
    }

    public override async play(){
        if (this.currentStep.mode != "BR" || !this.currentStep.other.lp ||this.currentStep.other.lp === 0 ){
            return 
        }
        

        for (let playername  in this.room.players){
            this.lifeBoard[playername] = this.currentStep.other.lp;
        }

        const questions = await getter.getQuestionsOfQuizz(this.currentStep.quizz);
        if (!questions){
            return;
        }
        let breaked = false;
        for (let question of questions){
            /*if (this.room.withPresentator){
                this.wait = true;
            }*/

            console.log("passe à la question suivante : ", question)
            
            for (let playername  in this.room.players){
                this.currentAnswer[playername] = {answer : "", hasAnswered : false}
            }
            const questionToSend = await getter.getQuestionById(question);
            if (questionToSend){
                this.currentQuestion = questionToSend;
                
                this.newQuestion(questionToSend)

                await new Promise(resolve => setTimeout(resolve, 10000)); // modifier les temps de réponse ici 

                for (let playername in this.room.players){
                    if (!this.currentAnswer[playername].hasAnswered){
                        console.log("on tente de récup la réponse de ", playername);
                        io.to(this.players[playername].socketId).emit("getQuestion")
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500));

                let presentatorAnswers = <{[name : string] : boolean}>{};
                console.log("on passe à la vérification des réponses");
                let newLifeBoard = <{[name: string] : number}>{}
                for (let playername of this.currentPlayer){ //player en lice ici je pense
                    console.log("playername",playername);
                    if (this.currentAnswer[playername] && this.currentAnswer[playername].hasAnswered){
                        if (verify(playername, this.currentQuestion, this.currentAnswer[playername].answer)){
                            presentatorAnswers[playername] = true;
                            newLifeBoard[playername] = this.lifeBoard[playername]
                        } else {
                            newLifeBoard[playername] = this.lifeBoard[playername] - 1;
                            presentatorAnswers[playername] = false;
                        }
                    } else {
                        newLifeBoard[playername] = this.lifeBoard[playername] - 1;
                        presentatorAnswers[playername] = false;
                    }
                }
                console.log("bonne réponse ? ",presentatorAnswers);
                console.log("lifeboard", this.lifeBoard)
                if (!this.check(newLifeBoard)){
                    this.lifeBoard = newLifeBoard
                    this.sendAll("result of BR round", {"newlifeboard":this.lifeBoard,"newanswers":presentatorAnswers});
                    await new Promise(resolve => setTimeout(resolve, 5000));
                } else {
                    this.sendAll("All Wrong");
                }
                if (this.currentPlayer.length === 1){
                    breaked = true;
                    break
                }
                if (this.currentQuestion.mode === "DCC"){
                    this.resetDccMode();
                } else {
                    console.log(this.currentQuestion.mode)
                }
            }
            if (breaked){
                break;
            }     
        }
        this.sendAll("winner of BR", this.currentPlayer)
        
        console.log("on envoie le scoreboard aux joueurs");
    }

    public check(lifeboard : any){
        console.log("le lifeboard dans check : ", lifeboard)
        let newCurrentPlayer = <string[]>[]
        for (let playername of this.currentPlayer){
            console.log(playername,lifeboard[playername], lifeboard[playername] === 0)
            if (lifeboard[playername] != 0){
                newCurrentPlayer = [...newCurrentPlayer, playername]
            }
        }

        console.log("le newcurrentplayer dans check: ", newCurrentPlayer)
        if (newCurrentPlayer.length != 0){
            this.currentPlayer = newCurrentPlayer
            return false;
        } else {
            return true
        }
    }

    public canAnswer(playername : string){
        return this.currentPlayer.includes(playername)    
    }

    public manageLifeboard(){
        this.lifeBoard
    }

    public newQuestion(question : any){
        for (let playername in this.players){
            io.to(this.players[playername].socketId).emit("newQuestion", {question :question, canAnswer: this.canAnswer(playername)});
        }
    }
    
    public lifeBoardToList(){
        const sortedEntries = Object.entries(this.lifeBoard).sort(([, lifeA], [, lifeB]) => lifeB - lifeA);
        return sortedEntries
    }

}