import mongoose from "mongoose";
import { Document } from "mongoose";
import { Theme} from "../Interface/Theme";

const AutoIncrement = require('mongoose-sequence')(mongoose);
export type ThemeDocument = Document & Theme;
export const ThemeSchema = new mongoose.Schema({
    theme_id: Number,
    creator: Number,
    private: Boolean,
    imgOrString: { type: Boolean, default: false },
    img: { type: String },
    title: { type: String, required: true },
    questions: { type: [Number], default: [] },
    tags: { type: [String], default: [] }
});

ThemeSchema.plugin(AutoIncrement, { inc_field: 'theme_id' });
export const ThemeModel = mongoose.model("Theme", ThemeSchema);