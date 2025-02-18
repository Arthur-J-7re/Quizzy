import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

const QuizzSchema = new mongoose.Schema({
    quizz_id: Number, 
    creator: Number,
    title : String,
    mode: {
        type : String,
        enum : ['QCM', 'Free','all', 'list']
    }, 
    questions : {type :[Number], default : []},
    played :{type: Number, default : 0},
    best_players : {type:[Number],default : []},
    tags :{type : [String], default : []} 
});

QuizzSchema.plugin(AutoIncrement, { inc_field: 'quizz_id' });

const model = mongoose.model("quizz",QuizzSchema);

export default model;