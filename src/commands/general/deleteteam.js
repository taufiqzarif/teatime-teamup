import {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import Users from "../../schema/users.js";

export default {
  data: new SlashCommandBuilder()
    .setName("deleteteam")
    .setDescription("Delete a existing team"),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const ownerId = interaction.user.id;

      const user = await Users.findOne({ userId: ownerId });
      if (!user) {
        await interaction.editReply({
          content:
            "You don't have any teams. To create a team, use `/createteam`.",
          ephemeral: true,
        });
        return;
      }

      const actionRow = new ActionRowBuilder().setComponents(
        new StringSelectMenuBuilder()
          .setCustomId("delete_team")
          .setPlaceholder("Delete team")
          .setOptions(
            user.teams.map((team) => ({
              label: team.teamName,
              value: team.teamName,
            }))
          )
      );

      await interaction.editReply({
        content: "Select team to delete",
        components: [actionRow.toJSON()],
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
