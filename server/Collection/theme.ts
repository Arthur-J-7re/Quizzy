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
    // Ce schéma est aussi embarqué comme sous-document dans les quizz Grid/
    // PickAndBan/BigBucket/Timer (quizz.ts) : sur une copie embarquée, cette
    // date représente le moment de l'embarquement, pas celle du thème de
    // bibliothèque d'origine — comportement attendu, pas un bug.
    createdAt: { type: Date, default: Date.now },
});

ThemeSchema.plugin(AutoIncrement, { inc_field: 'theme_id' });
export const ThemeModel = mongoose.model("Theme", ThemeSchema);