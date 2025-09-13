import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { ConfigManager } from '../config';
import { AdoApiClient } from '../api/client';
import { AuthManager } from '../auth';
import { PullRequest, CreatePullRequestRequest } from '../types';

export function createPrCommand(configManager: ConfigManager): Command {
  const command = new Command('pr');
  command.description('Manage pull requests');

  const authManager = new AuthManager(configManager);

  command
    .command('list')
    .description('List pull requests')
    .requiredOption('-r, --repository <id>', 'Repository name or ID')
    .option('-s, --status <state>', 'Filter by status (active, completed, abandoned)', 'active')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }
        await authManager.ensureAuthenticated();
        await listPullRequests(configManager, options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('view <id>')
    .description('View a pull request')
    .requiredOption('-r, --repository <id>', 'Repository name or ID')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (id, options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }
        await authManager.ensureAuthenticated();
        await viewPullRequest(configManager, options.repository, parseInt(id));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('create')
    .description('Create a pull request')
    .requiredOption('-r, --repository <id>', 'Repository name or ID')
    .requiredOption('-s, --source <branch>', 'Source branch')
    .requiredOption('-t, --target <branch>', 'Target branch')
    .requiredOption('-T, --title <title>', 'Pull request title')
    .option('-d, --description <text>', 'Pull request description')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }
        await authManager.ensureAuthenticated();
        await createPullRequest(configManager, options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

async function listPullRequests(configManager: ConfigManager, options: any): Promise<void> {
  const spinner = ora('Fetching pull requests...').start();
  try {
    const client = new AdoApiClient(configManager);
    const prs = await client.getPullRequests(options.repository, options.status);
    spinner.succeed(`Found ${prs.length} pull requests`);
    if (prs.length === 0) {
      console.log(chalk.yellow('No pull requests found.'));
      return;
    }
    const table = new Table({ head: ['ID', 'Title', 'Status', 'Created By'] });
    prs.forEach((pr: PullRequest) => {
      table.push([
        pr.pullRequestId,
        truncate(pr.title),
        pr.status,
        pr.createdBy.displayName,
      ]);
    });
    console.log(table.toString());
  } catch (error) {
    spinner.fail('Failed to fetch pull requests');
    throw error;
  }
}

async function viewPullRequest(configManager: ConfigManager, repositoryId: string, prId: number): Promise<void> {
  const spinner = ora('Fetching pull request...').start();
  try {
    const client = new AdoApiClient(configManager);
    const pr = await client.getPullRequest(repositoryId, prId);
    spinner.stop();
    console.log(chalk.cyan(`#${pr.pullRequestId} ${pr.title}`));
    console.log(`Status: ${pr.status}`);
    console.log(`Created By: ${pr.createdBy.displayName}`);
    console.log(`Source: ${pr.sourceRefName}`);
    console.log(`Target: ${pr.targetRefName}`);
    if (pr.description) {
      console.log('\n' + pr.description);
    }
    if (pr._links?.web?.href) {
      console.log(`\n${chalk.dim(pr._links.web.href)}`);
    }
  } catch (error) {
    spinner.fail('Failed to fetch pull request');
    throw error;
  }
}

async function createPullRequest(configManager: ConfigManager, options: any): Promise<void> {
  const spinner = ora('Creating pull request...').start();
  try {
    const client = new AdoApiClient(configManager);
    const request: CreatePullRequestRequest = {
      sourceRefName: options.source.startsWith('refs/') ? options.source : `refs/heads/${options.source}`,
      targetRefName: options.target.startsWith('refs/') ? options.target : `refs/heads/${options.target}`,
      title: options.title,
      description: options.description,
    };
    const pr = await client.createPullRequest(options.repository, request);
    spinner.succeed(`Pull request #${pr.pullRequestId} created`);
    if (pr._links?.web?.href) {
      console.log(chalk.cyan(pr._links.web.href));
    }
  } catch (error) {
    spinner.fail('Failed to create pull request');
    throw error;
  }
}

function truncate(text: string, length = 60): string {
  return text.length > length ? `${text.substring(0, length - 3)}...` : text;
}
