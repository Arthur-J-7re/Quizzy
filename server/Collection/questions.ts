import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

/*const questionSchema = new mongoose.Schema({
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

module.exports = model;*/




export enum Mode {
    QCM = "QCM",
    FREE = "Free",
    DCC = "DCC",
    VF = "VF",
}

interface IQuestionBase extends mongoose.Document {
    question_id: number;
    author: number;
    mode: Mode;
    title : String;
    private: boolean;
    quizz : number[];
    playlist : number []
    report?: { date: Date; reporter: number }[];
    played?: number;
    succeed?: number;
    tags?: string[];
}

// 🟢 Schéma de base (sans les champs spécifiques)
const QuestionSchema = new mongoose.Schema<IQuestionBase>({
    question_id: { type: Number},
    author: { type: Number, required: true },
    mode: { type: String, enum: Object.values(Mode), required: true },
    title : {type : String, required: true},
    private: {type: Boolean, required: true},
    quizz : {type: [Number], default: []},
    report: { type : [{ date: Date, reporter: Number }], default : []},
    played: {type : Number, default : 0},
    succeed: {type : Number, default : 0},
    tags: [String],
});

QuestionSchema.plugin(AutoIncrement, { inc_field: 'question_id' });

// 🟢 Modèle de base
const QuestionModel = mongoose.model<IQuestionBase>("Question", QuestionSchema);

// 🔵 Discriminant pour "QCM"
interface IQCMQuestion extends IQuestionBase {
    choices: [{content : string, answer_num : string}];
    answer : number;
}

const QCMSchema = new mongoose.Schema<IQCMQuestion>({
    choices: [{content: String, answer_num: String}],
    answer : {type : Number, required: true}
});

const QCMModel = QuestionModel.discriminator<IQCMQuestion>("QCM", QCMSchema);

// 🔵 Discriminant pour "Free"
interface IFreeQuestion extends IQuestionBase {
    answers: string[];
}

const FreeSchema = new mongoose.Schema<IFreeQuestion>({
    answers: { type: [String], required: true },
});

const FreeModel = QuestionModel.discriminator<IFreeQuestion>("Free", FreeSchema);


// 🔵 Discriminant pour "Free"
interface IDCCQuestion extends IQuestionBase {
    carre: [{content : string, answer_num: String}];
    duo: number;
    answer: number;
    cash: [string]
}

const DCCSchema = new mongoose.Schema<IDCCQuestion>({
    carre: { type: [{content: String, answer_num: String}], required: true },
    cash: { type: [String], required: true },
    duo: { type: Number, required: true },
    answer: {type: Number, required: true}
});

const DCCModel = QuestionModel.discriminator<IDCCQuestion>("DCC", DCCSchema);


interface IVFQuestion extends IQuestionBase {
    truth: boolean,
}

const VFSchema = new mongoose.Schema<IVFQuestion>({
    truth : {type: Boolean, required : true}
});

const VFModel = QuestionModel.discriminator<IVFQuestion>("VF", VFSchema);



export default {Mode, QuestionModel, QCMModel, FreeModel, DCCModel, VFModel};