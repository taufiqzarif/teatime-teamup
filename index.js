import "dotenv/config";
import fs from "fs";
import {
  Client,
  Collection,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { connect } from "mongoose";
import Invites from "./src/schema/invites.js";
import Users from "./src/schema/users.js";
import TeamIdCounter from "./src/schema/teamIdCounter.js";
import TemporaryTeamName from "./src/schema/tempTeamName.js";

const { TOKEN, DBTOKEN } = process.env;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
  ],
});
client.commands = new Collection();
client.commandArray = [];

const functionPath = fs.readdirSync("./src/functions");
for (const folder of functionPath) {
  const functionFiles = fs
    .readdirSync(`./src/functions/${folder}`)
    .filter((file) => file.endsWith(".js"));

  for (const file of functionFiles) {
    const func = await import(`./src/functions/${folder}/${file}`);
    func.default(client);
  }
}

// client.on("interactionCreate", async (interaction) => {
//   if (
//     !interaction.isButton() &&
//     !interaction.isUserSelectMenu() &&
//     !interaction.isStringSelectMenu()
//   )
//     return;

//   let currentSelectedTeam;
//   if (interaction.customId.includes(":")) {
//     const [customId, currentSelectedTeam] = interaction.customId.split(":");
//     if (customId === "add_members") {
//       await interaction.deferReply({ ephemeral: true });
//       let selectedTeamMembers = interaction.values;
//       const ownerId = interaction.user.id;
//       let hasDuplicates = false;
//       selectedTeamMembers = selectedTeamMembers.filter(
//         (member) => member !== ownerId
//       );

//       const user = await Users.findOne({ userId: ownerId });
//       if (!user) {
//         return await interaction.editReply({
//           content:
//             "You don't have any teams. To create a team, use `/createteam`.",
//           ephemeral: true,
//         });
//       }
//       const team = user.teams.find(
//         (team) => team.teamName === currentSelectedTeam
//       );
//       if (!team) {
//         return await interaction.editReply({
//           content: `Team **${currentSelectedTeam}** doesn't exist!!.`,
//           ephemeral: true,
//         });
//       }

//       const members = team.teamMembers;

//       const alreadyInTeam = selectedTeamMembers.filter((member) =>
//         members.some((m) => m.userId === member)
//       );

//       selectedTeamMembers = selectedTeamMembers.filter(
//         (member) => !members.some((m) => m.userId === member)
//       );
//       hasDuplicates = selectedTeamMembers.length !== interaction.values.length;
//       const totalCurrentMembers = members.length;

//       if (totalCurrentMembers + selectedTeamMembers.length > 20) {
//         return await interaction.editReply({
//           content: `Team **${currentSelectedTeam}** is full. **(Max members: 20)**.`,
//           ephemeral: true,
//         });
//       }

//       const res = await Users.updateOne(
//         { userId: ownerId, "teams.teamName": currentSelectedTeam },
//         {
//           $push: {
//             "teams.$.teamMembers": {
//               $each: selectedTeamMembers.map((member) => ({
//                 userId: member,
//               })),
//             },
//           },
//         }
//       );

//       if (!res) {
//         return await interaction.editReply({
//           content: "Failed to add members.",
//           ephemeral: true,
//         });
//       }

//       const selectedTeamMembersUsernames = selectedTeamMembers.map(
//         (member) => `<@${member}>`
//       );

//       const alreadyInTeamUsernames = alreadyInTeam.map(
//         (member) => `<@${member}>`
//       );

//       if (hasDuplicates && alreadyInTeam.length > 0) {
//         if (selectedTeamMembers.length > 0) {
//           await interaction.editReply({
//             content: `Added ${selectedTeamMembersUsernames} to team **${currentSelectedTeam}**. 🎉\n${alreadyInTeamUsernames} already in team **${currentSelectedTeam}**.`,
//             ephemeral: true,
//           });
//         } else {
//           await interaction.editReply({
//             content: `${alreadyInTeamUsernames} already in team **${currentSelectedTeam}**.`,
//             ephemeral: true,
//           });
//         }
//       } else if (selectedTeamMembers.length === 0) {
//         await interaction.editReply({
//           content: `No new members added to team **${currentSelectedTeam}**.`,
//           ephemeral: true,
//         });
//       } else {
//         // Handle the case where there are new members without duplicates
//         await interaction.editReply({
//           content: `Added ${selectedTeamMembersUsernames} to team **${currentSelectedTeam}**. 🎉`,
//           ephemeral: true,
//         });
//       }

