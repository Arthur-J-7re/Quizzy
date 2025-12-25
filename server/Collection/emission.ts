import mongoose from "../db";
import { Document } from "mongoose";
import Emission from "../Interface/Emission";

const AutoIncrement = require('mongoose-sequence')(mongoose);
export type EmissionDocument = Document & Emission;

const EmissionSchema = new mongoose.Schema({
    emission_id: Number, 
    creator: Number,
    steps : [Number],
    keepPoint : [Boolean],
});

EmissionSchema.plugin(AutoIncrement, { inc_field: 'emission_id' });

const EmissionModel = mongoose.model("Emission",EmissionSchema);

export default EmissionModel;