import "dotenv/config";
import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} from "discord.js";
import Invites from "../../schema/invites.js";
import Users from "../../schema/users.js";
import { setupCollectorForInvite } from "../../services/inviteService.js";
import { TIME_LIMIT } from "../../utils/constants.js";

export default {
  data: new SlashCommandBuilder()
    .setName("teamup")
    .setDescription("Create a game team up invitation!")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("The game you want to play!")
        .setRequired(true)
        .setMaxLength(50)
    )
    .addNumberOption((option) =>
      option
        .setName("maxplayers")
        .setDescription(
          "The maximum number of players you want to play with! (2-20)"
        )
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(20)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("The description of your team up!")
        .setRequired(false)
        .setMaxLength(50)
    )
    .addStringOption((option) =>
      option
        .setName("team")
        .setDescription("The team you want to play with!")
        .setAutocomplete(true)
        .setRequired(false)
    ),

  async autocomplete(interaction) {
    try {
      const ownerId = interaction.user.id;
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === "team") {
        const teamChoices = [];
        const user = await Users.findOne({ userId: ownerId });
        if (user) {
          user.teams.forEach((team) => {
            teamChoices.push({
              name: team.teamName,
              value: team.teamName,
            });
          });
        }

        await interaction.respond(
          teamChoices.map((choice) => ({
            name: choice.name,
            value: choice.value,
          }))
        );
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },

  async execute(interaction, client) {
    try {
      const ownerId = interaction.user.id;

      let selectedGame = interaction.options.getString("game");
      // Uppercase first letter of game name
      selectedGame =
        selectedGame.charAt(0).toUpperCase() + selectedGame.slice(1);
      const maxPlayers = interaction.options.getNumber("maxplayers");
      const description = interaction.options.getString("description");
      const selectedTeam = interaction.options.getString("team");
      let targetChannel = interaction.channel;

      let teamMembers = [];
      let isTeamInviteOnly = false;

      if (selectedTeam) {
        const user = await Users.findOne({ userId: ownerId });
        if (user) {
          const team = user.teams.find(
            (team) => team.teamName === selectedTeam
          );
          isTeamInviteOnly = true;
          if (team) {
            teamMembers = team.teamMembers.map((member) => member.userId);
          }
        }
      }

      const randomHexColor = Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");

      // Create custom url for embed thumbnail depends on selectedGame
      // if valorant then use valorant logo, else if lethal company then use lethal company logo, else use default logo
      function getGameThumbnailURL(game) {
        if (game.toLowerCase().includes("valo")) {
          return "https://cdn.discordapp.com/emojis/685247196979134495.webp?size=96&quality=lossless";
        } else if (
          game.toLowerCase().includes("lc") ||
          game.toLowerCase().includes("lethal company")
        ) {
          return "https://cdn.discordapp.com/emojis/1173369632082645072.webp?size=96&quality=lossless";
        } else {
          return null;
        }
      }

      const closeButton = new ButtonBuilder()
        .setCustomId("close_invite")
        .setLabel("Close Invite")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeButton);

      // Check if invite already exists for this user
      const existingInvite = await Invites.findOne({ ownerId: ownerId });
      const gameThumbnailURL = existingInvite
        ? getGameThumbnailURL(existingInvite.game)
        : getGameThumbnailURL(selectedGame);

      if (existingInvite) {
        const existingEmbed = new EmbedBuilder()
          .setColor(`#${randomHexColor}`)
          .setTitle(`${existingInvite.game} Team Up Invitation`)
          .setDescription(existingInvite.description)
          .addFields([
            {
              name: "Host",
              value: `<@${existingInvite.ownerId}>`,
              inline: true,
            },
            {
              name: "Max Players",
              value: existingInvite.maxPlayers.toString(),
              inline: true,
            },
            {
              name: "Players",
              value: existingInvite.players
                .map((player) => `<@${player.userId}>`)
                .join("\n"),
            },
          ])
          .setThumbnail(gameThumbnailURL, { dynamic: true }) // if valorant then use valorant logo, else if lethal company then use lethal company logo, else use default logo
          .setFooter({
            text: `React ✅ to join the team up! Invitation is only valid for ${TIME_LIMIT / 1000 / 60 / 60} hours.`,
          })
          .setTimestamp(Date.parse(existingInvite.createdTime) + TIME_LIMIT);

        await interaction.reply({
          content:
            "You have already created an invite. Please close your existing invite to create a new one.",
          embeds: [existingEmbed],
          components: [row],
          ephemeral: true,
        });
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      // Create new invite document in database and include the owner as a player
      const newInvite = new Invites({
        ownerId: ownerId,
        game: selectedGame,
        description: description,
        players: [
          {
            userId: ownerId,
          },
        ],
        maxPlayers: maxPlayers,
        teamInvite: selectedTeam ? selectedTeam : null,
        expiryTime: Date.now() + TIME_LIMIT,
      });

      // Create private channel for team invite
      if (isTeamInviteOnly) {
        const teamMembersMention = teamMembers.map((member) => `<@${member}>`);
        const teamMembersString = teamMembersMention.join(" ");
        // filter teamMembers that has admin
        const filteredTeamMembers = [];

        // Loop through each team member and fetch their details
        for (const memberId of teamMembers) {
          try {
            // Await the fetch operation to complete
            const memberObject =
              await interaction.guild.members.fetch(memberId);

            // Check if the member does not have ADMINISTRATOR permissions
            if (
              !memberObject.permissions.has(PermissionFlagsBits.Administrator)
            ) {
              filteredTeamMembers.push(memberId); // Add to filtered list if no admin perms
            }
          } catch (error) {
            console.error(`Error fetching member with ID ${memberId}:`, error);
          }
        }

        let permissionOverwrites = [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel], // Deny VIEW_CHANNEL for everyone by default
          },
          {
            id: ownerId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ], // Allow the owner to view and send messages
          },
        ];
        teamMembers.forEach((member) => {
          permissionOverwrites.push({
            id: member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          });
        });
        const teamInviteChannel = await interaction.guild.channels.create({
          name: `${selectedGame.toLowerCase()}-${selectedTeam.toLowerCase()}`,
          type: ChannelType.GuildText,
          permissionOverwrites: permissionOverwrites,
        });
        teamInviteChannel.permissionOverwrites.push;
        await teamInviteChannel.send({
          content: `${teamMembersString}`,
        });
        targetChannel = teamInviteChannel;
      }

      const embed = new EmbedBuilder()
        .setColor(`#${randomHexColor}`)
        .setTitle(`🎮 ${selectedGame} Team Up Invitation`)
        .setDescription(description)
        .addFields([
          { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
          {
            name: "👥 Max Players",
            value: maxPlayers.toString(),
            inline: true,
          },
          { name: "🕹️ Current Team", value: `<@${ownerId}>` },
        ])
        .setThumbnail(gameThumbnailURL, { dynamic: true })
        .setFooter({
          text: `React ✅ to join the team up! Invitation is only valid for ${TIME_LIMIT / 1000 / 60 / 60} hours.`,
        })
        .setTimestamp(Date.now() + TIME_LIMIT);

      const message = await targetChannel.send({
        embeds: [embed],
      });
      newInvite.messageId = message.id;
      newInvite.channelId = targetChannel.id;
      await newInvite.save();

      const joinEmoji = "✅";
      await message.react(joinEmoji);

      const remainingTime = newInvite.expiryTime - Date.now();
      await setupCollectorForInvite(message, newInvite, remainingTime, client);

      await interaction.editReply({
        content: `Team Up invite created! 🎉`,
        ephemeral: true,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: "There was an error while executing this command!",
        ephemeral: true,
      });
    }
  },
};
