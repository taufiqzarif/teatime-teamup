import Users from "../schema/users.js";
import Invites from "../schema/invites.js";
import TeamIdCounter from "../schema/teamIdCounter.js";
import TemporaryTeamName from "../schema/tempTeamName.js";
import {
  buildUserActionRow,
  buildTeamMembersString,
  buildKickTeamMembersActionRow,
} from "../utils/responseUtil.js";

// Add new team members to existing team
export async function handleAddNewTeamMembers(interaction) {
  console.log("handleAddMembers customId", interaction.customId);
  if (interaction.customId.includes(":")) {
    await addTeamMembers(interaction);
  } else {
    await showAddTeamMembers(interaction);
  }
}

// Add members when creating a team
export async function handleTeamMembers(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const ownerId = interaction.user.id;
  const teamId = await getNextTeamId();
  const selectedTeamMembers = interaction.values.filter(
    (member) => member !== ownerId
  );
  const tempTeamName = await TemporaryTeamName.findOne({ ownerId });

  if (!tempTeamName) {
    return await interaction.editReply({
      content: "No temporary team name found.",
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
}

// Kick member(s) from a team
export async function handleKickMembers(interaction) {
  if (interaction.customId.includes(":")) {
    await kickTeamMembers(interaction);
  } else {
    await showKickTeamMembers(interaction);
  }
}

async function showAddTeamMembers(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const ownerId = interaction.user.id;
  const user = await Users.findOne({ userId: ownerId });

  if (!user) {
    return await interaction.editReply({
      content: "You don't have any teams. To create a team, use `/createteam`.",
      ephemeral: true,
    });
  }

  const currentSelectedTeam = interaction.values[0];
  const team = user.teams.find((team) => team.teamName === currentSelectedTeam);

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

  const actionRow = buildUserActionRow(
    `add_team_members:${currentSelectedTeam}`,
    `Select team members: ${currentSelectedTeam}`,
    1,
    10
  );
  await interaction.editReply({
    content: "Select team members",
    components: [actionRow.toJSON()],
    ephemeral: true,
  });
}

async function addTeamMembers(interaction) {
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

  const team = user.teams.find((team) => team.teamName === currentSelectedTeam);
  selectedTeamMembers = selectedTeamMembers.filter(
    (member) => !team.teamMembers.some((m) => m.userId === member)
  );

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
}

async function showKickTeamMembers(interaction) {
  const ownerId = interaction.user.id;
  const user = await Users.findOne({ userId: ownerId });

  if (!user) {
    return await interaction.editReply({
      content: "You don't have any teams. To create a team, use `/createteam`.",
      ephemeral: true,
    });
  }

  const currentSelectedTeam = interaction.values[0];
  const team = user.teams.find((team) => team.teamName === currentSelectedTeam);

  if (!team) {
    return await interaction.editReply({
      content: `Team **${currentSelectedTeam}** doesn't exist.`,
      ephemeral: true,
    });
  }

  await interaction.reply({
    content: `Team **${currentSelectedTeam}** members: ${buildTeamMembersString(team.teamMembers)}`,
    ephemeral: true,
  });
  const actionRow = await buildKickTeamMembersActionRow(
    currentSelectedTeam,
    team.teamMembers
  );
  await interaction.followUp({
    content: "Select team members to remove",
    components: [actionRow],
    ephemeral: true,
  });
}

async function kickTeamMembers(interaction) {
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
}

async function getNextTeamId() {
  const counter = await TeamIdCounter.findOneAndUpdate(
    {},
    { $inc: { counter: 1 } },
    { new: true, upsert: true }
  );
  return counter.counter;
}