require("dotenv").config();
const fs = require("fs");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { connect } = require("mongoose");
const Invites = require("./src/schema/invites");

const { TOKEN, DBTOKEN } = process.env;
console.log(DBTOKEN);

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
  if (!interaction.isButton()) return;

  if (interaction.customId === "cancel_invite") {
    const ownerId = interaction.user.id;
    const commandOwnerId = interaction.message.interaction.user.id;
    
    // Check if the user who clicked the button is the command owner
    if (interaction.user.id !== commandOwnerId) {
      await interaction.reply({
        content: "You are not authorized to cancel this invite.",
        ephemeral: true,
      });
      return;
    }
    // Check if there's an existing invite
    const invite = await Invites.findOne({ ownerId: ownerId });
    if (!invite) {
      await interaction.reply({
        content: "No active invite found.",
        ephemeral: true,
      });
      return;
    }

    // Delete the invite
    await Invites.deleteOne({ ownerId: ownerId });

    // Respond to the interaction
    await interaction.update({
      content: "Your invite has been canceled.",
      embeds: [],
      components: [],
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
