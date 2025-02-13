import mongoose from "../db";
import questions from "./questions";
const AutoIncrement = require('mongoose-sequence')(mongoose);

const UserSchema = new mongoose.Schema({
    username: String,
    user_id: Number, 
    nickname: String, 
    password : String,  
    email: {
        type: String,
        required: true,
        unique: true, 
        lowercase: true, 
        trim: true, 
        validate: {
            validator: function (v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} n'est pas une adresse email valide !`
        }
    },
    currentRoom : String,
    questions: [Number],
    quizz:[Number],
    emissions : [Number],
    questPlayed: Number,
    goodAnswer: Number
});

UserSchema.plugin(AutoIncrement, { inc_field: 'quizz_id' });

const model = mongoose.model("questions", UserSchema);

export default model;