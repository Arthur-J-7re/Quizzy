import mongoose from "../db";
import questions from "./questions";
const AutoIncrement = require('mongoose-sequence')(mongoose);

const UserSchema = new mongoose.Schema({
    username: String,
    user_id: Number, 
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
    questions: {type : [Number],default :  []},
    quizz: {type : [Number],default :  []},
    emissions : {type : [Number],default :  []},
    questPlayed: {type : Number, dafault : 0},
    goodAnswer: {type :Number, default: 0}
});

UserSchema.plugin(AutoIncrement, { inc_field: 'user_id' });

const model = mongoose.model("users", UserSchema);

export default model;