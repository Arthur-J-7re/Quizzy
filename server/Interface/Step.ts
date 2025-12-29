import {Quizz} from "./Quizz";

export default interface Step {
    quizz : Quizz,
    place : number,
    keep : boolean,
    last : boolean,
}
