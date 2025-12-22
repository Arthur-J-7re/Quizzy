import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

const EmissionSchema = new mongoose.Schema({
    emission_id: Number, 
    creator: Number,
    numberOfStep: Number,
    step_ids : [Number],
    keepPoint : [Boolean],
    player : [Number],
    ranking: [Number],
    winner : Number,
     
});

EmissionSchema.plugin(AutoIncrement, { inc_field: 'emission_id' });

const model = mongoose.model("emission",EmissionSchema);

export default model;