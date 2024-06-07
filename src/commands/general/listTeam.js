import { SlashCommandBuilder } from "discord.js";
import Users from "../../schema/users.js";
import { buildCurrentTeamMembersEmbed } from "../../utils/responseUtil.js";

export default {
  data: new SlashCommandBuilder()
    .setName("listteam")
    .setDescription("Users in your team.")
    .addStringOption((option) =>
      option
        .setName("team")
        .setDescription("Enter your team name.")
        .setAutocomplete(true)
        .setRequired(true)
    ),

  async autocomplete(interaction) {
    try {
      const ownerId = interaction.user.id;
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "team") {
        const teamChoices = [];
        const user = await Users.findOne({ userId: ownerId });
        if (user) {
          user.teams.forEach((team) => {
            teamChoices.push({
              name: team.teamName,
              value: team.teamName,
            });
          });
        }

        await interaction.respond(
          teamChoices.map((choice) => ({
            name: choice.name,
            value: choice.value,
          }))
        );
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const ownerId = interaction.user.id;
      const selectedTeam = interaction.options.getString("team");

      const user = await Users.findOne({ userId: ownerId });
      if (!user) {
        await interaction.editReply({
          content:
            "You don't have any teams. To create a team, use `/createteam`.",
          ephemeral: true,
        });
        return;
      }

      const team = user.teams.find((team) => team.teamName === selectedTeam);
      if (!team) {
        await interaction.editReply({
          content: `Team **${selectedTeam}** doesn't exist.`,
          ephemeral: true,
        });
        return;
      }

      const members = team.teamMembers;

      if (!members.length) {
        await interaction.editReply({
          content: `Team **${selectedTeam}** doesn't have any members.`,
          ephemeral: true,
        });
        return;
      }

      await interaction.editReply({
        embeds: [buildCurrentTeamMembersEmbed(selectedTeam, members)],
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
