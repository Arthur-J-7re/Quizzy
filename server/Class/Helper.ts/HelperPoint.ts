import User from '../../Interface/User';
import ScoreBoard from '../LeaderBoard/ScoreBoard';
import Thread from '../Thread/_Thread';
import Helper from './Helper';
import Quizz from '../../Interface/Quizz';

class Result {

}

export default class HelperPoint extends Helper
{
    public scoreBoard : ScoreBoard;
    public step : Quizz;

    constructor (master : Thread, player : {[name : string] : User}, step : Quizz){
        super(master);
        this.scoreBoard = new ScoreBoard(player);
        this.step = step;
    }

    public receive (message : string) : void{

    }

    public send (result : Result) {
        
    }
}