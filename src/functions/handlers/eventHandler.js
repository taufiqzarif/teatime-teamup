import fs from "fs";
import mongoose from "mongoose";

const { connection } = mongoose;

export default async (client) => {
  client.eventHandler = async () => {
    const eventPath = fs.readdirSync("./src/events");
    for (const folder of eventPath) {
      const eventFiles = fs
        .readdirSync(`./src/events/${folder}`)
        .filter((file) => file.endsWith(".js"));

      switch (folder) {
        case "client":
          for (const file of eventFiles) {
            const { default: event } = await import(
              `../../events/${folder}/${file}`
            );
            if (event.once) {
              client.once(event.name, (...args) =>
                event.execute(...args, client)
              );
            } else {
              client.on(event.name, (...args) =>
                event.execute(...args, client)
              );
            }
          }
          break;

        case "mongo":
          for (const file of eventFiles) {
            const { default: event } = await import(
              `../../events/${folder}/${file}`
            );
            if (event.once) {
              connection.once(event.name, (...args) =>
                event.execute(...args, client)
              );
            } else {
              connection.on(event.name, (...args) =>
                event.execute(...args, client)
              );
            }
          }
          break;

        default:
          break;
      }
    }
  };
};
