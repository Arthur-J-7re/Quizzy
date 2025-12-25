import mongoose from "../db";
import { Document } from "mongoose";
import { QuestionMode } from "../Interface/Question";
import { Question } from "../Interface/Question";
const AutoIncrement = require("mongoose-sequence")(mongoose);



const Answers4 = {
    ans1: { type: String, required: true },
    ans2: { type: String, required: true },
    ans3: { type: String, required: true },
    ans4: { type: String, required: true },
};

export type QuestionDocument = Document & Question;

const QuestionSchema = new mongoose.Schema<QuestionDocument>({
    question_id: Number,
    author: { type: Number, required: true },
    mode: { type: String, enum: Object.values(QuestionMode), required: true },
    title: { type: String, required: true },
    private: { type: Boolean, required: true },
    quizz: { type: [Number], default: [] },
    playlist: { type: [Number], default: [] },
    level: Number,
    report: { type: [{ date: Date, reporter: Number }], default: [] },
    played: { type: Number, default: 0 },
    succeed: { type: Number, default: 0 },
    tags: [String],
});

QuestionSchema.plugin(AutoIncrement, { inc_field: "question_id" });

export const QuestionModel = mongoose.model("Question", QuestionSchema);

export const QCMModel = QuestionModel.discriminator<QuestionDocument>(
    "QCM",
    new mongoose.Schema({
        choices: Answers4,
        answer: { type: Number, required: true },
    })
);

export const FreeModel = QuestionModel.discriminator<QuestionDocument>(
    "FREE",
    new mongoose.Schema({
        answers: { type: [String], required: true },
    })
);

export const DCCModel = QuestionModel.discriminator<QuestionDocument>(
    "DCC",
    new mongoose.Schema({
        carre: Answers4,
        cash: { type: [String], required: true },
        duo: { type: Number, required: true },
        answer: { type: Number, required: true },
    })
);

export const VFModel = QuestionModel.discriminator<QuestionDocument>(
    "VF",
    new mongoose.Schema({
        truth: { type: Boolean, required: true },
    })
);
