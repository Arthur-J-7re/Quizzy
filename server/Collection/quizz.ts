import mongoose from "../db";
import { Document } from "mongoose";
import { QuizzMode, Quizz} from "../Interface/Quizz";
import { ThemeSchema, PBThemeSchema } from "./theme";

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

export const QuizzModel = mongoose.model("Quizz",QuizzSchema);

export const ListQuizzModel = QuizzModel.discriminator<QuizzDocument>(
    "LIST",
    new mongoose.Schema({
        questions : {type :[Number], default : []},
    })
);

export const GridQuizzModel = QuizzModel.discriminator<QuizzDocument>(
    "GRID",
    new mongoose.Schema({
        themes : {type :[ThemeSchema], default : []},
        themeSize : {type : Number, default : 0},
        gridSize: {type : Number, default : 0},
    })
);

export const PickAndBanQuizzModel = QuizzModel.discriminator<QuizzDocument>(
    "PICKANDBAN",
    new mongoose.Schema({
        themes : {type :[PBThemeSchema], default : []},
        size: {type : Number, default : 0},
    })
);

export const BigBucketQuizzModel = QuizzModel.discriminator<QuizzDocument>(
    "BIGBUCKET",
    new mongoose.Schema({
        themes : {type :[ThemeSchema], default : []},
        width : {type : Number, default : 0},
        height : {type : Number, default : 0},
    })
);

