import chalk from 'chalk';
import { add, greet } from './utils';

/**
 * Main CLI function
 */
export const runCLI = () => {
  console.log(chalk.green('Hello from playground CLI app!'));
  console.log(chalk.blue('2 + 3 =', add(2, 3)));
  console.log(chalk.yellow(greet('User')));
};

// Run the CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}
