import {
  SlashCommandBuilder,
  UserSelectMenuBuilder,
  ActionRowBuilder,
} from "discord.js";
import Users from "../../schema/users.js";
import TemporaryTeamName from "../../schema/tempTeamName.js";

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
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const ownerId = interaction.user.id;
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
      }

      await TemporaryTeamName.findOneAndUpdate(
        { ownerId },
        { ownerId, teamName },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId("add_members")
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
