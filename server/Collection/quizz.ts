import mongoose from "../db";
import { Document } from "mongoose";
import { QuizzMode, Quizz, ListQuizz, GridQuizz, PickAndBanQuizz, BigBucketQuizz, TimerQuizz} from "../Interface/Quizz";
import { ThemeSchema } from "./theme";

const AutoIncrement = require('mongoose-sequence')(mongoose);
const QuizzSchema = new mongoose.Schema({
    quizz_id: Number, 
    creator: Number,
    title : String,
    private : Boolean,
    mode: { type: String, enum: Object.values(QuizzMode), required: true },
    played :{type: Number, default : 0},
    best_players : {type:[Number],default : []},
    tags :{type : [String], default : []} 
});

QuizzSchema.plugin(AutoIncrement, { inc_field: 'quizz_id' });

export type QuizzDocument = Document & Quizz;
export type ListQuizzDocument = Document & ListQuizz;
export type GridQuizzDocument = Document & GridQuizz;
export type PickAndBanQuizzDocument = Document & PickAndBanQuizz;
export type BigBucketQuizzDocument = Document & BigBucketQuizz;
export type TimerQuizzDocument = Document & TimerQuizz;

export const QuizzModel = mongoose.model("Quizz",QuizzSchema);

const ForcedTypeField = { type: String, enum: ["ALL", "QCM", "CASH"], default: "ALL" };

export const ListQuizzModel = QuizzModel.discriminator<ListQuizzDocument>(
    "LIST",
    new mongoose.Schema({
        questions : {type :[Number], default : []},
        answerDurationMs : {type : Number, default : 20000},
        scoring : {
            correctPoints : {type : Number, default : 1},
            wrongPoints : {type : Number, default : 0},
        },
        forcedType : ForcedTypeField,
    })
);

export const GridQuizzModel = QuizzModel.discriminator<GridQuizzDocument>(
    "GRID",
    new mongoose.Schema({
        themes : {type :[ThemeSchema], default : []},
        width : {type : Number, default : 4},
        height : {type : Number, default : 4},
        cellsPerTheme : {type : Number, default : 3},
        neutralQuestions : {type : [Number], default : []},
        memorizeDurationMs : {type : Number, default : 8000},
        answerDurationMs : {type : Number, default : 20000},
        scoring : {
            correctPoints : {type : Number, default : 1},
            wrongPoints : {type : Number, default : 0},
        },
        forcedType : ForcedTypeField,
    })
);

export const PickAndBanQuizzModel = QuizzModel.discriminator<PickAndBanQuizzDocument>(
    "PICKANDBAN",
    new mongoose.Schema({
        themes : {type :[ThemeSchema], default : []},
        columns : {type : Number, default : 6},
        draftTurnDurationMs : {type : Number, default : 20000},
        answerDurationMs : {type : Number, default : 20000},
        scoring : {
            correctPoints : {type : Number, default : 1},
            wrongPoints : {type : Number, default : 0},
            dccPoints : {
                cash : {type : Number, default : 5},
                carre : {type : Number, default : 3},
                duo : {type : Number, default : 1},
            },
        },
        forcedType : ForcedTypeField,
        allowBan : {type : Boolean, default : true},
    })
);

export const BigBucketQuizzModel = QuizzModel.discriminator<BigBucketQuizzDocument>(
    "BIGBUCKET",
    new mongoose.Schema({
        themes : {type :[ThemeSchema], default : []},
        width : {type : Number, default : 0},
        height : {type : Number, default : 0},
    })
);

export const TimerQuizzModel = QuizzModel.discriminator<TimerQuizzDocument>(
    "TIMER",
    new mongoose.Schema({
        themes : {type :[ThemeSchema], default : []},
        turnDurationMs : {type : Number, default : 100000},
        hostModeEnabled : {type : Boolean, default : false},
        scoring : {
            correctPoints : {type : Number, default : 1},
            wrongPoints : {type : Number, default : 0},
            streakBonus : {
                everyN : {type : Number, default : 2},
                bonusPoints : {type : Number, default : 1},
            },
        },
        forcedType : ForcedTypeField,
    })
);

