const { pickPresence } = require('../../utils/pickPresence');

module.exports = {
    name: "ready",
    once: true,
    async execute(client) {
        client.pickPresence = pickPresence;
        console.log(`Ready! Logged in as ${client.user.tag}`);
    }
}