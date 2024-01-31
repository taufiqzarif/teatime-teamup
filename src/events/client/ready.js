require("dotenv").config();
const chalk = require("chalk");
const { ActivityType } = require("discord.js");
const { reinitializeActiveInvite } = require("../../utils/inviteCollectors");

module.exports = {
  name: "ready",
  once: true,
  async execute(client) {
    const options = [
      {
        type: ActivityType.Playing,
        text: "/teamup",
      },
    ];

    const option = Math.floor(Math.random() * options.length);
    client.user.setPresence({
      activities: [
        {
          name: options[option].text,
          type: options[option].type,
        },
      ],
    });
    reinitializeActiveInvite(client);
    console.log(chalk.bgGreenBright(`Ready! Logged in as ${client.user.tag}`));
  },
};
