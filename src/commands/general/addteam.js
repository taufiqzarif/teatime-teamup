const { SlashCommandBuilder, UserSelectMenuBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const Users = require("../../schema/users");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addteam")
        .setDescription("Add team members."),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const ownerId = interaction.user.id;

        const user = await Users.findOne({ userId: ownerId });
        if (!user) {
            await interaction.editReply({
                content: "You don't have any teams. To create a team, use `/createteam`.",
                ephemeral: true,
            });
            return;
        }

        const actionRow = new ActionRowBuilder().setComponents(
            new StringSelectMenuBuilder().setCustomId("add_team_members").setPlaceholder("Select team")
            .setOptions(user.teams.map((team) => ({
                label: team.teamName,
                value: team.teamName,
            }))
        ));
        
        await interaction.editReply({
            content: "Select team",
            components: [actionRow.toJSON()],
            ephemeral: true,
        });
    },
}