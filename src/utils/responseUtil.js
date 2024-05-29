import { ActionRowBuilder, UserSelectMenuBuilder } from "discord.js";

export function buildUserActionRow(
  customId,
  placeholder,
  minValues,
  maxValues
) {
  return new ActionRowBuilder().setComponents(
    new UserSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(minValues)
      .setMaxValues(maxValues)
  );
}

export async function buildKickTeamMembersActionRow(teamName, teamMembers) {
  const options = teamMembers.map((member) => ({
    label: member.userId,
    value: member.userId,
  }));

  const actionRow = new ActionRowBuilder().setComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`kick_team_members:${teamName}`)
      .setPlaceholder(`Select team members to remove`)
      .setMinValues(1)
      .setMaxValues(options.length)
      .addDefaultUsers(options)
  );

  return actionRow;
}

export function buildTeamMembersString(members) {
  return members.map((member) => `<@${member}>`).join(", ");
}
