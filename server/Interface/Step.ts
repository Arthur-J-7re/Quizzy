import Quizz from "./Quizz";

export default interface Step {
    mode : string,
    quizz : Quizz,
    place : number,
    keep : boolean,
    last : boolean,
    played : boolean
}
