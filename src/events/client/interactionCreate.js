import { Events, InteractionType } from "discord.js";
import {
  handleAddNewTeamMembers,
  handleTeamMembers,
  handleKickMembers,
  handleCloseInvite,
  handleErrorMessage,
  handleDeleteTeam,
} from "../../services/teamService.js";

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
      const customId = interaction.customId.includes(":")
        ? interaction.customId.split(":")[0]
        : interaction.customId;

      switch (customId) {
        // Add members when creating a team
        case "add_members":
          await handleTeamMembers(interaction);
          break;

        // Add members to an existing team
        case "add_team_members":
          await handleAddNewTeamMembers(interaction);
          break;

        // Kick member(s) from a team
        case "kick_team_members":
          await handleKickMembers(interaction);
          break;

        // Close existing invite (show close invite button)
        case "close_invite":
          await handleCloseInvite(interaction, client);
          break;

        // Delete a team
        case "delete_team":
          await handleDeleteTeam(interaction);
          break;

        // Default case
        default:
          await handleErrorMessage(interaction);
          break;
      }
    }
  },
};
