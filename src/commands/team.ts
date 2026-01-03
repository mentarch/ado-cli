import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { ConfigManager } from '../config';
import { AdoApiClient } from '../api/client';
import { AuthManager } from '../auth';
import { TeamHealthConfig, TeamMember } from '../types';
import { HealthAnalyzer } from './team/health-analyzer';
import { ReportFormatter } from './team/report-formatter';

export function createTeamCommand(configManager: ConfigManager): Command {
  const command = new Command('team');
  command.description('Team health and workload management');

  const authManager = new AuthManager(configManager);

  // ado team status
  command
    .command('status')
    .description('Show team health status report')
    .option('--json', 'Output as JSON')
    .option('--detail', 'Show detailed work item info')
    .option('--stale-days <days>', 'Override stale threshold')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();

        const teamConfig = configManager.getTeamConfig();
        if (!teamConfig) {
          console.log(chalk.yellow('Team not configured. Run "ado team init" first.'));
          return;
        }

        const spinner = ora('Fetching team work items...').start();

        const client = new AdoApiClient(configManager);
        const workItems = await client.getTeamWorkItems(teamConfig.team.members, true);

        spinner.succeed(`Fetched ${workItems.length} work items`);

        // Build thresholds with optional overrides
        const thresholds = { ...teamConfig.thresholds };
        if (options.staleDays) {
          thresholds.staleDays = parseInt(options.staleDays, 10);
        }

        const analyzer = new HealthAnalyzer(thresholds, teamConfig.states);
        const report = analyzer.analyzeTeamHealth(workItems, teamConfig.team);

        const formatter = new ReportFormatter(analyzer);

        if (options.json) {
          console.log(formatter.formatJsonReport(report));
        } else {
          formatter.formatReport(report, { detail: options.detail });
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  // ado team init
  command
    .command('init')
    .description('Initialize team configuration')
    .action(async () => {
      try {
        console.log(chalk.cyan('\n🚀 Team Configuration Setup\n'));

        const { teamName } = await inquirer.prompt([
          {
            type: 'input',
            name: 'teamName',
            message: 'Team name:',
            default: 'My Team',
          },
        ]);

        const members: TeamMember[] = [];
        let addMore = true;

        while (addMore) {
          const { name, email } = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Member name:',
            },
            {
              type: 'input',
              name: 'email',
              message: 'Member email:',
            },
          ]);

          if (name && email) {
            members.push({ name, email });
            console.log(chalk.green(`  ✓ Added ${name}`));
          }

          const { more } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'more',
              message: 'Add another member?',
              default: members.length < 3,
            },
          ]);

          addMore = more;
        }

        if (members.length === 0) {
          console.log(chalk.yellow('No members added. Aborting.'));
          return;
        }

        // Ask about thresholds
        const { customThresholds } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'customThresholds',
            message: 'Customize alert thresholds?',
            default: false,
          },
        ]);

        let thresholds = configManager.getDefaultThresholds();

        if (customThresholds) {
          const answers = await inquirer.prompt([
            {
              type: 'number',
              name: 'staleDays',
              message: 'Days before item is considered stale:',
              default: thresholds.staleDays,
            },
            {
              type: 'number',
              name: 'maxItemsPerPerson',
              message: 'Max items per person (workload alert):',
              default: thresholds.maxItemsPerPerson,
            },
            {
              type: 'number',
              name: 'highPriorityDays',
              message: 'Days before high priority item is at risk:',
              default: thresholds.highPriorityDays,
            },
          ]);

          thresholds = {
            ...thresholds,
            staleDays: answers.staleDays,
            maxItemsPerPerson: answers.maxItemsPerPerson,
            highPriorityDays: answers.highPriorityDays,
          };
        }

        const config: TeamHealthConfig = {
          team: {
            name: teamName,
            members,
          },
          thresholds,
          states: configManager.getDefaultStateCategories(),
        };

        configManager.saveTeamConfig(config);

        console.log(chalk.green('\n✓ Team configuration saved!'));
        console.log(chalk.gray(`  Team: ${teamName}`));
        console.log(chalk.gray(`  Members: ${members.length}`));
        console.log(chalk.gray('\nRun "ado team status" to see your team health report.'));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  // ado team add <email>
  command
    .command('add <email>')
    .description('Add team member')
    .option('-n, --name <name>', 'Display name')
    .action(async (email, options) => {
      try {
        let config = configManager.getTeamConfig();

        if (!config) {
          console.log(chalk.yellow('Team not configured. Run "ado team init" first.'));
          return;
        }

        // Check if member already exists
        if (config.team.members.some(m => m.email.toLowerCase() === email.toLowerCase())) {
          console.log(chalk.yellow(`Member ${email} already exists.`));
          return;
        }

        let name = options.name;
        if (!name) {
          const { promptedName } = await inquirer.prompt([
            {
              type: 'input',
              name: 'promptedName',
              message: 'Member name:',
              default: email.split('@')[0],
            },
          ]);
          name = promptedName;
        }

        config.team.members.push({ name, email });
        configManager.saveTeamConfig(config);

        console.log(chalk.green(`✓ Added ${name} (${email}) to the team.`));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  // ado team remove <email>
  command
    .command('remove <email>')
    .description('Remove team member')
    .action(async (email) => {
      try {
        let config = configManager.getTeamConfig();

        if (!config) {
          console.log(chalk.yellow('Team not configured. Run "ado team init" first.'));
          return;
        }

        const index = config.team.members.findIndex(
          m => m.email.toLowerCase() === email.toLowerCase()
        );

        if (index === -1) {
          console.log(chalk.yellow(`Member ${email} not found.`));
          return;
        }

        const removed = config.team.members.splice(index, 1)[0];
        configManager.saveTeamConfig(config);

        console.log(chalk.green(`✓ Removed ${removed.name} (${removed.email}) from the team.`));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  // ado team list
  command
    .command('list')
    .alias('ls')
    .description('List team members')
    .action(async () => {
      try {
        const config = configManager.getTeamConfig();

        if (!config) {
          console.log(chalk.yellow('Team not configured. Run "ado team init" first.'));
          return;
        }

        console.log(chalk.bold(`\n${config.team.name}`));
        console.log(chalk.gray('─'.repeat(40)));

        const table = new Table({
          head: [chalk.white('Name'), chalk.white('Email')],
          colWidths: [25, 40],
          style: { head: [], border: [] },
        });

        for (const member of config.team.members) {
          table.push([member.name, member.email]);
        }

        console.log(table.toString());
        console.log(chalk.gray(`\nTotal: ${config.team.members.length} members`));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  // ado team config
  command
    .command('config')
    .description('View or update team configuration')
    .option('--set <key=value>', 'Set configuration value')
    .action(async (options) => {
      try {
        let config = configManager.getTeamConfig();

        if (!config) {
          console.log(chalk.yellow('Team not configured. Run "ado team init" first.'));
          return;
        }

        if (options.set) {
          const [key, value] = options.set.split('=');
          if (!key || value === undefined) {
            console.log(chalk.red('Invalid format. Use --set key=value'));
            return;
          }

          const numValue = parseInt(value, 10);
          if (isNaN(numValue)) {
            console.log(chalk.red('Value must be a number'));
            return;
          }

          if (key in config.thresholds) {
            (config.thresholds as any)[key] = numValue;
            configManager.saveTeamConfig(config);
            console.log(chalk.green(`✓ Set ${key} to ${numValue}`));
          } else {
            console.log(chalk.red(`Unknown threshold: ${key}`));
            console.log(chalk.gray('Available: staleDays, stuckInStateDays, maxItemsPerPerson, minItemsPerPerson, highPriorityDays'));
          }
          return;
        }

        // Show current config
        console.log(chalk.bold('\nTeam Configuration'));
        console.log(chalk.gray('─'.repeat(40)));
        console.log(chalk.cyan('Team:'), config.team.name);
        console.log(chalk.cyan('Members:'), config.team.members.length);
        console.log('');
        console.log(chalk.bold('Thresholds:'));
        console.log(`  staleDays: ${config.thresholds.staleDays}`);
        console.log(`  stuckInStateDays: ${config.thresholds.stuckInStateDays}`);
        console.log(`  maxItemsPerPerson: ${config.thresholds.maxItemsPerPerson}`);
        console.log(`  minItemsPerPerson: ${config.thresholds.minItemsPerPerson}`);
        console.log(`  highPriorityDays: ${config.thresholds.highPriorityDays}`);
        console.log('');
        console.log(chalk.bold('State Categories:'));
        console.log(`  active: ${config.states.active.join(', ')}`);
        console.log(`  blocked: ${config.states.blocked.join(', ')}`);
        console.log(`  completed: ${config.states.completed.join(', ')}`);
        console.log('');
        console.log(chalk.gray('Use --set key=value to update thresholds'));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  return command;
}
