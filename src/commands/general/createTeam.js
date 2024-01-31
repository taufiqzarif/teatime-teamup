const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const Users = require("../../schema/users");
const TemporaryTeamName = require("../../schema/tempTeamName");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("createteam")
        .setDescription("Create your team.")
        .addStringOption((option) => 
            option
                .setName("teamname")
                .setDescription("Enter your team name.")
                .min_length(3)
                .max_length(20)
                .setRequired(true)    
        ),
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const ownerId = interaction.user.id;
        const teamName = interaction.options.getString("teamname");

        const user = await Users.findOne({ userId: ownerId });
        if (user && user.teams.length > 2) {
            await interaction.editReply({
                content: "Already have 3 teams (MAX)!",
                ephemeral: true,
            });
            return;
        }

        // Check if there's an existing team name
        const existingTeamName = await Users.findOne({ "teams.teamName": teamName });
        if (existingTeamName) {
            await interaction.editReply({
                content: `Team name **${teamName}** already exists.`,
                ephemeral: true,
            });
            return;
        }
        

        await TemporaryTeamName.findOneAndUpdate(
            { ownerId },
            { ownerId, teamName },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        

        const selectMenu = new UserSelectMenuBuilder()
            .setCustomId("team_members")
            .setPlaceholder("Select team members")
            .setMinValues(1)
            .setMaxValues(10);
        
        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        await interaction.editReply({
            content: "Select team members.",
            components: [row],
            ephemeral: true,
        });
    }
}