import mongoose from "../db";
import { Document } from "mongoose";
import { Folder } from "../Interface/Folder";
const AutoIncrement = require("mongoose-sequence")(mongoose);

export type FolderDocument = Document & Folder;

const FolderSchema = new mongoose.Schema<FolderDocument>({
    folder_id: Number,
    creator: { type: Number, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
});

FolderSchema.plugin(AutoIncrement, { inc_field: "folder_id" });

export const FolderModel = mongoose.model("Folder", FolderSchema);
