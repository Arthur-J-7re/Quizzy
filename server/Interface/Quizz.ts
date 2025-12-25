import mongoose from "../db";
import {Theme, PBTheme} from "./Theme";

export enum QuizzMode {
    LIST = "LIST",
    GRID = "GRID",
    PICKANDBAN = "PICKANDBAN",
    BIGBUCKET = "BIGBUCKET", 
}

export interface Quizz {
    quizz_id: number, 
    creator: number,
    title : string,
    private : boolean,
    mode: QuizzMode,
    played :{type: Number, default : 0},
    tags :{type : [String], default : []} 
}

export interface ListQuizz extends Quizz {
    questions : number[],
}

export interface GridQuizz extends Quizz {
    themes : Theme[],
    themeSize : number,
    gridSize: number,
}

export interface PickAndBanQuizz extends Quizz {
    themes : PBTheme[],
    size: number,
}

export interface BigBucketQuizz extends Quizz {
    themes : Theme[],
    width : number,
    height : number,
}