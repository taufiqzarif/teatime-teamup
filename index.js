import "dotenv/config";
import fs from "fs";
import { Client, Collection, GatewayIntentBits } from "discord.js";
import { connect } from "mongoose";

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
