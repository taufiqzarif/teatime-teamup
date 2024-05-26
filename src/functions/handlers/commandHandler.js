import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import fs from 'fs';

const { TOKEN, CLIENT_ID } = process.env;

export default async (client) => {
  client.commandHandler = async () => {
    const commandPath = fs.readdirSync('./src/commands');
    for (const folder of commandPath) {
      const commandFiles = fs
        .readdirSync(`./src/commands/${folder}`)
        .filter((file) => file.endsWith('.js'));

      const { commands, commandArray } = client;

      for (const file of commandFiles) {
        // Use dynamic import instead of require
        const command = (await import(`../../commands/${folder}/${file}`)).default;

        commands.set(command.data.name, command);
        commandArray.push(command.data.toJSON());
        // console.log(`Command ${command.data.name} added.`);
      }
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
      console.log(
        `Refreshing ${client.commandArray.length} application (/) commands.`
      );

      // Update commands
      const data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
        body: client.commandArray,
      });

      console.log(
        `Successfully refreshed ${data.length} application (/) commands.`
      );
    } catch (error) {
      console.log(error);
    }
  };
};
