import { SlashCommandBuilder } from "discord.js";
import Users from "../../schema/users.js";

export default {
  data: new SlashCommandBuilder()
    .setName("allowdirectjoin")
    .setDescription(
      "Allow or disallow other user directly invite you to their teams."
    )
    .addBooleanOption((option) =>
      option
        .setName("allow")
        .setDescription("Allow direct join to user's team.")
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
          canDirectJoin: allow,
        }).save();
      } else if (allow !== user.canDirectJoin) {
        user.canDirectJoin = allow;
        await user.save();
      }

      await interaction.editReply({
        content: `*Allow other user directly invite you to their teams:* ${allow ? "**ENABLED**" : "**DISABLED**"}`,
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
