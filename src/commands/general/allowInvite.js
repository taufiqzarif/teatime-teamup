import { SlashCommandBuilder } from "discord.js";
import Users from "../../schema/users.js";

export default {
  data: new SlashCommandBuilder()
    .setName("allowinvite")
    .setDescription(
      "Allow or disallow other user to invite you to their teams."
    )
    .addBooleanOption((option) =>
      option
        .setName("allow")
        .setDescription("Allow invite to user's team.")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const ownerId = interaction.user.id;
      const allow = interaction.options.getBoolean("allow");

      let user = await Users.findOne({ userId: ownerId });

      if (!user) {
        user = await new Users({
          userId: ownerId,
          canBeInvited: allow,
        }).save();
      } else if (allow !== user.canBeInvited) {
        user.canBeInvited = allow;
        await user.save();
      }

      await interaction.editReply({
        content: `*Allow other user invite you to their teams:* ${allow ? "**ENABLED**" : "**DISABLED**"}`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
