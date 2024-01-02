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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("teamup")
    .setDescription("Create a game team up invitation!")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("The game you want to play!")
        .setRequired(true)
        .setMaxLength(100)
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
    ),

  async execute(interaction, client) {
    try {
      await interaction.deferReply({});

      const ownerId = interaction.user.id;
      const selectedGame = interaction.options.getString("game");
      const maxPlayers = interaction.options.getNumber("maxplayers");
      const randomHexColor = Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0");

      // Create custom url for embed thumbnail depends on selectedGame
      // if valorant then use valorant logo, else if lethal company then use lethal company logo, else use default logo
      const gameThumbnailURL =
        selectedGame.toLowerCase().includes("valo") ||
        selectedGame.toLowerCase().includes("valorant")
          ? "https://cdn.discordapp.com/emojis/685247196979134495.webp?size=96&quality=lossless"
          : selectedGame.toLowerCase().includes("lc") ||
            selectedGame.toLowerCase().includes("lethal company")
          ? "https://cdn.discordapp.com/emojis/1173369632082645072.webp?size=96&quality=lossless"
          : null;
      const cancelButton = new ButtonBuilder()
        .setCustomId("cancel_invite")
        .setLabel("Cancel Invite")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(cancelButton);

      // Check if invite already exists for this user
      const existingInvite = await Invites.findOne({ ownerId: ownerId });
      if (existingInvite) {
        const existingEmbed = new EmbedBuilder()
          .setColor(`#${randomHexColor}`)
          .setTitle(`${existingInvite.game} Team Up Invitation`)
          .addFields([
            {
              name: "Max Players",
              value: existingInvite.maxPlayers.toString(),
              inline: true,
            },
            {
              name: "Host",
              value: `<@${existingInvite.ownerId}>`,
              inline: true,
            },
            {
              name: "Players",
              value: existingInvite.players
                .map((player) => `<@${player.userId}>`)
                .join("\n"),
            },
          ])
          .setThumbnail(gameThumbnailURL, { dynamic: true })
          .setFooter({
            text: "React ✅ to join the team up! Invitation is only valid for 1 hour.",
          })
          .setTimestamp(existingInvite.timestamp);
        await interaction.editReply({
          content:
            "You have already created an invite. Please cancel your existing invite to create a new one.",
          embeds: [existingEmbed],
          components: [row],
        });
        return;
      }

      // Create new invite document in database and include the owner as a player
      const newInvite = new Invites({
        ownerId: ownerId,
        game: selectedGame,
        players: [
          {
            userId: ownerId,
          },
        ],
        maxPlayers: maxPlayers,
      });
      await newInvite.save();
      const embed = new EmbedBuilder()
        .setColor(`#${randomHexColor}`)
        .setTitle(`🎮 ${selectedGame} Team Up Invitation`)
        .addFields([
          {
            name: "👥 Max Players",
            value: maxPlayers.toString(),
            inline: true,
          },
          { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
          { name: "🕹️ Current Team", value: `<@${ownerId}>` },
        ])
        .setThumbnail(gameThumbnailURL, { dynamic: true })
        .setFooter({
          text: "React ✅ to join the team up! Invitation is only valid for 1 hour.",
        })
        .setTimestamp();

      const message = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
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
        time: 3_600_000,
        dispose: true,
      });

      collector.on("collect", async (reaction, user) => {
        // console.log(`Collected ${reaction.emoji.name} from ${user.tag}`);
        // Fetch the invite from the database
        const invite = await Invites.findOne({ ownerId: ownerId });

        // Check if the maximum number of players has been reached
        if (invite.players.length >= maxPlayers) {
          // Optionally, you can remove the reaction if max players reached
          reaction.users.remove(user);
          return; // Stop execution as the max number of players has been reached
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
        const updatedEmbed = new EmbedBuilder()
          .setColor(`#${randomHexColor}`)
          .setTitle(`🎮 ${selectedGame} Team Up Invitation`)
          .addFields([
            {
              name: "👥 Max Players",
              value: maxPlayers.toString(),
              inline: true,
            },
            { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
            { name: "🕹️ Current Team", value: updatedPlayers },
          ])
          .setTimestamp(updatedInvite.timestamp)
          .setThumbnail(gameThumbnailURL, { dynamic: true })
          .setFooter({
            text: "React ✅ to join the team up! Invitation is only valid for 1 hour.",
          });
        await message.edit({ embeds: [updatedEmbed] });
      });

      collector.on("remove", async (reaction, user) => {
        // console.log(`User ${user.tag} removed their reaction.`);
        // Fetch the invite from the database
        const invite = await Invites.findOne({ ownerId: ownerId });

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
          .addFields([
            {
              name: "👥 Max Players",
              value: maxPlayers.toString(),
              inline: true,
            },
            { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
            { name: "🕹️ Current Team", value: updatedPlayers },
          ])
          .setTimestamp(updatedInvite.timestamp)
          .setThumbnail(gameThumbnailURL, { dynamic: true })
          .setFooter({
            text: "React ✅ to join the team up! Invitation is only valid for 1 hour.",
          });

        // Edit the original message with the updated embed
        await message.edit({ embeds: [updatedEmbed] });
      });

      // When the collector timer ends, delete the invite from the database
      collector.on("end", async () => {
        const invite = await Invites.findOne({ ownerId: ownerId });
        if (invite) {
          const currentPlayers = invite.players
            .map((player) => `<@${player.userId}>`)
            .join("\n");
          const expiredEmbed = new EmbedBuilder()
            .setColor(`#${randomHexColor}`)
            .setTitle(`🎮 ${selectedGame} Team Up Invitation`)
            .setDescription("This team up invitation has expired!")
            .addFields([
              {
                name: "👥 Max Players",
                value: maxPlayers.toString(),
                inline: true,
              },
              { name: "👤 Host", value: `<@${ownerId}>`, inline: true },
              { name: "🕹️ Current Team", value: currentPlayers },
            ])
            .setThumbnail(gameThumbnailURL, { dynamic: true })
            .setTimestamp();
          await invite.deleteOne();
          await message.edit({ embeds: [expiredEmbed], components: [] });
        }
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
