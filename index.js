require("dotenv").config();
const fs = require("fs");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { connect } = require("mongoose");
const Invites = require("./src/schema/invites");
const Users = require("./src/schema/users");

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
  console.log(interaction);
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

    // Delete the invite
    await Invites.deleteOne({ ownerId: ownerId });

    // Respond to the interaction
    await interaction.editReply({
      content: "Your invite has been canceled.",
      embeds: [],
      components: [],
      ephemeral: true,
    });
  }

  if (interaction.customId === "team_members") {
    console.log('in 2')
    const selectedTeamMembers = interaction.values;
    await interaction.deferReply({ ephemeral: true });
    const teamName = "Test";
    const ownerId = interaction.user.id;

    const user = await Users.findOne({ userId: ownerId });
    if (!user) {
      const newUser = new Users({
        userId: ownerId,
        teams: [{
          teamName: teamName,
          teamMembers: selectedTeamMembers.map((member) => ({
            userId: member,
          }))
        }]
      })
      await newUser.save();
    } else {
      return await interaction.editReply({
        content: "Already have a team.",
        ephemeral: true,
      });
    }
    await interaction.editReply({
      content: `Team ${teamName} created with ${selectedTeamMembers}. 🎉`,
      ephemeral: true,
    });
  }
});

(async () => {
  require("./src/functions/handlers/eventHandler")(client);
  client.eventHandler();
  client.commandHandler();
})();

client.login(TOKEN);
(async () => {
  await connect(DBTOKEN).catch((err) => console.error(err));
})();
