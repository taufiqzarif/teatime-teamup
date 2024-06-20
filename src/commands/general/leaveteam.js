import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { User, Team } from "../../schema/users.js"; // Make sure to import your models

export default {
  data: new SlashCommandBuilder()
    .setName("leaveteam")
    .setDescription("Leave a team"),
  async execute(interaction) {
    try {
      // Fetch the user from your database
      const user = await User.findOne({ userId: interaction.user.id });
 

      console.log("User data:", JSON.stringify(user, null, 2)); // Outputs formatted user data

      const teamss = await Team.find();

    console.log("Teams data:", JSON.stringify(teamss, null, 2)); // Outputs formatted teams data

      if (!user || user.joinedTeams.length === 0) {
        await interaction.reply({
          content: "You are not part of any teams.",
          ephemeral: true,
        });
        return;
      }

      // Filter out teams owned by the user
      const teams = user.joinedTeams.filter(
        (team) =>
          !team.teamId.teamMembers.some(
            (member) => member.userId === interaction.user.id && member.isOwner
          )
      );

      if (teams.length === 0) {
        await interaction.reply({
          content: "You do not have any teams to view that you do not own.",
          ephemeral: true,
        });
        return;
      }

      // Create the select menu
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_team")
        .setPlaceholder("Select a team")
        .addOptions(
          teams.map((team) => ({
            label: team.teamId.teamName,
            description: `Team ID: ${team.teamId._id}`,
            value: team.teamId._id.toString(),
          }))
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.reply({
        content: "Select a team to view details:",
        components: [row],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error in view_teams command:", error);
      await interaction.reply({
        content: "An error occurred while processing your command.",
        ephemeral: true,
      });
    }
  },
};
