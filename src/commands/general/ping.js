import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("testping")
    .setDescription("Replies with Pong!"),
  async execute(interaction, client) {
    try {
      await interaction.deferReply({
        ephemeral: true,
      });

      await interaction.editReply({
        content: `Pong! ${client.ws.ping}ms`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
