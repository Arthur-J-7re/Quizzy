import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

/**
 * Amitié entre deux utilisateurs (cf. ROADMAP.md, Phase 5). Un refus supprime
 * simplement la ligne plutôt que de garder un statut "declined" : pas de
 * besoin produit de conserver un historique de refus, et ça permet de
 * renvoyer une demande plus tard sans ligne fantôme à gérer.
 */
const FriendshipSchema = new mongoose.Schema({
    friendship_id: Number,
    requester: { type: Number, required: true },
    recipient: { type: Number, required: true },
    status: { type: String, enum: ["pending", "accepted"], required: true },
    createdAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
});

FriendshipSchema.plugin(AutoIncrement, { inc_field: 'friendship_id' });

const model = mongoose.model("friendships", FriendshipSchema);

export default model;
