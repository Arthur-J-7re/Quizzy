import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

const questionSchema = new mongoose.Schema({
    question_id: Number, 
    creator: Number,
    mode: {
        type : String,
        enum : ['QCM', 'Free']
    }, 
    report : [{date : Date, reporter : Number}],
    played : Number,
    succeed : Number,
    tags : [String] 
});


const model = mongoose.model("questions",questionSchema);

module.exports = model;




enum Mode {
QCM = "QCM",
FREE = "Free",
}

interface IQuestionBase extends mongoose.Document {
question_id: number;
creator: number;
mode: Mode;
report?: { date: Date; reporter: number }[];
played?: number;
succeed?: number;
tags?: string[];
}

// 🟢 Schéma de base (sans les champs spécifiques)
const QuestionSchema = new mongoose.Schema<IQuestionBase>({
question_id: { type: Number, required: true },
creator: { type: Number, required: true },
mode: { type: String, enum: Object.values(Mode), required: true },
report: [{ date: Date, reporter: Number }],
played: Number,
succeed: Number,
tags: [String],
});

QuestionSchema.plugin(AutoIncrement, { inc_field: 'question_id' });

// 🟢 Modèle de base
const QuestionModel = mongoose.model<IQuestionBase>("Question", QuestionSchema);

// 🔵 Discriminant pour "QCM"
interface IQCMQuestion extends IQuestionBase {
    choices: {content : string; id : number}[];
    answer : number;
}

const QCMSchema = new mongoose.Schema<IQCMQuestion>({
    choices: { type: [{String}], required: true },
    answer : {type : Number, required: true}
});

const QCMModel = QuestionModel.discriminator<IQCMQuestion>("QCM", QCMSchema);

// 🔵 Discriminant pour "Free"
interface IFreeQuestion extends IQuestionBase {
    answer: string;
}

const FreeSchema = new mongoose.Schema<IFreeQuestion>({
answer: { type: String, required: true },
});

const FreeModel = QuestionModel.discriminator<IFreeQuestion>("Free", FreeSchema);

module.exports = {QuestionModel, QCMModel, FreeModel};