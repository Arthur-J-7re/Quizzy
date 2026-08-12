import mongoose from "../db";
import { Document } from "mongoose";
import Emission from "../Interface/Emission";
import {StepSchema} from "./step";

const AutoIncrement = require('mongoose-sequence')(mongoose);
//export type EmissionDocument = Document & Emission;

const EmissionSchema = new mongoose.Schema({
    emission_id: Number,
    title: String,
    private: Boolean,
    creator: Number,
    options: {
        numberOfPlayers: { type: Number, default: 4 },
        teams: { type: Boolean, default: false },
        playerThemeEnabled: { type: Boolean, default: false },
        hostModeEnabled: { type: Boolean, default: false },
    },
    steps : [StepSchema],
});

EmissionSchema.plugin(AutoIncrement, { inc_field: 'emission_id' });

const EmissionModel = mongoose.model("Emission",EmissionSchema);

export default EmissionModel;