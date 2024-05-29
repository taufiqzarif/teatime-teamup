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

export async function buildKickTeamMembersActionRow(teamName) {
  // const options = teamMembers.map((member) => member.userId);
  // console.log("teamMembers", options);

  const actionRow = new ActionRowBuilder().setComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`kick_team_members:${teamName}`)
      .setPlaceholder(`Select team members to remove`)
      .setMinValues(1)
      .setMaxValues(10)
  );

  return actionRow;
}

export function buildTeamMembersString(members) {
  return members.map((member) => `<@${member.userId || member}>`).join(", ");
}
