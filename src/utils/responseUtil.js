import {
  ActionRowBuilder,
  UserSelectMenuBuilder,
  EmbedBuilder,
} from "discord.js";

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

export function buildKickTeamMembersActionRow(teamName) {
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

export function buildCurrentTeamMembersEmbed(teamName, teamMembers) {

  const randomHexColor = Math.floor(Math.random() * 16777215).toString(16);
  const currentTeamMembers = teamMembers.map((member) => `<@${member.userId}>`);
  const embed = new EmbedBuilder()
    .setTitle(`Team **${teamName}** members:`)
    .setDescription(currentTeamMembers.join("\n"))
    .setColor(randomHexColor);

  return embed;
}
