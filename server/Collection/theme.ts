import mongoose from "mongoose";
import { Document } from "mongoose";
import { Theme } from "../Interface/Theme";

const AutoIncrement = require('mongoose-sequence')(mongoose);
const AutoIncrementPB = require('mongoose-sequence')(mongoose);
export type ThemeDocument = Document & Theme;

export const ThemeSchema = new mongoose.Schema({
    theme_id: Number,
    creator: Number,
    name: { type: String, required: true },
    questions: { type: [Number], default: [] }
});

ThemeSchema.plugin(AutoIncrement, { inc_field: 'theme_id' });
export const ThemeModel = mongoose.model("Theme", ThemeSchema);

export const PBThemeSchema = new mongoose.Schema({
    theme_id: Number,
    creator: Number,
    imgOrString: { type: Boolean, required: true },
    img: { type: String },
    name: { type: String, required: true },
    questions: { type: [Number], default: [] }
});

PBThemeSchema.plugin(AutoIncrementPB, { inc_field: 'theme_id' });
export const PBThemeModel = mongoose.model("PBTheme", PBThemeSchema);