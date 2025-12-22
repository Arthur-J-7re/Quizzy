import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

export enum Mode {
    LIST = "list",
    GRID = "grid",
    PICKANDBAN = "pickandban",
    BIGBUCKET = "bigbucket",
}

const QuizzSchema = new mongoose.Schema({
    quizz_id: Number, 
    creator: Number,
    title : String,
    private : Boolean,
    mode: {
        type : String,
        enum : ['QCM', 'Free','all', 'list'],
        default : "all"
    }, 
    questions : {type :[Number], default : []},
    played :{type: Number, default : 0},
    best_players : {type:[Number],default : []},
    tags :{type : [String], default : []} 
});

QuizzSchema.plugin(AutoIncrement, { inc_field: 'quizz_id' });

const model = mongoose.model("Quizz",QuizzSchema);

export default model;