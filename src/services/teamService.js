import {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import Users from "../schema/users.js";
import Invites from "../schema/invites.js";
import {
  buildUserActionRow,
  buildTeamMembersString,
  buildCurrentTeamMembersEmbed,
} from "../utils/responseUtil.js";
import { logNewUser } from "../utils/logger.js";

// Add new team members to existing team
export async function handleAddNewTeamMembers(interaction, client) {
  try {
    if (interaction.customId.includes(":")) {
      await addTeamMembers(interaction, client);
    } else {
      await showAddTeamMembers(interaction, client);
    }
  } catch (error) {
    console.error(`Error in handleAddNewTeamMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error adding team members. Please try again. 🔄`
    );
  }
}

// Kick member(s) from a team
export async function handleKickMembers(interaction, client) {
  try {
    if (interaction.customId.includes(":")) {
      await kickTeamMembers(interaction, client);
    } else {
      await showKickTeamMembers(interaction, client);
    }
  } catch (error) {
    console.error(`Error in handleKickMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error kicking team members. Please try again. 🔄`
    );
  }
}

// Show existing invite and close invite button when user tries to create new team invitation
export async function handleCloseInvite(interaction, client) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ownerId = interaction.user.id;
    const invite = await Invites.findOne({ ownerId });

    if (!invite) {
      return await interaction.editReply({
        content: "No active invites found.",
        ephemeral: true,
      });
    }

    const channel = await client.channels?.fetch(invite.channelId);
    const message = await channel.messages?.fetch(invite.messageId);

    if (!message && !invite) {
      return await interaction.editReply({
        content: "No active invites found.",
        ephemeral: true,
      });
    }

    // If team invite, delete the private channel
    if (invite.teamInvite) {
      await interaction.editReply({
        content: `${invite.game} invite closed.`,
        ephemeral: true,
      });

      await invite.deleteOne();
      await channel.delete();
      return;
    }

    const embedData = message.embeds[0];
    const embed = new EmbedBuilder(embedData);
    embed.setDescription(
      `**Team Up invite CLOSED! ❌**\n\n${embedData.description ?? ""}`
    );
    embed.setFooter({ text: `Invitation is no longer active.` });
    embed.setTimestamp(invite.createdAt);
    await message.reactions.removeAll();
    await message.edit({ embeds: [embed] });

    await invite.deleteOne();
    await interaction.editReply({
      content: `${invite.game} invite closed.`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(`Error in handleCloseInvite: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error closing invite. Please try again. 🔄`
    );
  }
}

async function showAddTeamMembers(interaction, client) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ownerId = interaction.user.id;
    const user = await Users.findOne({ userId: ownerId });

    if (!user) {
      return await interaction.editReply({
        content:
          "You don't have any teams. To create a team, use `/createteam`.",
        ephemeral: true,
      });
    }

    const currentSelectedTeam = interaction.values[0];
    const team = user.teams.find(
      (team) => team.teamName === currentSelectedTeam
    );

    if (!team) {
      return await interaction.editReply({
        content: `Team **${currentSelectedTeam}** doesn't exist.`,
        ephemeral: true,
      });
    }

    if (team?.teamMembers.length >= 20) {
      return await interaction.editReply({
        content: `Team **${currentSelectedTeam}** is full. Max members: 20.`,
        ephemeral: true,
      });
    }

    await interaction.editReply({
      embeds: [
        buildCurrentTeamMembersEmbed(currentSelectedTeam, team?.teamMembers),
      ],
      ephemeral: true,
    });

    const actionRow = buildUserActionRow(
      `add_team_members:${currentSelectedTeam}`,
      `Select team members: ${currentSelectedTeam}`,
      1,
      10
    );

    await interaction.followUp({
      content: "Select team members",
      components: [actionRow.toJSON()],
      ephemeral: true,
    });
  } catch (error) {
    console.error(`Error in showAddTeamMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error adding team members. Please try again. 🔄`
    );
  }
}

