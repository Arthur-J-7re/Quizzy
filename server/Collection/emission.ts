import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);
import Quizz from "./quizz"

const StepSchema = new mongoose.Schema({mode : String, quizz:Quizz, inputCount:Number, outputCount: Number, keep : Boolean, last : Boolean, played : Boolean})

const EmissionSchema = new mongoose.Schema({
    emission_id: Number, 
    creator: Number,
    numberOfStep: Number,
    steps : [StepSchema],
    keepPoint : [Boolean],
    player : [Number],
    ranking: [Number],
    winner : Number,
     
});

EmissionSchema.plugin(AutoIncrement, { inc_field: 'emission_id' });

const model = mongoose.model("questions",EmissionSchema);

export default model;