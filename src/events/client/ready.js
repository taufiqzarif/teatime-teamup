import "dotenv/config";
import chalk from "chalk";
import { ActivityType } from "discord.js";
import { reinitializeActiveInvite } from "../../utils/inviteCollectors.js";

export default {
  name: "ready",
  once: true,
  async execute(client) {
    const options = [
      {
        type: ActivityType.Playing,
        text: "/teamup | /createteam",
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
