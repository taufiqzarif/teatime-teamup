require('dotenv').config();
const { EmbedBuilder } = require('discord.js');
const chalk = require('chalk');
const Invites = require('../schema/invites');
const { CLIENT_ID } = process.env;

async function reinitializeActiveInvite(client) {
    console.log(chalk.yellowBright('Reinitializing active invites...'));
    try {
        const activeInvites = await Invites.find({
            expiryTime: { $gt: Date.now() },
        });
        console.log(chalk.bgMagenta(`Total active invites: ${activeInvites.length}`));
        for (const invite of activeInvites) {
            const remainingTime = invite.expiryTime - Date.now();
            const channel = await client.channels.fetch(invite.channelId);
            const message = await channel.messages
                .fetch(invite.messageId)
                .catch(() => null);

            if (message) {
                setupCollectorForInvite(message, invite, remainingTime, client);
            }
        }

        let deletedInvites = 0;
        const expiredInvites = await Invites.find({
            expiryTime: { $lt: Date.now() },
        });
        for (const invite of expiredInvites) {
            const channel = await client.channels.fetch(invite.channelId);
            const message = await channel.messages.fetch(invite.messageId);

            if (message) {
                const embedData = message.embeds[0];
                const embed = new EmbedBuilder(embedData);
                
                if (embedData.description && !embedData.description.includes('EXPIRED')) {
                    embed.setDescription(`**Team Up invite EXPIRED! ❌**\n\n${embedData.description}`)
                } else if (!embedData.description) {
                    embed.setDescription(`**Team Up invite EXPIRED! ❌**`);
                }
                embed.setFooter({ text: 'Invitation is no longer active.' });
                await message.edit({ embeds: [embed] });
            } else {
                await invite.deleteOne().then(() => deletedInvites++);
            }
            await invite.deleteOne().then(() => deletedInvites++);
        }
        console.log(chalk.bgMagentaBright(`Total expired invites deleted: ${deletedInvites}`));
    } catch (err) {
        console.log(err);
    }
}

async function setupCollectorForInvite(message, invite, remainingTime, client) {
    console.log(chalk.yellowBright('Setting up collector for invite...'));
    const hostId = invite.ownerId;
    const joinEmoji = '✅';

    const filterUser = (reaction, user) => {
        return (
            reaction.emoji.name === joinEmoji &&
            user.id !== hostId &&
            !user.bot &&
            user.id !== CLIENT_ID
        );
    };

    const collector = message.createReactionCollector({
        filter: filterUser,
        time: remainingTime,
        dispose: true,
    });

    // Collector events
    collector.on('collect', async (reaction, user) => {
        const invite = await Invites.findOne({ ownerId: hostId });

        if (!invite) {
            return;
        }

        // Check if the maximum number of players has been reached
        if (invite.players.length >= invite.maxPlayers) {
            reaction.users.remove(user);
            return;
        }

        if (invite.players.length < invite.maxPlayers) {
            await Invites.updateOne({
                $push: { players: { userId: user.id } },
            });

            const updatedInvite = await Invites.findOne({ ownerId: hostId });

            const updatedPlayers = updatedInvite.players
                .map((player) => `<@${player.userId}>`)
                .join('\n');

            const embed = message.embeds[0];
            embed.fields[0].value = `<@${updatedInvite.ownerId}>`;
            embed.fields[2].value = updatedPlayers;
            await message.edit({ embeds: [embed] });
        }
    });

    collector.on('remove', async (reaction, user) => {
        const invite = await Invites.findOne({ ownerId: hostId });

        if (!invite) {
            return;
        }

        // Check if the user is in the players list and remove them
        invite.players = invite.players.filter(
            (player) => player.userId !== user.id
        );

        // Save the updated invite
        await invite.save();

        const updatedInvite = await Invites.findOne({ ownerId: hostId });

        const updatedPlayers = updatedInvite.players
            .map((player) => `<@${player.userId}>`)
            .join('\n');

        const embed = message.embeds[0];
        embed.fields[0].value = `<@${updatedInvite.ownerId}>`;
        embed.fields[2].value = updatedPlayers;
        await message.edit({ embeds: [embed] });
    });

    collector.on('end', async () => {
        const invite = await Invites.findOne({ ownerId: hostId });

        if (!invite) {
            return;
        }

        const channel = await client.channels.fetch(invite.channelId);
        const message = await channel.messages.fetch(invite.messageId);

        if (message) {
            const embedData = message.embeds[0];
            const embed = new EmbedBuilder(embedData);
            
            if (embedData.description && !embedData.description.includes('EXPIRED')) {
                embed.setDescription(`**Team Up invite EXPIRED! ❌**\n\n${embedData.description}`)
            } else if (!embedData.description) {
                embed.setDescription(`**Team Up invite EXPIRED! ❌**`);
            }
            await message.edit({ embeds: [embed] });
        }
        await invite.deleteOne();
    })
    console.log(chalk.greenBright('Collector setup complete!'));
}

module.exports = {
    reinitializeActiveInvite,
};
