const { SlashCommandBuilder, EmbedBuilder, UserSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const Users = require("../../schema/users");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("createteam")
        .setDescription("Create your team.")
        .addStringOption((option) => 
            option
                .setName("teamname")
                .setDescription("Enter your team name.")
                .setRequired(true)    
        ),
    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true });
        const ownerId = interaction.user.id;
        const teamName = interaction.options.getString("teamname");

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
        // // Check if document user exists
        // const user = await Users.findOne({ userId: ownerId });
        // if (!user) {
        //     // Create a new document
        //     const newUser = new Users({
        //         userId: ownerId,
        //         teams: [
        //             {
        //                 teamName: teamName,
        //                 teamMembers: [
        //                     {
        //                         userId: teamMembers,
        //                     },
        //                 ],
        //             },
        //         ],
        //     });
        //     await newUser.save();
        //     await interaction.editReply({
        //         content: `Team ${teamName} created with ${teamMembers}. 🎉`,
        //         ephemeral: true,
        //     });
        //     return;
        // }

        // // Check if member already in the team
        // if (user.teams.teamMembers.userId === teamMembers) {
        //     await interaction.editReply({
        //         content: "Member already in the team.",
        //         ephemeral: true,
        //     });
        //     return;
        // }

        // await interaction.editReply({
        //     content: `Already have a team.`,
        //     ephemeral: true,
        // })
    }
}