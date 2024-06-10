import { EmbedBuilder } from "discord.js";

// Send log message when a new user created in TeamUp user db
export async function logNewUser(client, userId, useTeamUp = false) {
  try {
    const logChannelId = process.env.USER_LOG_CHANNEL_ID;
    const logChannel = await client.channels.cache.get(logChannelId);

    const embed = new EmbedBuilder()
      .setTitle("New user created! 🎉")
      .addFields({
        name: "👤 User",
        value: `<@${userId}>`,
      })
      .addFields({
        name: "📝 Created type",
        value: useTeamUp
          ? "**👥 Created team (Use TeamUp)**"
          : "**📩 Through invitation**",
      })
      .setColor("#0066FF")
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Error logging new user:", err);
  }
}

// Send log message when a new TeamUp invite created
export async function logNewInvite(client, invite) {
  try {
    const logChannelId = process.env.INVITE_LOG_CHANNEL_ID;
    const logChannel = await client.channels.cache.get(logChannelId);

    // Convert timestamps to Date objects
    const expiryTime = new Date(invite.expiryTime);
    const createdTime = new Date(invite.createdTime);

    // Calculate difference in hours
    const diffInMs = expiryTime - createdTime;
    const diffInHours = Math.round(diffInMs / (1000 * 60 * 60));

    const embed = new EmbedBuilder()
      .setTitle("New TeamUp invite created! 🎉")
      .addFields({
        name: "👤 Host",
        value: `<@${invite.ownerId}>`,
      })
      .addFields({
        name: "🎮 Type of Invite",
        value: invite.teamInvite ? "**Team Only**" : "**Open**",
      })
      .addFields({
        name: "⏰ Expiry time",
        value: `${diffInHours > 1 ? diffInHours + " hours" : diffInHours + " hour"}`,
      })
      .setColor("#c90076")
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Error logging new invite:", err);
  }
}
