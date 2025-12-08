import Thread from '../Thread/Thread';
import Helper from './Helper';

class Result {

}

export default class HelperPoint implements Helper
{
    public master : Thread;

    constructor (master : Thread){
        this.master = master;
    }

    public receive (response : Response){

    }

    public send (result : Result) {
        
    }
}