import mongoose from "mongoose";
import { Document } from "mongoose";
import { Theme, THEME_FOLDER_VALUES } from "../Interface/Theme";

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
    tags: { type: [String], default: [] },
    // Facet de filtre fixe, purement indicatif (cf. shared-types/theme.ts) :
    // absent = "sans dossier".
    folder: { type: String, enum: THEME_FOLDER_VALUES, required: false },
});

ThemeSchema.plugin(AutoIncrement, { inc_field: 'theme_id' });
export const ThemeModel = mongoose.model("Theme", ThemeSchema);