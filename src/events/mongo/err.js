import chalk from "chalk";

export default {
  name: "err",
  execute(err) {
    console.log(chalk.red(`Error with database connection!:\n${err}`));
  },
};
