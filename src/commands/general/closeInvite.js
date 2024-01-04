const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Invites = require("../../schema/invites");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("closeinvite")
    .setDescription("Close your active Team Up invite."),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const ownerId = interaction.user.id;

    // Check if there's an existing invite
    const invite = await Invites.findOne({ ownerId: ownerId });
    if (!invite) {
      await interaction.editReply({
        content: "No active Team Up invite found.",
        ephemeral: true,
      });
      return;
    }

    // Delete the invite
    await invite.deleteOne();

    // get the channel id through interaction
    const channelId = interaction.channelId;
    const channel = await client.channels.fetch(channelId);
    const sentMessage = await channel.messages.fetch(invite.messageId);

    // Check if sent message exists
    if (sentMessage) {
      const closedEmbed = new EmbedBuilder(sentMessage.embeds[0])
        .setDescription("**Team Up invite CLOSED!** ❌")
        .setFooter({ text: "Invitation is no longer active." });

      await sentMessage.reactions.removeAll();
      await sentMessage.edit({ embeds: [closedEmbed] });
    }

    // Respond to the interaction
    await interaction.editReply({
      content: `${invite.game} invite closed.`,
      ephemeral: true,
    });
  },
};
