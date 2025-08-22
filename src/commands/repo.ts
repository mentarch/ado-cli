import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../config';

export function createRepoCommand(configManager: ConfigManager): Command {
  const command = new Command('repo');
  command.description('Manage repository settings');

  command
    .command('set-default <org/project>')
    .description('Set default organization and project')
    .action((orgProject: string) => {
      try {
        configManager.setRepository(orgProject);
        console.log(chalk.green(`✅ Default repository set to: ${chalk.cyan(orgProject)}`));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('view')
    .description('View current repository settings')
    .action(() => {
      const repository = configManager.getRepository();
      if (repository) {
        console.log(`📁 Default repository: ${chalk.cyan(repository)}`);
      } else {
        console.log(chalk.yellow('⚠️  No default repository set'));
        console.log('Use `ado repo set-default organization/project` to set one');
      }
    });

  return command;
}