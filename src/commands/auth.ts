import { Command } from 'commander';
import { ConfigManager } from '../config';
import { AuthManager } from '../auth';

export function createAuthCommand(configManager: ConfigManager): Command {
  const command = new Command('auth');
  command.description('Manage authentication');

  const authManager = new AuthManager(configManager);

  command
    .command('login')
    .description('Authenticate with Azure DevOps')
    .action(async () => {
      try {
        await authManager.login();
      } catch (error) {
        process.exit(1);
      }
    });

  command
    .command('status')
    .description('Check authentication status')
    .action(async () => {
      try {
        await authManager.status();
      } catch (error) {
        process.exit(1);
      }
    });

  command
    .command('logout')
    .description('Log out and remove stored credentials')
    .action(async () => {
      try {
        await authManager.logout();
      } catch (error) {
        process.exit(1);
      }
    });

  return command;
}