//       await interaction.editReply({
//         content: `Added ${selectedTeamMembersUsernames} to team **${currentSelectedTeam}**. 🎉`,
//         ephemeral: true,
//       });
//     } else if (customId === "remove_members") {
//       await interaction.deferReply({ ephemeral: true });
//       let selectedTeamMembers = interaction.values;
//       const ownerId = interaction.user.id;
//       selectedTeamMembers = selectedTeamMembers.filter(
//         (member) => member !== ownerId
//       );

//       const user = await Users.findOne({ userId: ownerId });
//       if (!user) {
//         return await interaction.editReply({
//           content:
//             "You don't have any teams. To create a team, use `/createteam`.",
//           ephemeral: true,
//         });
//       }
//       const team = user.teams.find(
//         (team) => team.teamName === currentSelectedTeam
//       );
//       if (!team) {
//         return await interaction.editReply({
//           content: `Team **${currentSelectedTeam}** doesn't exist.`,
//           ephemeral: true,
//         });
//       }

//       const members = team.teamMembers;

//       selectedTeamMembers = selectedTeamMembers.filter((member) =>
//         members.some((m) => m.userId === member)
//       );

//       const res = await Users.updateOne(
//         { userId: ownerId, "teams.teamName": currentSelectedTeam },
//         {
//           $pull: {
//             "teams.$.teamMembers": {
//               userId: { $in: selectedTeamMembers },
//             },
//           },
//         }
//       );

//       if (!res) {
//         return await interaction.editReply({
//           content: "Failed to remove members.",
//           ephemeral: true,
//         });
//       }

//       const selectedTeamMembersUsernames = selectedTeamMembers.map(
//         (member) => `<@${member}>`
//       );

//       if (selectedTeamMembers.length === 0) {
//         return await interaction.editReply({
//           content: `No members removed from team **${currentSelectedTeam}**.`,
//           ephemeral: true,
//         });
//       }

//       await interaction.editReply({
//         content: `Removed ${selectedTeamMembersUsernames} from team **${currentSelectedTeam}**.`,
//         ephemeral: true,
//       });
//     }
//   } else {
//     if (interaction.customId === "close_invite") {
//       const ownerId = interaction.user.id;
//       const commandOwnerId = interaction.message.interaction.user.id;

//       await interaction.deferReply({ ephemeral: true });
//       if (interaction.user.id !== commandOwnerId) {
//         await interaction.editReply({
//           content: "You are not authorized to cancel this invite.",
//           ephemeral: true,
//         });
//         return;
//       }
//       const invite = await Invites.findOne({ ownerId: ownerId });
//       if (!invite) {
//         await interaction.editReply({
//           content: "No active invite found.",
//           ephemeral: true,
//         });
//         return;
//       }

//       const channel = await client.channels?.fetch(invite.channelId);
//       const message = await channel.messages?.fetch(invite.messageId);
//       if (message) {
//         const embedData = message.embeds[0];
//         const embed = new EmbedBuilder(embedData);

//         if (
//           embedData.description &&
//           !embedData.description.includes("CLOSED")
//         ) {
//           embed.setDescription(
//             `**Team Up invite CLOSED! ❌**\n\n${embedData.description}`
//           );
//         } else if (!embedData.description) {
//           embed.setDescription(`**Team Up invite CLOSED! ❌**`);
//         }

//         embed.setFooter({ text: `Invitation is no longer active.` });
//         embed.setTimestamp();
//         await message.reactions.removeAll();
//         await message.edit({ embeds: [embed] });
//       }

//       await Invites.deleteOne({ ownerId: ownerId });

//       await interaction.editReply({
//         content: `${invite.game} invite closed.`,
//         embeds: [],
//         components: [],
//         ephemeral: true,
//       });
//     }

//     if (interaction.customId === "team_members") {
//       await interaction.deferReply({ ephemeral: true });
//       const teamId = await getNextTeamId();
//       const ownerId = interaction.user.id;
//       const selectedTeamMembers = interaction.values.filter(
//         (member) => member !== ownerId
//       );
//       const selectedTeamMembersUsernames = selectedTeamMembers.map(
//         (member) => `<@${member}>`
//       );

//       const tempTeamName = await TemporaryTeamName.findOne({ ownerId });
//       if (!tempTeamName) {
//         return await interaction.editReply({
//           content: "No temporary team name found.",
//           ephemeral: true,
//         });
//       }
//       const teamName = tempTeamName.teamName;

