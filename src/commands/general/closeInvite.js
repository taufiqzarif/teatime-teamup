const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Invites = require("../../schema/invites");
const protectedChannels = ["739872603170144386", "1159544686093021325", "695589856964902952"]

module.exports = {
  data: new SlashCommandBuilder()
    .setName("closeinvite")
    .setDescription("Close your active Team Up invite."),
  async execute(interaction, client) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const ownerId = interaction.user.id;
      let isTeamInviteOnly = false;
      let privateChannelId = null;
      // Check if there's an existing invite
      const invite = await Invites.findOne({ ownerId: ownerId });
      if (!invite) {
        await interaction.editReply({
          content: "No active Team Up invite found.",
          ephemeral: true,
        });
        return;
      }
      if (invite.teamInvite !== null) {
        isTeamInviteOnly = true;
        privateChannelId = invite.channelId;
      }

      // Delete the invite
      await invite.deleteOne();

      // get the channel id through interaction
      const channelId = invite.channelId;
      const channel = await client.channels.fetch(channelId);
      const sentMessage = await channel.messages.fetch(invite.messageId);

      // Check if sent message exists
      if (sentMessage) {
        let description = sentMessage.embeds[0].description || "";

        const fullText = "**Team Up FULL! GLHF! 🎉**";
        if (description.includes(fullText)) {
          description = description.replace(fullText, "").trim();
        }

        const updatedDescription = `**Team Up invite CLOSED!** ❌\n\n${description}`;
        const closedEmbed = new EmbedBuilder(sentMessage.embeds[0])
          .setDescription(updatedDescription)
          .setFooter({ text: "Invitation is no longer active." });

        await sentMessage.reactions.removeAll();
        await sentMessage.edit({ embeds: [closedEmbed] });
      } else {
        await interaction.editReply({
          content: "No active Team Up invite found.",
          ephemeral: true,
        });
      }

      // Delete the private channel
      if (isTeamInviteOnly && !protectedChannels.includes(privateChannelId)) {
        const privateChannel = await client.channels.fetch(privateChannelId);
        await privateChannel.delete();
      }

      // Respond to the interaction
      //? fix cause of error, unknown message sometimes
      await interaction.editReply({
        content: `${invite.game} invite closed.`,
        ephemeral: true,
      });
    } catch (err) {
      console.log(err);
    }
  },
};
