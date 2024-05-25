# TeamUp Bot

TeamUp Bot is a Discord bot designed to facilitate the creation of game teams. It allows users to create game invitations, specify the maximum number of players, provide a description of the team, and even select a specific team to play with.

## Project Structure

The project is structured as follows:

- **`src/commands/general/teamup.js`**: This is the main file where the `teamup` command is defined. It handles the creation of game invitations and the management of teams.
- **`src/schema/`**: This directory contains the database schemas for invites, users, and other related data.
- **`src/utils/`**: This directory contains utility functions used throughout the project.
- **`src/events/`**: This directory contains event handlers for various events such as when a client interacts with the bot or when the bot connects to the MongoDB database.

## Key Features

- **Game Invitations**: Users can create game invitations by specifying the game they want to play, the maximum number of players, and an optional description. The bot will then create an invitation and post it to the specified channel.
- **Team Selection**: Users can specify a team to play with when creating a game invitation. The bot will automatically invite all members of the specified team to the game.
- **Autocomplete**: The bot supports autocomplete for team names. When a user starts typing the name of a team, the bot will suggest matching team names.
- **Private Channels**: When a game invitation is created, the bot will create a private channel for the game. Only the game's host and the invited team members will be able to view and send messages in this channel.
- **Invite Management**: Users can close their existing game invitations. The bot will then delete the invitation and the associated private channel.

## Future Plans

**This project will be _fully revamped_ to market and make public. Stay tuned for exciting updates and improvements!**


## Usage

To use the bot, you need to invite it to your Discord server. Once the bot is in your server, you can use the `teamup` command to create a game invitation. Here is an example of how to use the command:

```markdown
/teamup game Valorant maxplayers 5 description "Let's win this!"
```

This will create a game invitation for Valorant with a maximum of 5 players and the description "Let's win this!".

## License

This project is licensed under the MIT License.
