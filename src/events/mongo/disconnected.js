const chalk = require('chalk');

module.exports = {
    name: "disconnected",
    execute() {
        console.log(chalk.red("[DB Status]: Disconnected!"));
    },
}