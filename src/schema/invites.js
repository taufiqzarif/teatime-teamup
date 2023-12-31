const { Schema, model } = require('mongoose');

const invitesSchema = new Schema({
    ownerId: { type: String, required: true },
    game: { type: String, required: true },
    players: [
        {
            userId: { type: String, required: true },
        }
    ],
    timestamp: { type: Date, default: Date.now },
    maxPlayers: { type: Number, required: true },
});

module.exports = model('Invites', invitesSchema, 'invites');