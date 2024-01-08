require("dotenv").config();
const chalk = require("chalk");
const { pickPresence } = require("../../utils/pickPresence");
const { reinitializeActiveInvite } = require("../../utils/inviteCollectors");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    client.pickPresence = pickPresence;
    reinitializeActiveInvite(client);
    console.log(chalk.bgGreenBright(`Ready! Logged in as ${client.user.tag}`));
  },
};