async function addTeamMembers(interaction, client) {
  try {
    const [, currentSelectedTeam] = interaction.customId.split(":");
    let isCreateTeam = interaction.customId.split(":")[2] || false;
    // console.log(typeof isCreateTeam);
    if (isCreateTeam === "true") {
      isCreateTeam = true;
    } else {
      isCreateTeam = false;
    }

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const guild = await client.guilds.cache.get(guildId);

    // Get selected members
    let selectedTeamMembers = interaction.values.filter(
      (member) => member !== interaction.user.id
    );

    const user = await Users.findOne({ userId: interaction.user.id });
    const isTeamCreated = user?.teams.find(
      (team) => team.teamName === currentSelectedTeam
    );
    if (!user || !isTeamCreated) {
      return await interaction.editReply({
        content: `Team **${currentSelectedTeam}** doesn't exist.`,
        ephemeral: true,
      });
    }

    const team = user.teams.find(
      (team) => team.teamName === currentSelectedTeam
    );

    let totalInvitedMembers = 0;

    // Fetch members from the guild and filter out bots
    selectedTeamMembers = await Promise.all(
      selectedTeamMembers.map(async (memberId) => {
        const member = await guild.members.fetch(memberId).catch(console.error);
        return member && !member.user.bot ? memberId : null;
      })
    );

    // Remove null entries
    selectedTeamMembers = selectedTeamMembers.filter(
      (member) => member != null
    );

    // Filter only members who can be invited
    selectedTeamMembers = (
      await Promise.all(
        selectedTeamMembers.map(async (member) => {
          const teamUser = await Users.findOne({ userId: member });
          if (teamUser && teamUser.canBeInvited) {
            if (teamUser.canDirectJoin) {
              return member;
            } else {
              // prevent adding user unless they accept the invite
              const inviteSent = await handlePromptInviteMessage(
                interaction,
                client,
                currentSelectedTeam,
                member
              );
              if (inviteSent) {
                totalInvitedMembers++;
              }

              return null;
            }
          } else if (!teamUser) {
            // If user doesn't exist, send invite
            const inviteSent = await handlePromptInviteMessage(
              interaction,
              client,
              currentSelectedTeam,
              member
            );
            if (inviteSent) {
              totalInvitedMembers++;
            }
            return null;
          }
          return null; // If user doesn't exist or can't be invited
        })
      )
    ).filter((member) => member != null);

    // Filter out members already in the team
    selectedTeamMembers = selectedTeamMembers.filter(
      (member) => !team.teamMembers.some((m) => m.userId === member)
    );

    // Check if team members exceed 20
    if (team.teamMembers.length + selectedTeamMembers.length > 20) {
      return await interaction.editReply({
        content: `Team **${currentSelectedTeam}** is full. (Max members: 20)`,
        ephemeral: true,
      });
    }

    const res = await Users.updateOne(
      { userId: interaction.user.id, "teams.teamName": currentSelectedTeam },
      {
        $push: {
          "teams.$.teamMembers": {
            $each: selectedTeamMembers.map((member) => ({ userId: member })),
          },
        },
      }
    );

    if (!res) {
      return await interaction.editReply({
        content: "Failed to add members.",
        ephemeral: true,
      });
    }

    let message = "";
    const teamNameMsg = `team **${currentSelectedTeam}**`;

    if (isCreateTeam) {
      message += `Team **${currentSelectedTeam}** created! 🎉`;
    }

    if (selectedTeamMembers.length > 0) {
      if (message.length > 0) {
        message += "\n";
      }
      message += `Added ${buildTeamMembersString(selectedTeamMembers)} to ${teamNameMsg}. 🎉`;
    }

    if (totalInvitedMembers > 0) {
      if (message.length > 0) {
        message += "\n";
      }
      message += `**${totalInvitedMembers}** invite request sent to selected members to join ${teamNameMsg}. 📩`;
    }

    if (message.length > 0) {
      await interaction.followUp({
        content: message,
        ephemeral: true,
      });
    }

    // If no new members added to team and no invites sent
    if (
      message.length === 0 ||
      (!selectedTeamMembers.length && totalInvitedMembers === 0)
    ) {
      await interaction.followUp({
        content: `No new members added to team **${currentSelectedTeam}**.`,
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error(`Error in addTeamMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error adding team members. Please try again. 🔄`
    );
  }
}

async function showKickTeamMembers(interaction, client) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ownerId = interaction.user.id;
    const user = await Users.findOne({ userId: ownerId });

    if (!user) {
      return await interaction.editReply({
        content:
          "You don't have any teams. To create a team, use `/createteam`.",
        ephemeral: true,
      });
    }

    const currentSelectedTeam = interaction.values[0];
    const team = user.teams.find(
      (team) => team.teamName === currentSelectedTeam
    );

    if (!team) {
      return await interaction.editReply({
        content: `Team **${currentSelectedTeam}** doesn't exist.`,
        ephemeral: true,
      });
    }

    await interaction.editReply({
      embeds: [buildCurrentTeamMembersEmbed(team.teamName, team.teamMembers)],
      ephemeral: true,
    });

    const actionRow = buildUserActionRow(
      `kick_team_members:${team.teamName}`,
      `Select team members: ${team.teamName}`,
      1,
      10
    );

    await interaction.followUp({
      content: "Select team members to remove",
      components: [actionRow.toJSON()],
      ephemeral: true,
    });
  } catch (error) {
    console.error(`Error in showKickTeamMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error kicking team members. Please try again. 🔄`
    );
  }
}

async function kickTeamMembers(interaction, client) {
  try {
    const [, currentSelectedTeam] = interaction.customId.split(":");
    await interaction.deferReply({ ephemeral: true });
    let selectedTeamMembers = interaction.values.filter(
      (member) => member !== interaction.user.id
    );
    const user = await Users.findOne({ userId: interaction.user.id });

    if (
      !user ||
      !user.teams.find((team) => team.teamName === currentSelectedTeam)
    ) {
      return await interaction.editReply({
        content: `Team **${currentSelectedTeam}** doesn't exist.`,
        ephemeral: true,
      });
    }

    const team = user.teams.find(
      (team) => team.teamName === currentSelectedTeam
    );
    selectedTeamMembers = selectedTeamMembers.filter((member) =>
      team.teamMembers.some((m) => m.userId === member)
    );

    // If no members removed
    if (!selectedTeamMembers.length) {
      return await interaction.editReply({
        content: `No members removed from team **${currentSelectedTeam}**.`,
        ephemeral: true,
      });
    }

    const res = await Users.updateOne(
      { userId: interaction.user.id, "teams.teamName": currentSelectedTeam },
      {
        $pull: {
          "teams.$.teamMembers": { userId: { $in: selectedTeamMembers } },
        },
      }
    );

    if (!res) {
      return await interaction.editReply({
        content: "Failed to remove members.",
        ephemeral: true,
      });
    }

    await interaction.editReply({
      content: `Removed ${buildTeamMembersString(selectedTeamMembers)} from team **${currentSelectedTeam}**.`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(`Error in kickTeamMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error kicking team members. Please try again. 🔄`
    );
  }
}

export async function handleErrorMessage(
  interaction,
  client = null,
  error = null,
  message = null
) {
  // Check if the interaction has already been handled
  if (interaction.replied) {
    return;
  }
  if (!interaction.deferred) {
    await interaction.deferReply({ ephemeral: true }).catch(console.error);
  }
  // console.log("error", error?.message);
  if (client) {
    const errorChannel = client.channels.cache.get(
      process.env.ERROR_LOG_CHANNEL_ID
    );
    if (errorChannel) {
      const embed = new EmbedBuilder()
        .setTitle(
          `Error executing ${interaction?.commandName || interaction?.message?.interaction?.commandName || "Unknown"}`
        )
        .setDescription("An error occurred while executing the command")
        .addFields({
          name: "Error command",
          value:
            interaction?.commandName ||
            interaction?.message?.interaction?.commandName ||
            "Unknown",
        })
        .addFields({
          name: "Error customId",
          value: interaction?.customId ?? "No customId",
        })
        .addFields({
          name: "Error message",
          value: truncateString(error?.message) ?? "No message",
        })
        .addFields({
          name: "Error stack",
          value: truncateString(error?.stack) ?? "No stack",
        })
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
  }
  await interaction.editReply({
    content: message?.toString() ?? "An error occurred. Please try again.",
    ephemeral: true,
  });
}

export async function handleDeleteTeam(interaction, client) {
  try {
    await interaction.deferReply({ ephemeral: true });
    const ownerId = interaction.user.id;
    const selectedTeam = interaction.values[0];

    if (!selectedTeam) {
      return await interaction.editReply({
        content: "No team selected.",
        ephemeral: true,
      });
    }

    const user = await Users.findOne({ userId: ownerId });
    if (!user) {
      return await interaction.editReply({
        content:
          "You don't have any teams. To create a team, use `/createteam`.",
        ephemeral: true,
      });
    }

    const team = user.teams.find((team) => team.teamName === selectedTeam);
    if (!team) {
      return await interaction.editReply({
        content: `Team **${selectedTeam}** doesn't exist. 🤷‍♂️`,
        ephemeral: true,
      });
    }

    // Delete team query
    await Users.updateOne(
      { userId: ownerId },
      { $pull: { teams: { teamName: selectedTeam } } }
    ).catch((err) => {
      console.error(err);
      return interaction.editReply({
        content: "Failed to delete team. Please try again. 🔄",
        ephemeral: true,
      });
    });

    await interaction.editReply({
      content: `Team **${selectedTeam}** deleted. 🗑️`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(`Error in handleDeleteTeam: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error deleting team. Please try again. 🔄`
    );
  }
}

// Prompt invite message to user to join a team with yes/no buttons
async function handlePromptInviteMessage(interaction, client, team, userId) {
  try {
    const ownerId = interaction.user.id;
    // Check if the interaction has already been handled
    if (interaction.replied) {
      return false;
    }
    if (!interaction.deferred) {
      await interaction.deferReply({ ephemeral: true }).catch(console.error);
    }

    const inviteMessage = new EmbedBuilder()
      .setTitle(`📩 You have been invited to join team: ${team}`)
      .setDescription(`Do you want to join? 🤔`)
      .addFields({
        name: "🏷️ Team Name",
        value: team,
      })
      .addFields({
        name: "🧑‍💼 Team Owner",
        value: `<@${ownerId}>`,
      })
      .setColor("#5865F2")
      .setTimestamp();

    const actionRow = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel("Yes")
          .setStyle(ButtonStyle.Primary)
          .setCustomId(`prompt_team_invite:${team}:${ownerId}:${userId}:yes`)
      )
      .addComponents(
        new ButtonBuilder()
          .setLabel("No")
          .setStyle(ButtonStyle.Danger)
          .setCustomId(`prompt_team_invite:${team}:${ownerId}:${userId}:no`)
      );

    const user = await client.users.fetch(userId);

    if (!user) {
      return false;
    }

    const result = await user
      .send({
        content: `You have been invited to join team **${team}**.`,
        embeds: [inviteMessage],
        components: [actionRow],
      })
      .then(() => true)
      .catch(async () => {
        await interaction.followUp({
          content: `Error sending invite message to <@${userId}>. <@${userId}> may have disabled server DMs in server's **Privacy Settings**. `,
          ephemeral: true,
        });
        return false;
      });

    return result;
  } catch (error) {
    console.error(`Error in handlePromptInviteMessage: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error sending invite message. Please try again. 🔄`
    );
  }
}

export async function handleAcceptRejectTeamInvite(interaction, client) {
  try {
    await interaction.deferReply({ ephemeral: false });
    // console.log("interaction.customId", interaction.customId);
    const [, invitedTeam, teamOwnerId, userId, action] =
      interaction.customId.split(":");

    const ownerId = interaction.user.id;

    if (userId !== ownerId) {
      return await interaction.editReply({
        content: "You can't accept/reject an invite for another user.",
        ephemeral: true,
      });
    }

    const teamOwnerUser = await Users.findOne({ userId: teamOwnerId });
    if (!teamOwnerUser) {
      return await interaction.editReply({
        content: "Team owner User ID not found.",
        ephemeral: true,
      });
    }

    // Get invited team index
    const invitedTeamIndex = teamOwnerUser.teams.findIndex(
      (team) => team.teamName === invitedTeam
    );

    if (invitedTeamIndex === -1) {
      return await interaction.editReply({
        content: `Team **${invitedTeam}** not found.`,
        ephemeral: true,
      });
    }
    // console.log(
    //   "invitedTeamIndex",
    //   invitedTeamIndex,
    //   teamOwnerUser.teams[invitedTeamIndex]
    // );
    // console.log("userId", userId);

    // Check if user is already in the team
    const isUserInTeam = teamOwnerUser.teams[invitedTeamIndex].teamMembers.some(
      (member) => member.userId === userId
    );

    if (isUserInTeam) {
      return await interaction.editReply({
        content: `You are already a member of team **${invitedTeam}**.`,
        ephemeral: true,
      });
    }

    let user = await Users.findOne({ userId });

    if (!user && action === "yes") {
      user = await new Users({
        userId,
      }).save();

      await logNewUser(client, userId, false);

      teamOwnerUser.teams[invitedTeamIndex].teamMembers.push({ userId });
      await teamOwnerUser.save();
    } else if (user && action === "yes") {
      teamOwnerUser.teams[invitedTeamIndex].teamMembers.push({ userId });
      await teamOwnerUser.save();
    }

    await interaction.editReply({
      content: `${action === "yes" ? `You have joined team **${invitedTeam}**. 🎉` : `You have rejected the invite to join team **${invitedTeam}**. ❌`}`,
      ephemeral: false,
    });
  } catch (error) {
    console.error(`Error in handleAcceptRejectTeamInvite: ${error}`);
    await handleErrorMessage(
      interaction,
      client,
      error,
      `Error accepting/rejecting team invite. Please try again. 🔄`
    );
  }
}

function truncateString(str, maxLength = 1024) {
  return str.length > maxLength ? str.substring(0, maxLength - 3) + "..." : str;
}
