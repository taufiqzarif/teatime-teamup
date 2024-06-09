import { Events, InteractionType, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import {
  handleAddNewTeamMembers,
  // handleTeamMembers,
  handleKickMembers,
  handleCloseInvite,
  handleErrorMessage,
  handleDeleteTeam,
  handleAcceptRejectTeamInvite,
} from "../../services/teamService.js";
dotenv.config();

export default {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const { commands } = client;
      const { commandName } = interaction;
      const command = commands.get(commandName);

      if (!command) {
        console.error(`No command matching ${commandName} was found!`);
        return;
      }

      try {
        await command.execute(interaction, client);
      } catch (error) {
        console.error(`Error executing ${commandName}!`);
        console.error(error);
        await interaction.reply({
          content: `Error executing ${commandName}`,
          ephemeral: true,
        });
      }
    } else if (interaction.isContextMenuCommand()) {
      const { contextMenus } = client;
      const { commandName } = interaction;
      const contextMenu = contextMenus.get(commandName);
      if (!contextMenu)
        return new Error(`No context menu matching ${commandName} was found!`);

      try {
        await contextMenu.execute(interaction, client);
      } catch (error) {
        console.error(`Error executing ${commandName}!`);
        console.error(error);
        const errorChannel = client.channels.cache.get(
          process.env.ERROR_LOG_CHANNEL_ID
        );
        if (errorChannel) {
          const embed = new EmbedBuilder()
            .setTitle(`Error executing ${commandName}`)
            .setDescription("An error occurred while executing the command")
            .addFields({ name: "Error command", value: commandName })
            .addFields({ name: "Error message", value: error.message })
            .addFields({ name: "Error stack", value: error.stack })
            .addFields({
              name: "Error timestamp",
              value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            })
            .addFields({
              name: "Command executed by",
              value: `<@${interaction.user.id}>`,
            })
            .setColor("#ff0000")
            .setFooter({ text: "Error Log System" })
            .setTimestamp();

          errorChannel.send({ embeds: [embed] });
        }

        await interaction.reply({
          content: `Error executing ${commandName}`,
          ephemeral: true,
        });
      }
    } else if (
      interaction.type == InteractionType.ApplicationCommandAutocomplete
    ) {
      const { commands } = client;
      const { commandName } = interaction;
      const command = commands.get(commandName);
      if (!command) return;

      try {
        await command.autocomplete(interaction, client);
      } catch (error) {
        console.error(`Error executing ${commandName}!`);
        console.error(error);
      }
    } else if (
      interaction.isButton() ||
      interaction.isUserSelectMenu() ||
      interaction.isStringSelectMenu()
    ) {
      try {
        const customId = interaction.customId.includes(":")
          ? interaction.customId.split(":")[0]
          : interaction.customId;

        switch (customId) {
          // Add members when creating a team
          // case "add_members":
          //   await handleTeamMembers(interaction, client);
          //   break;

          // Add members to an existing team
          case "add_team_members":
            await handleAddNewTeamMembers(interaction, client);
            break;

          // Kick member(s) from a team
          case "kick_team_members":
            await handleKickMembers(interaction, client);
            break;

          // Close existing invite (show close invite button)
          case "close_invite":
            await handleCloseInvite(interaction, client);
            break;

          // Delete a team
          case "delete_team":
            await handleDeleteTeam(interaction, client);
            break;
          
          // Accept / Reject invite
          case "prompt_team_invite":
            await handleAcceptRejectTeamInvite(interaction, client);
            break;

          // Default case
          default:
            await handleErrorMessage(interaction, client);
            break;  
        }
      } catch (error) {
        console.error(`Error executing ${interaction.customId}!`);
        console.error(error);
        const errorChannel = client.channels.cache.get(
          process.env.ERROR_LOG_CHANNEL_ID
        );
        if (errorChannel) {
          const embed = new EmbedBuilder()
            .setTitle(`Error executing ${interaction.customId}`)
            .setDescription("An error occurred while executing customId")
            .addFields({ name: "Error command", value: interaction.customId })
            .addFields({ name: "Error message", value: error.message })
            .addFields({ name: "Error stack", value: error.stack })
            .addFields({
              name: "Error timestamp",
              value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            })
            .addFields({
              name: "Command executed by",
              value: `<@${interaction.user.id}>`,
            })
            .setColor("#ff0000")
            .setFooter({ text: "Error Log System" })
            .setTimestamp();

          errorChannel.send({ embeds: [embed] });
        }
        await interaction.reply({
          content: `Error executing customId`,
          ephemeral: true,
        });
      }
    }
  },
};
