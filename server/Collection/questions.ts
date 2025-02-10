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




enum Mode {
    QCM = "QCM",
    FREE = "Free",
    DCC = "DCC",
}

interface IQuestionBase extends mongoose.Document {
    question_id: number;
    author: number;
    mode: Mode;
    report?: { date: Date; reporter: number }[];
    played?: number;
    succeed?: number;
    tags?: string[];
}

// 🟢 Schéma de base (sans les champs spécifiques)
const QuestionSchema = new mongoose.Schema<IQuestionBase>({
    question_id: { type: Number, required: true },
    author: { type: Number, required: true },
    mode: { type: String, enum: Object.values(Mode), required: true },
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


// 🔵 Discriminant pour "Free"
interface IDCCQuestion extends IQuestionBase {
    Carre: string[];
    Duo: [string];
    Cash: [string]
}

const DCCSchema = new mongoose.Schema<IDCCQuestion>({
    Carre: { type: [String], required: true },
    Cash: { type: [String], required: true },
    Duo: { type: [String], required: true },
});

const DCCModel = QuestionModel.discriminator<IDCCQuestion>("Free", FreeSchema);

export default {QuestionModel, QCMModel, FreeModel, DCCModel};