//       const user = await Users.findOne({ userId: ownerId });
//       if (!user) {
//         const newUser = new Users({
//           userId: ownerId,
//           teams: [
//             {
//               teamId,
//               teamName: teamName,
//               teamMembers: selectedTeamMembers.map((member) => ({
//                 userId: member,
//               })),
//             },
//           ],
//         });
//         const res = await newUser.save();
//         if (!res) {
//           return await interaction.editReply({
//             content: "Failed to create team.",
//             ephemeral: true,
//           });
//         } else {
//           await tempTeamName.deleteOne();
//         }
//       } else {
//         const res = await Users.updateOne(
//           { userId: ownerId },
//           {
//             $push: {
//               teams: {
//                 teamId,
//                 teamName: teamName,
//                 teamMembers: selectedTeamMembers.map((member) => ({
//                   userId: member,
//                 })),
//               },
//             },
//           }
//         );
//         if (!res) {
//           return await interaction.editReply({
//             content: "Failed to create team.",
//             ephemeral: true,
//           });
//         } else {
//           await tempTeamName.deleteOne();
//         }
//       }
//       await interaction.editReply({
//         content: `Team ${teamName} created with ${selectedTeamMembersUsernames}. 🎉`,
//         ephemeral: true,
//       });
//     } else if (interaction.customId === "add_team_members") {
//       await interaction.deferReply({ ephemeral: true });
//       const ownerId = interaction.user.id;
//       const user = await Users.findOne({ userId: ownerId });
//       if (!user) {
//         return await interaction.editReply({
//           content:
//             "You don't have any teams. To create a team, use `/createteam`.",
//           ephemeral: true,
//         });
//       }

//       currentSelectedTeam = interaction.values[0];
//       const team = user.teams.find(
//         (team) => team.teamName === currentSelectedTeam
//       );
//       if (!team) {
//         return await interaction.editReply({
//           content: `Team **${currentSelectedTeam}** doesn't exist.`,
//           ephemeral: true,
//         });
//       }

//       const members = team.teamMembers;
//       const totalMembers = members.length;

//       if (totalMembers >= 20) {
//         return await interaction.editReply({
//           content: `Team **${currentSelectedTeam}** is full. Max members: 20.`,
//           ephemeral: true,
//         });
//       }

//       const actionRow = new ActionRowBuilder().setComponents(
//         new UserSelectMenuBuilder()
//           .setCustomId(`add_members:${currentSelectedTeam}`)
//           .setPlaceholder(`Select team members:${currentSelectedTeam}`)
//           .setMinValues(1)
//           .setMaxValues(10)
//       );

//       await interaction.editReply({
//         content: "Select team members",
//         components: [actionRow.toJSON()],
//         ephemeral: true,
//       });
//     } else if (interaction.customId === "remove_team_members") {
//       const ownerId = interaction.user.id;

//       const user = await Users.findOne({ userId: ownerId });
//       if (!user) {
//         return await interaction.editReply({
//           content:
//             "You don't have any teams. To create a team, use `/createteam`.",
//           ephemeral: true,
//         });
//       }

//       currentSelectedTeam = interaction.values[0];

//       const team = user.teams.find(
//         (team) => team.teamName === currentSelectedTeam
//       );

//       if (!team) {
//         return await interaction.editReply({
//           content: `Team **${currentSelectedTeam}** doesn't exist.`,
//           ephemeral: true,
//         });
//       }
//       await interaction.reply({
//         content: `Team **${currentSelectedTeam}** members: ${team.teamMembers
//           .map((member) => `<@${member.userId}>`)
//           .join(", ")}`,
//         ephemeral: true,
//       });

//       const members = team.teamMembers;

//       const actionRow = new ActionRowBuilder().setComponents(
//         new UserSelectMenuBuilder()
//           .setCustomId(`remove_members:${currentSelectedTeam}`)
//           .setPlaceholder(`Select team members:${currentSelectedTeam}`)
//           .setMinValues(1)
//           .setMaxValues(10)
//       );

//       await interaction.followUp({
//         content: "Select team members to remove",
//         components: [actionRow.toJSON()],
//         ephemeral: true,
//       });
//     }
//   }
// });

async function getNextTeamId() {
  const counter = await TeamIdCounter.findOneAndUpdate(
    {},
    { $inc: { counter: 1 } },
    { new: true, upsert: true }
  );
  return counter.counter;
}

(async () => {
  const { default: eventHandler } = await import(
    "./src/functions/handlers/eventHandler.js"
  );
  eventHandler(client);
  client.eventHandler();
  client.commandHandler();
})();

client.login(TOKEN);
(async () => {
  await connect(DBTOKEN).catch((err) => console.error(err));
})();
