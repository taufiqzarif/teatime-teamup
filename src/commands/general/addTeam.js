const {
  SlashCommandBuilder,
  EmbedBuilder,
  UserSelectMenuBuilder,
  ActionRowBuilder,
} = require("discord.js");
const Users = require("../../schema/users");
const TemporaryTeamName = require("../../schema/tempTeamName");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addteam")
    .setDescription("Add user team.")
    .addStringOption((option) =>
      option
        .setName("team")
        .setDescription("Enter your team name.")
        .setAutocomplete(true)
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Add user to your team.")
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
        content: "You don't have any teams.",
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

    const selectedUser = interaction.options.getUser("user");
    const selectedUserId = selectedUser.id;

    const existingUser = team.teamMembers.find(
      (member) => member.userId === selectedUserId
    );
    if (existingUser) {
      await interaction.editReply({
        content: `User **${selectedUser.username}** is already in ${selectedTeam}.`,
        ephemeral: true,
      });
      return;
    }

    const teamMembers = team.teamMembers;
    teamMembers.push({
      userId: selectedUserId,
    });

    await Users.findOneAndUpdate(
      { userId: ownerId, "teams.teamName": selectedTeam },
      { "teams.$.teamMembers": teamMembers },
      { new: true }
    );

    await interaction.editReply({
      content: `User **${selectedUser.username}** has been added to ${selectedTeam}.`,
      ephemeral: true,
    });
  },
};
