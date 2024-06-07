import { EmbedBuilder } from "discord.js";
import Users from "../schema/users.js";
import Invites from "../schema/invites.js";
import TeamIdCounter from "../schema/teamIdCounter.js";
import TemporaryTeamName from "../schema/tempTeamName.js";
import {
  buildUserActionRow,
  buildTeamMembersString,
  buildCurrentTeamMembersEmbed,
} from "../utils/responseUtil.js";

// Add new team members to existing team
export async function handleAddNewTeamMembers(interaction) {
  try {
    if (interaction.customId.includes(":")) {
      await addTeamMembers(interaction);
    } else {
      await showAddTeamMembers(interaction);
    }
  } catch (error) {
    console.error(`Error in handleAddNewTeamMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      `Error adding team members. Please try again. 🔄`
    );
  }
}

// Add members when creating a team
export async function handleTeamMembers(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ownerId = interaction.user.id;
    const guildId = interaction.guildId;
    const teamId = await getNextTeamId();
    const selectedTeamMembers = interaction.values.filter(
      (member) => member !== ownerId
    );
    const tempTeamName = await TemporaryTeamName.findOne({ ownerId });

    if (!tempTeamName) {
      return await interaction.editReply({
        content: "Please use `/addmembers` to add members to an existing team.",
        ephemeral: true,
      });
    }

    const teamName = tempTeamName.teamName;
    const user = await Users.findOne({ userId: ownerId });

    if (!user) {
      const newUser = new Users({
        userId: ownerId,
        teams: [
          {
            guildId,
            teamId,
            teamName,
            teamMembers: selectedTeamMembers.map((member) => ({
              userId: member,
            })),
          },
        ],
      });
      await newUser.save();
    } else {
      await Users.updateOne(
        { userId: ownerId },
        {
          $push: {
            teams: {
              guildId,
              teamId,
              teamName,
              teamMembers: selectedTeamMembers.map((member) => ({
                userId: member,
              })),
            },
          },
        }
      );
    }
    await tempTeamName.deleteOne();
    await interaction.editReply({
      content: `Team ${teamName} created with ${buildTeamMembersString(selectedTeamMembers)}. 🎉`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(`Error in handleTeamMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      `Error creating team. Please try again. 🔄`
    );
  }
}

// Kick member(s) from a team
export async function handleKickMembers(interaction) {
  try {
    if (interaction.customId.includes(":")) {
      await kickTeamMembers(interaction);
    } else {
      await showKickTeamMembers(interaction);
    }
  } catch (error) {
    console.error(`Error in handleKickMembers: ${error}`);
    await handleErrorMessage(
      interaction,
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
      `Error closing invite. Please try again. 🔄`
    );
  }
}

async function showAddTeamMembers(interaction) {
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

    if (team.teamMembers.length >= 20) {
      return await interaction.editReply({
        content: `Team **${currentSelectedTeam}** is full. Max members: 20.`,
        ephemeral: true,
      });
    }

    await interaction.editReply({
      embeds: [
        buildCurrentTeamMembersEmbed(currentSelectedTeam, team.teamMembers),
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
      `Error adding team members. Please try again. 🔄`
    );
  }
}

async function addTeamMembers(interaction) {
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
    selectedTeamMembers = selectedTeamMembers.filter(
      (member) => !team.teamMembers.some((m) => m.userId === member)
    );

    // If no new members added
    if (!selectedTeamMembers.length) {
      return await interaction.editReply({
        content: `No new members added to team **${currentSelectedTeam}**.`,
        ephemeral: true,
      });
    }

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

    await interaction.editReply({
      content: `Added ${buildTeamMembersString(selectedTeamMembers)} to team **${currentSelectedTeam}**. 🎉`,
      ephemeral: true,
    });
  } catch (error) {
    console.error(`Error in addTeamMembers: ${error}`);
    await handleErrorMessage(
      interaction,
      `Error adding team members. Please try again. 🔄`
    );
  }
}

async function showKickTeamMembers(interaction) {
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
      `Error kicking team members. Please try again. 🔄`
    );
  }
}

async function kickTeamMembers(interaction) {
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
      `Error kicking team members. Please try again. 🔄`
    );
  }
}

export async function handleErrorMessage(interaction, message = null) {
  await interaction.reply({
    content: message || "An error occurred. Please try again.",
    ephemeral: true,
  });
}

export async function handleDeleteTeam(interaction) {
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
      `Error deleting team. Please try again. 🔄`
    );
  }
}

async function getNextTeamId() {
  try {
    const counter = await TeamIdCounter.findOneAndUpdate(
      {},
      { $inc: { counter: 1 } },
      { new: true, upsert: true }
    );
    return counter.counter;
  } catch (error) {
    console.error(`Error in getNextTeamId: ${error}`);
    return null;
  }
}
