#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from './config';
import { createAuthCommand } from './commands/auth';
import { createWorkItemCommand } from './commands/workitem';
import { createRepoCommand } from './commands/repo';
import { createPrCommand } from './commands/pr';
import { createTeamCommand } from './commands/team';

const program = new Command();
const configManager = new ConfigManager();

program
  .name('ado')
  .description('Azure DevOps CLI with GitHub CLI compatibility')
  .version('0.1.0');

program.addCommand(createAuthCommand(configManager));
program.addCommand(createWorkItemCommand(configManager));
program.addCommand(createRepoCommand(configManager));
program.addCommand(createPrCommand(configManager));
program.addCommand(createTeamCommand(configManager));

program.configureHelp({
  sortSubcommands: true,
});

program.on('command:*', (operands) => {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.log('');
  program.help();
});

async function main() {
  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    console.error(chalk.red(`Unexpected error: ${error}`));
    process.exit(1);
  }
}

main();