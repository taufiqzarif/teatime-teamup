import { PermissionsBitField } from "discord.js";

async function checkBotPermissions(interaction, channel) {
  const requiredPermissions = [
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ManageMessages,
    PermissionsBitField.Flags.AddReactions,
    PermissionsBitField.Flags.ManageChannels,
  ];

  const missingBotPermissions = channel
    .permissionsFor(channel.guild.members.me)
    .missing(requiredPermissions);

  if (missingBotPermissions.length > 0) {
    const missing = missingBotPermissions
      .map((perm) => PermissionsBitField.Flags[perm] || perm)
      .join(", ");

    const warningMessage = `I am missing the following permissions in the channel: ${missing}`;

    try {
      if (!interaction) {
        await channel.send(warningMessage);
        return false;
      }

      await interaction.editReply({
        content: warningMessage,
        ephemeral: true,
      });

      return false;
    } catch (err) {
      console.error(err);
    }
  } else {
    return true;
  }
}

export default checkBotPermissions;
