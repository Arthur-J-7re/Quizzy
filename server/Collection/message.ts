import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

/**
 * Message direct entre deux amis (cf. ROADMAP.md, Phase 5). Pas de
 * collection "Conversation" séparée : une conversation se déduit à la volée
 * par la paire (sender, recipient) — volume borné par le nombre d'amis, pas
 * besoin d'un modèle de thread dédié à cette échelle.
 */
const MessageSchema = new mongoose.Schema({
    message_id: Number,
    sender: { type: Number, required: true },
    recipient: { type: Number, required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

MessageSchema.plugin(AutoIncrement, { inc_field: 'message_id' });

const model = mongoose.model("messages", MessageSchema);

export default model;
