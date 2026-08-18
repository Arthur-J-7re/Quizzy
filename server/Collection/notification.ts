import mongoose from "../db";
const AutoIncrement = require('mongoose-sequence')(mongoose);

/**
 * Notifications système (modération, cascade de publication, Phase 4) +
 * demandes d'amis (Phase 5, ROADMAP.md) dans le même inbox. `sender` et
 * `payload` sont optionnels : absents pour les notifications système, posés
 * pour "friend_request" (payload = {friendship_id}, pour que la cloche sache
 * sur quelle ligne agir avec les boutons Accepter/Refuser).
 */
const NotificationSchema = new mongoose.Schema({
    notification_id: Number,
    recipient: { type: Number, required: true },
    type: {
        type: String,
        enum: ["question_approved", "question_rejected", "entity_unpublished", "friend_request", "friend_accepted"],
        required: true,
    },
    message: { type: String, required: true },
    sender: { type: Number },
    payload: { type: mongoose.Schema.Types.Mixed },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

NotificationSchema.plugin(AutoIncrement, { inc_field: 'notification_id' });

const model = mongoose.model("notifications", NotificationSchema);

export default model;
