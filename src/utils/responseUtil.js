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

export function buildTeamMembersString(members) {
  return (
    members.map((member) => `<@${member.userId || member}>`).join(", ") ||
    "No members"
  );
}

export function buildCurrentTeamMembersEmbed(teamName, teamMembers) {
  const randomHexColor = Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0");

  const currentTeamMembers =
    teamMembers.length !== 0
      ? teamMembers?.map((member) => `<@${member.userId}>`)
      : ["**No members**"];
  const embed = new EmbedBuilder()
    .setTitle(`Team **${teamName}** members:`)
    .setDescription(currentTeamMembers.join("\n"))
    .setColor(randomHexColor);

  return embed;
}
