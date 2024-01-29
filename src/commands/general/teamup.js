require("dotenv").config();
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Invites = require("../../schema/invites");
const { CLIENT_ID } = process.env;

const TIME_LIMIT = 5000; // 2 hours in milliseconds

module.exports = {
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
    ),

  async execute(interaction, client) {
    try {
      const ownerId = interaction.user.id;

      let selectedGame = interaction.options.getString("game");
      // Uppercase first letter of game name
      selectedGame =
        selectedGame.charAt(0).toUpperCase() + selectedGame.slice(1);
      const maxPlayers = interaction.options.getNumber("maxplayers");
      const description = interaction.options.getString("description");
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
      };

      const closeButton = new ButtonBuilder()
        .setCustomId("close_invite")
        .setLabel("Close Invite")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(closeButton);

      // Check if invite already exists for this user
      const existingInvite = await Invites.findOne({ ownerId: ownerId });
      const gameThumbnailURL = existingInvite ? getGameThumbnailURL(existingInvite.game) : getGameThumbnailURL(selectedGame);

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
            text: "React ✅ to join the team up! Invitation is only valid for 2 hour.",
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
      await interaction.deferReply();
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
        expiryTime: Date.now() + TIME_LIMIT,
      });

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
          text: "React ✅ to join the team up! Invitation is only valid for 2 hour.",
        })
        .setTimestamp(Date.now() + TIME_LIMIT);

      const message = await interaction.editReply({
        embeds: [embed],
      });
      newInvite.messageId = message.id;
      newInvite.channelId = message.channelId;
      await newInvite.save();

      const messageFetch = await interaction.channel.messages.fetch(message.id);
      // console.log("Fetched message:", message);
      const joinEmoji = "✅"; // Replace with the emoji you want to use
      await messageFetch.react(joinEmoji);

      const filterUser = (reaction, user) => {
        return (
          reaction.emoji.name === joinEmoji &&
          user.id !== ownerId &&
          !user.bot &&
          user.id !== CLIENT_ID
        );
      };

      const collector = message.createReactionCollector({
        filter: filterUser,
        time: TIME_LIMIT,
        dispose: true,
      });

      collector.on("collect", async (reaction, user) => {
        // console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);

        const invite = await Invites.findOne({ ownerId: ownerId });

        // Check if the invite still exists
        if (!invite) {
          return;
        }

        // Check if the maximum number of players has been reached
        if (invite.players.length >= maxPlayers) {
          reaction.users.remove(user);
          return;
        }

        // Check if the user is already in the players list
        if (!invite.players.find((player) => player.userId === user.id)) {
          // Add the user to the players list
          invite.players.push({ userId: user.id });

          // Save the updated invite
          await invite.save();
        }
        const updatedInvite = await Invites.findOne({ ownerId: ownerId });
        const updatedPlayers = updatedInvite.players
          .map((player) => `<@${player.userId}>`)
          .join("\n");

        // Show different embed if the maximum number of players has been reached
        if (updatedInvite.players.length === maxPlayers) {
          // show 2 description, 1st description is the original description, 2nd description is the full description
          const fullEmbed = new EmbedBuilder()
            .setColor(`#${randomHexColor}`)
            .setTitle(`🎮 ${selectedGame} Team Up Invitation`)
            .setDescription(
              `**Team Up FULL! GLHF! 🎉**\n\n${
                updatedInvite.description ?? " "
              }`
            )
            .addFields([
              { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
              {
                name: "👥 Max Players",
                value: maxPlayers.toString(),
                inline: true,
              },
              { name: "🕹️ Current Team", value: updatedPlayers },
            ])
            .setThumbnail(gameThumbnailURL, { dynamic: true })
            .setTimestamp(Date.parse(updatedInvite.createdTime) + TIME_LIMIT)
            .setFooter({
              text: "Team Up is currently full.",
            });
          await message.edit({ embeds: [fullEmbed] });
        } else {
          const updatedEmbed = new EmbedBuilder()
            .setColor(`#${randomHexColor}`)
            .setTitle(`🎮 ${selectedGame} Team Up Invitation`)
            .setDescription(updatedInvite.description)
            .addFields([
              { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
              {
                name: "👥 Max Players",
                value: maxPlayers.toString(),
                inline: true,
              },
              { name: "🕹️ Current Team", value: updatedPlayers },
            ])
            .setTimestamp(Date.parse(updatedInvite.createdTime) + TIME_LIMIT)
            .setThumbnail(gameThumbnailURL, { dynamic: true })
            .setFooter({
              text: "React ✅ to join the team up! Invitation is only valid for 2 hour.",
            });
          await message.edit({ embeds: [updatedEmbed] });
        }
      });

      collector.on("remove", async (reaction, user) => {
        // console.log(`User ${user.tag} removed their reaction.`);
        // Fetch the invite from the database
        const invite = await Invites.findOne({ ownerId: ownerId });

        // Check if the invite still exists
        if (!invite) {
          return;
        }

        // Check if the user is in the players list and remove them
        invite.players = invite.players.filter(
          (player) => player.userId !== user.id
        );

        // Save the updated invite
        await invite.save();

        // Refetch the updated invite from the database
        const updatedInvite = await Invites.findOne({ ownerId: ownerId });
        const updatedPlayers = updatedInvite.players
          .map((player) => `<@${player.userId}>`)
          .join("\n");

        // Create the updated embed
        const updatedEmbed = new EmbedBuilder()
          .setColor(`#${randomHexColor}`)
          .setTitle(`🎮 ${selectedGame} Team Up Invitation`)
          .setDescription(updatedInvite.description)
          .addFields([
            { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
            {
              name: "👥 Max Players",
              value: maxPlayers.toString(),
              inline: true,
            },
            { name: "🕹️ Current Team", value: updatedPlayers },
          ])
          .setTimestamp(Date.parse(updatedInvite.createdTime) + TIME_LIMIT)
          .setThumbnail(gameThumbnailURL, { dynamic: true })
          .setFooter({
            text: "React ✅ to join the team up! Invitation is only valid for 2 hour.",
          });

        // Edit the original message with the updated embed
        await message.edit({ embeds: [updatedEmbed] });
      });

      // When the collector timer ends, delete the invite from the database
      collector.on("end", async () => {
        const invite = await Invites.findOne({ ownerId: ownerId });
        if (invite) {
          const embedData = message.embeds[0];
          const currentPlayers = invite.players
            .map((player) => `<@${player.userId}>`)
            .join("\n");
          const expiredEmbed = new EmbedBuilder()
            .setColor(`#${randomHexColor}`)
            .setTitle(`🎮 ${selectedGame} Team Up Invitation`)
            .setDescription(
              `**Team Up invite EXPIRED! ❌**\n\n${embedData.description === null ? "" : embedData.description}`
            )
            .addFields([
              { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
              {
                name: "👥 Max Players",
                value: maxPlayers.toString(),
                inline: true,
              },
              { name: "🕹️ Current Team", value: currentPlayers },
            ])
            .setFooter({
              text: "Invitation is no longer active.",
            })
            .setThumbnail(gameThumbnailURL, { dynamic: true })
            .setTimestamp();
          await invite.deleteOne();

          try {
            await message.reactions.removeAll();
            await message.edit({ embeds: [expiredEmbed], components: [] });
          } catch (error) {
            if (error.code === 10008) {
              return;
            }
            console.error("Error updating expired invite message:", error);
          }
        }
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
