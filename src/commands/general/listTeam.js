import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Users from "../../schema/users";
import TemporaryTeamName from "../../schema/tempTeamName";

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

  async autocomplete(interaction, client) {
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
  async execute(interaction, client) {
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
    const memberList = members.map((member) => `<@${member.userId}>`);
    const embed = new EmbedBuilder()
      .setTitle(`Team: ${selectedTeam}`)
      .setDescription(memberList.join("\n"))
      .setColor("#5865F2");

    await interaction.editReply({
      embeds: [embed],
      ephemeral: true,
    });
  },
};
