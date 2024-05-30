import { EmbedBuilder } from "discord.js";
import Invites from "../schema/invites.js";
import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config();

const { CLIENT_ID } = process.env;

export async function setupCollectorForInvite(
  message,
  invite,
  remainingTime,
  client
) {
  console.log(chalk.yellowBright("Setting up collector for invite..."));
  const hostId = invite.ownerId;
  const joinEmoji = "✅";
  const isTeamInviteOnly = invite.teamInvite !== null;

  const filterUser = (reaction, user) => {
    return (
      reaction.emoji.name === joinEmoji &&
      user.id !== hostId &&
      !user.bot &&
      user.id !== CLIENT_ID
    );
  };

  const collector = message.createReactionCollector({
    filter: filterUser,
    time: remainingTime,
    dispose: true,
  });

  // Collector events
  collector.on("collect", async (reaction, user) => {
    const invite = await Invites.findOne({ ownerId: hostId });

    // Check if the invite still exists
    if (!invite) {
      return;
    }

    // Check if the maximum number of players has been reached
    if (invite.players.length >= invite.maxPlayers) {
      reaction.users.remove(user);
      return;
    }

    // Check if the user is not in the invite
    if (!invite.players.find((player) => player.userId === user.id)) {
      invite.players.push({ userId: user.id });
      await invite.save();
    }

    const updatedPlayers = invite.players
      .map((player) => `<@${player.userId}>`)
      .join("\n");

    const embedData = message.embeds[0];
    const embed = new EmbedBuilder(embedData);
    // console.log(embed);
    // console.log(embed.data.fields);
    embed.data.fields[2].value = updatedPlayers;

    // If reached maximum number of players, update description and footer
    if (invite.players.length === invite.maxPlayers) {
      embed.setDescription(
        `**Team Up FULL! GLHF! 🎉**\n\n${invite.description ?? ""}`
      );
      embed.setFooter({ text: "Team Up is currently full!" });
    }

    if (message.author.bot) {
      await message.edit({ embeds: [embed] });
    } else {
      console.log(chalk.redBright("Message author is not a bot!"));
    }
  });

  collector.on("remove", async (reaction, user) => {
    const invite = await Invites.findOne({ ownerId: hostId });

    // Check if the invite still exists
    if (!invite) {
      return;
    }

    // Check if the user is in the players list and remove them
    invite.players = invite.players.filter(
      (player) => player.userId !== user.id
    );

    await invite.save();

    const updatedPlayers = invite.players
      .map((player) => `<@${player.userId}>`)
      .join("\n");

    const embedData = message.embeds[0];
    const embed = new EmbedBuilder(embedData);
    embed.data.fields[2].value = updatedPlayers;

    // If the team is not full, update the description back to the original
    if (invite.players.length < invite.maxPlayers) {
      console.log(embed.data);
      if (invite.description) {
        embed.setDescription(`${invite.description}`);
      } else {
        embed.setDescription(null);
      }
    }

    // If the team is not full, update the footer
    embed.setFooter({
      text: "React ✅ to join the team up! Invitation is only valid for 2 hour.",
    });

    await message.edit({ embeds: [embed] });
  });

  collector.on("end", async () => {
    const invite = await Invites.findOne({ ownerId: hostId });

    if (invite) {
      const embedData = message.embeds[0];
      const embed = new EmbedBuilder(embedData);
      embed.setDescription(
        `**Team Up invite EXPIRED! ❌**\n\n${invite.description ?? ""}`
      );
      embed.setFooter({ text: "Invitation is no longer active" });
      await message.reactions.removeAll();
      await message.edit({ embeds: [embed], components: [] });
      await invite.deleteOne();

      if (isTeamInviteOnly) {
        const channel = await client.channels.fetch(invite.channelId);
        if (channel) {
          await channel.delete();
        }
      }
    }
  });

  console.log(chalk.greenBright("Collector setup complete!"));
}

export async function reinitializeActiveInvite(client) {
  console.log(chalk.yellowBright("Reinitializing active invites..."));
  try {
    const activeInvites = await Invites.find({
      expiryTime: { $gt: Date.now() },
    });
    console.log(
      chalk.bgMagenta(`Total active invites: ${activeInvites.length}`)
    );
    for (const invite of activeInvites) {
      const remainingTime = invite.expiryTime - Date.now();
      const channel = await client.channels.fetch(invite.channelId);
      const message = await channel.messages
        .fetch(invite.messageId)
        .catch(() => null);

      if (message && remainingTime > 0) {
        await setupCollectorForInvite(message, invite, remainingTime, client);
      }
    }

    let deletedInvites = 0;
    const expiredInvites = await Invites.find({
      expiryTime: { $lt: Date.now() },
    });
    for (const invite of expiredInvites) {
      const channel = await client.channels.fetch(invite.channelId);
      const message = await channel.messages
        .fetch(invite.messageId)
        .catch(() => null);

      if (message) {
        const embedData = message.embeds[0];
        const embed = new EmbedBuilder(embedData);
        embed.setDescription(
          `**Team Up invite EXPIRED! ❌**\n\n${embed.description ?? ""}`
        );
        embed.setFooter({ text: "Invitation is no longer active." });
        await message.edit({ embeds: [embed] });
      }
      await invite.deleteOne().then(() => deletedInvites++);
    }
    console.log(
      chalk.bgMagentaBright(`Total expired invites deleted: ${deletedInvites}`)
    );
  } catch (err) {
    console.log(err);
  }
}
