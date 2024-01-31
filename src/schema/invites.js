const { Schema, model } = require('mongoose');

const invitesSchema = new Schema({
    ownerId: { type: String, required: true },
    game: { type: String, required: true },
    description: { type: String, required: false },
    players: [
        {
            userId: { type: String, required: true },
        }
    ],
    messageId: { type: String, required: true },
    channelId: { type: String, required: true },
    createdTime: { type: Date, default: Date.now },
    expiryTime: { type: Date, required: true },
    teamInvite: { type: String, required: false},
    maxPlayers: { type: Number, required: true },
});

module.exports = model('Invites', invitesSchema, 'invites');