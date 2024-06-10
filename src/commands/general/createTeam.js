import {
  SlashCommandBuilder,
  UserSelectMenuBuilder,
  ActionRowBuilder,
} from "discord.js";
import Users from "../../schema/users.js";
import { logNewUser } from "../../utils/logger.js";

export default {
  data: new SlashCommandBuilder()
    .setName("createteam")
    .setDescription("Create your team.")
    .addStringOption((option) =>
      option
        .setName("teamname")
        .setDescription("Enter your team name.")
        .setMinLength(3)
        .setMaxLength(20)
        .setRequired(true)
    ),
  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const ownerId = interaction.user.id;
      const guildId = interaction.guild.id;
      const teamName = interaction.options.getString("teamname");

      const user = await Users.findOne({ userId: ownerId });

      if (user) {
        if (user.userId !== "834638969945587712" && user.teams.length >= 3) {
          await interaction.editReply({
            content: "You already have 3 teams (MAX)!",
            ephemeral: true,
          });
          return;
        }

        const existingTeamName = user.teams.find(
          (team) => team.teamName === teamName
        );
        if (existingTeamName) {
          await interaction.editReply({
            content: `Team name **${teamName}** already exists.`,
            ephemeral: true,
          });
          return;
        }

        user.teams.push({ guildId, teamName });
        await user.save();
      } else {
        await new Users({
          userId: ownerId,
          teams: [{ guildId, teamName }],
        }).save();

        await logNewUser(client, ownerId, true);
      }

      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId(`add_team_members:${teamName}:true`)
        .setPlaceholder("Select team members")
        .setMinValues(1)
        .setMaxValues(10);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.editReply({
        content: "Select team members.",
        components: [row],
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "An error occurred while creating the team.",
        ephemeral: true,
      });
    }
  },
};
