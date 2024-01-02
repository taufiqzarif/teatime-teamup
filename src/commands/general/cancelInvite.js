const { SlashCommandBuilder } = require('discord.js');
const Invites = require("../../schema/invites");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cancelinvite")
        .setDescription("Cancel your active invite."),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const ownerId = interaction.user.id;

        // Check if there's an existing invite
        const invite = await Invites.findOne({ ownerId: ownerId });
        if (!invite) {
        await interaction.editReply({
            content: "No active invite found.",
            ephemeral: true,
        });
        return;
        }
    
        // Delete the invite
        await invite.deleteOne();
    
        // Respond to the interaction
        await interaction.editReply({
        content: `${invite.game} invite cancelled.`,
        ephemeral: true,
        });
    },
    };