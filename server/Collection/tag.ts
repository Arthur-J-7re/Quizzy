import mongoose from "../db";
import { Document } from "mongoose";

const AutoIncrement = require("mongoose-sequence")(mongoose);

export interface Tag {
    tag_id: number;
    name: string;
}

export type TagDocument = Document & Tag;

export const TagSchema = new mongoose.Schema<TagDocument>({
    tag_id: Number,
    name: { type: String, required: true, unique: true, uppercase: true, trim: true },
});

TagSchema.plugin(AutoIncrement, { inc_field: "tag_id" });
export const TagModel = mongoose.model("Tag", TagSchema);
