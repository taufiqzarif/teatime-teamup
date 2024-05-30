import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Invites from "../../schema/invites.js";

const protectedChannels = [
  "739872603170144386",
  "1159544686093021325",
  "695589856964902952",
];

export default {
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

      await interaction.editReply({
        content: `${invite.game} invite closed.`,
        ephemeral: true,
      });

      // Delete the private channel
      if (isTeamInviteOnly && !protectedChannels.includes(privateChannelId)) {
        const privateChannel = await client.channels.fetch(privateChannelId);
        await privateChannel.delete();
      }

      return;
    } catch (err) {
      console.log(err);
    }
  },
};
