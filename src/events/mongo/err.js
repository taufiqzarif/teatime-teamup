const chalk = require('chalk');

module.exports = {
    name: "err",
    execute(err) {
        console.log(chalk.red(`Error with database connection!:\n${err}`));
    },
}