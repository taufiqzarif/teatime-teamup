require("dotenv").config;
const { REST, Routes } = require("discord.js");
const { TOKEN, CLIENT_ID } = process.env;
const fs = require("fs");

module.exports = async (client) => {
	client.commandHandler = async () => {
		const commandPath = fs.readdirSync("./src/commands");
		for (const folder of commandPath) {
			const commandFiles = fs
				.readdirSync(`./src/commands/${folder}`)
				.filter((file) => file.endsWith(".js"));

			const { commands, commandArray } = client;

			for (const file of commandFiles) {
				const command = require(`../../commands/${folder}/${file}`);
				commands.set(command.data.name, command);
				commandArray.push(command.data.toJSON());
				// console.log(`Command ${command.data.name} added.`);
			}
		}

		const rest = new REST({ version: "10" }).setToken(TOKEN);

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
