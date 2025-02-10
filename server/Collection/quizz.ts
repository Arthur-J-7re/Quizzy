import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

const QuizzSchema = new mongoose.Schema({
    quizz_id: Number, 
    creator: Number,
    mode: {
        type : String,
        enum : ['QCM', 'Free','all', 'list']
    }, 
    questions : [Number],
    played : Number,
    best_players : [Number],
    tags : [String] 
});

QuizzSchema.plugin(AutoIncrement, { inc_field: 'quizz_id' });

const model = mongoose.model("questions",QuizzSchema);

export default model;