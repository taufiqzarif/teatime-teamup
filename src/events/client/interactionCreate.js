const {Events, InteractionType} = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if(interaction.isChatInputCommand()) {
            const {commands} = client;
            const {commandName} = interaction;
            const command = commands.get(commandName);

            if(!command) {
                console.error(`No command matching ${commandName} was found!`);
                return;
            }

            try {
                await command.execute(interaction, client);
            }
            catch(error) {
                console.error(`Error executing ${commandName}!`);
                console.error(error);
                await interaction.reply({
                    content: `Error executing ${commandName}`,
                    ephemeral: true
                });
            }
        } 
        // else if(interaction.isButton()) {
        //     const {buttons} = client;
        //     const {customId} = interaction;
        //     const button = buttons.get(customId);
        //     if(!button) return new Error(`No button matching ${customId} was found!`);

        //     try {
        //         await button.execute(interaction, client);
        //     }
        //     catch(error) {
        //         console.error(`Error executing ${customId}!`);
        //         console.error(error);
        //         await interaction.reply({
        //             content: `Error executing ${customId}`,
        //             ephemeral: true
        //         });
        //     }
        // } 
        else if(interaction.isStringSelectMenu()) {
            const {selectMenus} = client;
            const {customId} = interaction;
            const selectMenu = selectMenus.get(customId);
            if(!selectMenu) return new Error(`No select menu matching ${customId} was found!`);

            try {
                await selectMenu.execute(interaction, client);
            }
            catch(error) {
                console.error(`Error executing ${customId}!`);
                console.error(error);
                await interaction.reply({
                    content: `Error executing ${customId}`,
                    ephemeral: true
                });
            }
        } else if(interaction.isContextMenuCommand()) {
            const {contextMenus} = client;
            const {commandName} = interaction;
            const contextMenu = contextMenus.get(commandName);
            if(!contextMenu) return new Error(`No context menu matching ${commandName} was found!`);

            try {
                await contextMenu.execute(interaction, client);
            }
            catch(error) {
                console.error(`Error executing ${commandName}!`);
                console.error(error);
                await interaction.reply({
                    content: `Error executing ${commandName}`,
                    ephemeral: true
                });
            }
        } else if(interaction.type == InteractionType.ApplicationCommandAutocomplete) {
            const {commands} = client;
            const {commandName} = interaction;
            const command = commands.get(commandName);
            if(!command) return;

            try {
                await command.autocomplete(interaction, client);
            }
            catch(error) {
                console.error(`Error executing ${commandName}!`);
                console.error(error);
            }
        }
    }
}