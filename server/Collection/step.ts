import mongoose from "../db";

export const StepSchema = new mongoose.Schema({
    quizz_id:Number,
    place:Number,
    keepPoint : Boolean,
    last : Boolean,
});

const model = mongoose.model("step",StepSchema);

export default model;