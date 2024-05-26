import chalk from "chalk";

export default {
  name: "disconnected",
  execute() {
    console.log(chalk.red("[DB Status]: Disconnected!"));
  },
};
