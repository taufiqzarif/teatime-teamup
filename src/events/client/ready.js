import chalk from "chalk";
import { ActivityType } from "discord.js";
import { reinitializeActiveInvite } from "../../services/inviteService.js";

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
    try {
      await reinitializeActiveInvite(client);
    } catch (error) {
      console.error('Error during reinitializing active invites:', error);
      // Shutdown the bot
      process.exit(1);
    }
    console.log(chalk.bgGreenBright(`Ready! Logged in as ${client.user.tag}`));
  },
};
