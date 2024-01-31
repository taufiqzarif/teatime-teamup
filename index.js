require("dotenv").config();
const fs = require("fs");
const { Client, Collection, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const { connect } = require("mongoose");
const Invites = require("./src/schema/invites");
const Users = require("./src/schema/users");
const TeamIdCounter = require("./src/schema/teamIdCounter");
const TemporaryTeamName = require("./src/schema/tempTeamName");

const { TOKEN, DBTOKEN } = process.env;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
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
    require(`./src/functions/${folder}/${file}`)(client);
  }
}

client.on("interactionCreate", async (interaction) => {
  console.log('in')
  if (!interaction.isButton() && !interaction.isUserSelectMenu()) return;

  if (interaction.customId === "close_invite") {
    const ownerId = interaction.user.id;
    const commandOwnerId = interaction.message.interaction.user.id;

    await interaction.deferReply({ ephemeral: true });
    // Check if the user who clicked the button is the command owner
    if (interaction.user.id !== commandOwnerId) {
      await interaction.editReply({
        content: "You are not authorized to cancel this invite.",
        ephemeral: true,
      });
      return;
    }
    // Check if there's an existing invite
    const invite = await Invites.findOne({ ownerId: ownerId });
    if (!invite) {
      await interaction.editReply({
        content: "No active invite found.",
        ephemeral: true,
      });
      return;
    }

    // Edit embed message to show that the invite has been canceled
    const channel = await client.channels?.fetch(invite.channelId);
    const message = await channel.messages?.fetch(invite.messageId);
    if (message) {
      const embedData = message.embeds[0];
      const embed = new EmbedBuilder(embedData);

      if (embedData.description && !embedData.description.includes("CLOSED")) {
        embed.setDescription(
          `**Team Up invite CLOSED! ❌**\n\n${embedData.description}`
        );
      } else if (!embedData.description) {
        embed.setDescription(`**Team Up invite CLOSED! ❌**`);
      }

      // Edit footer
      embed.setFooter(
        {text: `Invitation is no longer active.`}
      );
      embed.setTimestamp();
      await message.reactions.removeAll();
      await message.edit({ embeds: [embed] });
    }

    // Delete the invite
    await Invites.deleteOne({ ownerId: ownerId });

    // Respond to the interaction
    await interaction.editReply({
      content: `${invite.game} invite closed.`,
      embeds: [],
      components: [],
      ephemeral: true,
    });
  }

  if (interaction.customId === "team_members") {
    console.log('in 2')
    await interaction.deferReply({ ephemeral: true });
    const teamId = await getNextTeamId();
    const ownerId = interaction.user.id;
    const selectedTeamMembers = interaction.values.filter(member => member !== ownerId);

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
        teams: [{
          teamId,
          teamName: teamName,
          teamMembers: selectedTeamMembers.map((member) => ({
            userId: member,
          }))
        }]
      })
      const res = await newUser.save();
      if (!res) {
        return await interaction.editReply({
          content: "Failed to create team.",
          ephemeral: true,
        });
      } else {
        await tempTeamName.deleteOne();
      }
    } else {
      return await interaction.editReply({
        content: "Already have 3 teams (MAX)!",
        ephemeral: true,
      });
    }
    await interaction.editReply({
      content: `Team ${teamName} created with ${selectedTeamMembers}. 🎉`,
      ephemeral: true,
    });
  }
});

async function getNextTeamId() {
  const counter = await TeamIdCounter.findOneAndUpdate({}, { $inc: { counter: 1 } }, { new: true, upsert: true });
  return counter.counter;
}

(async () => {
  require("./src/functions/handlers/eventHandler")(client);
  client.eventHandler();
  client.commandHandler();
})();

client.login(TOKEN);
(async () => {
  await connect(DBTOKEN).catch((err) => console.error(err));
})();
