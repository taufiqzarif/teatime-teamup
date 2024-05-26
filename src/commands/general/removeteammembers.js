import {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} from "discord.js";
import Users from "../../schema/users";

export default {
  data: new SlashCommandBuilder()
    .setName("removeteammembers")
    .setDescription("Remove team members."),

  async execute(interaction, client) {
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
        .setCustomId("remove_team_members")
        .setPlaceholder("Select team")
        .setOptions(
          user.teams.map((team) => ({
            label: team.teamName,
            value: team.teamName,
          }))
        )
    );

    await interaction.editReply({
      content: "Select team",
      components: [actionRow.toJSON()],
      ephemeral: true,
    });
  },
};
