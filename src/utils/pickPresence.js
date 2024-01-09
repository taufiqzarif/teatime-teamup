// const { ActivityType } = require('discord.js');

// module.exports = (client) => {
//     client.pickPresence = async () => {
//         const options = [
//             {
//                 type: ActivityType.Playing,
//                 text: 'Create invite, /teamup',
//             },
//         ];

//         const option = Math.floor(Math.random() * options.length);
//         client.user.setPresence({
//             activities: [
//                 {
//                     name: options[option].text,
//                     type: options[option].type,
//                 },
//             ],
//             status: 'dnd',
//         });
//     };
// };
