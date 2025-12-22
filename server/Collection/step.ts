import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

const StepSchema = new mongoose.Schema({
    step_id : Number,
    quizz_id:Number,
    inputCount:Number,
    outputCount: Number,
    keep : Boolean,
    last : Boolean,
});

StepSchema.plugin(AutoIncrement, { inc_field: 'step_id' });

const model = mongoose.model("step",StepSchema);

export default model;