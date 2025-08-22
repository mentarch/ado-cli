import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import open from 'open';
import { ConfigManager } from '../config';
import { AdoApiClient } from '../api/client';
import { AuthManager } from '../auth';
import { WorkItem, WorkItemType, CreateWorkItemRequest, ListWorkItemsOptions, WorkItemUpdateRequest } from '../types';

export function createWorkItemCommand(configManager: ConfigManager): Command {
  const command = new Command('workitem');
  command.alias('wi');
  command.description('Manage Azure DevOps work items');

  const authManager = new AuthManager(configManager);

  command
    .command('list')
    .alias('ls')
    .description('List work items')
    .option('-a, --assignee <user>', 'Filter by assignee (@me for current user)')
    .option('-A, --author <user>', 'Filter by creator')
    .option('-l, --label <label>', 'Filter by label/tag')
    .option('-s, --state <state>', 'Filter by state')
    .option('-t, --type <type>', 'Filter by work item type')
    .option('--area <path>', 'Filter by area path')
    .option('--iteration <path>', 'Filter by iteration path')
    .option('-L, --limit <number>', 'Maximum number of items to fetch', '30')
    .option('-S, --search <query>', 'Search work item titles and descriptions')
    .option('--sort <field>', 'Sort by field (created, updated, priority, title)', 'created')
    .option('--order <asc|desc>', 'Sort order', 'desc')
    .option('--full', 'Show full titles (no truncation)')
    .option('--web', 'Open work items in browser when clicked')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();
        await listWorkItems(configManager, options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('create')
    .description('Create a new work item')
    .option('-a, --assignee <user>', 'Assign work item to user')
    .option('-b, --body <text>', 'Work item description')
    .option('-l, --label <labels>', 'Add labels (comma-separated)')
    .option('-p, --priority <1-4>', 'Set priority level (1=highest, 4=lowest)')
    .option('-t, --title <title>', 'Work item title')
    .option('-T, --type <type>', 'Work item type')
    .option('-s, --state <state>', 'Initial state')
    .option('--area <path>', 'Set area path')
    .option('--iteration <path>', 'Set iteration path')
    .option('--web', 'Open work item in browser after creation')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();
        await createWorkItem(configManager, options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('close <id>')
    .description('Close a work item')
    .option('-c, --comment <text>', 'Add closing comment')
    .option('-r, --reason <reason>', 'Specify closure reason')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (id, options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();
        await closeWorkItem(configManager, parseInt(id), options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('reopen <id>')
    .description('Reopen a work item')
    .option('-c, --comment <text>', 'Add reopening comment')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (id, options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();
        await reopenWorkItem(configManager, parseInt(id), options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('view <id>')
    .description('View a work item in the browser')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (id, options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();
        await viewWorkItem(configManager, parseInt(id));
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  return command;
}

async function listWorkItems(configManager: ConfigManager, options: ListWorkItemsOptions): Promise<void> {
  const spinner = ora('Fetching work items...').start();
  
  try {
    const client = new AdoApiClient(configManager);
    const project = configManager.getProject();
    if (!project) {
      throw new Error('Project not configured. Use -R organization/project or set default repository.');
    }
    const wiql = buildWiqlQuery(options, project);
    const limit = parseInt(options.limit?.toString() || '30');
    
    spinner.text = 'Executing query...';
    const workItems = await client.getWorkItems(wiql, limit);
    
    spinner.succeed(`Found ${workItems.length} work items`);
    
    if (workItems.length === 0) {
      console.log(chalk.yellow('No work items found matching the criteria.'));
      return;
    }

    displayWorkItems(workItems, options);
  } catch (error) {
    spinner.fail('Failed to fetch work items');
    throw error;
  }
}

function buildWiqlQuery(options: ListWorkItemsOptions, project: string): string {
  let whereClause = `[System.TeamProject] = '${project}'`;
  
  if (options.assignee) {
    const assignee = options.assignee === '@me' ? '@Me' : `'${options.assignee}'`;
    whereClause += ` AND [System.AssignedTo] = ${assignee}`;
  }
  
  if (options.author) {
    const author = options.author === '@me' ? '@Me' : `'${options.author}'`;
    whereClause += ` AND [System.CreatedBy] = ${author}`;
  }
  
  if (options.state) {
    whereClause += ` AND [System.State] = '${options.state}'`;
  }
  
  if (options.workItemType) {
    whereClause += ` AND [System.WorkItemType] = '${options.workItemType}'`;
  }
  
  if (options.areaPath) {
    whereClause += ` AND [System.AreaPath] UNDER '${options.areaPath}'`;
  }
  
  if (options.iterationPath) {
    whereClause += ` AND [System.IterationPath] UNDER '${options.iterationPath}'`;
  }
  
  if (options.search) {
    whereClause += ` AND ([System.Title] CONTAINS '${options.search}' OR [System.Description] CONTAINS '${options.search}')`;
  }
  
  const orderBy = getOrderByClause(options.sort || 'created', options.order || 'desc');
  
  return `SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], [System.CreatedDate] FROM WorkItems WHERE ${whereClause} ORDER BY ${orderBy}`;
}

function getOrderByClause(sort: string, order: string): string {
  const fieldMap: Record<string, string> = {
    created: '[System.CreatedDate]',
    updated: '[System.ChangedDate]',
    priority: '[Microsoft.VSTS.Common.Priority]',
    title: '[System.Title]'
  };
  
  const field = fieldMap[sort] || '[System.CreatedDate]';
  return `${field} ${order.toUpperCase()}`;
}

function displayWorkItems(workItems: WorkItem[], options: any = {}): void {
  if (workItems.length === 0) {
    console.log(chalk.yellow('No work items found.'));
    return;
  }

  // Create table
  const table = new Table({
    head: [
      chalk.bold('ID'),
      chalk.bold('Status'),
      chalk.bold('Type'),
      chalk.bold('Assignee'),
      chalk.bold('Title')
    ],
    colWidths: [8, 18, 12, 20, options.full ? 80 : 50],
    style: {
      head: ['cyan']
    },
    chars: {
      'top': '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      'bottom': '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      'left': '',
      'left-mid': '',
      'mid': '',
      'mid-mid': '',
      'right': '',
      'right-mid': '',
      'middle': '  '
    }
  });

  // Add rows
  workItems.forEach(wi => {
    const id = wi.fields['System.Id'].toString();
    const webUrl = wi._links?.html?.href || '';
    const clickableId = webUrl ? chalk.blue.underline(id) : id;
    const state = getStateWithColor(wi.fields['System.State'].toUpperCase());
    const type = wi.fields['System.WorkItemType'];
    const assignee = wi.fields['System.AssignedTo']?.displayName || 'Unassigned';
    const title = truncateText(wi.fields['System.Title'], options.full ? 78 : 48);
    
    table.push([clickableId, state, type, assignee, title]);
  });

  console.log('');
  console.log(table.toString());
  console.log(chalk.dim(`Showing ${workItems.length} work items`));
  
  // Show URLs if --web option is used
  if (options.web && workItems.length > 0) {
    console.log('');
    console.log(chalk.cyan('🔗 Work Item URLs:'));
    workItems.forEach(wi => {
      const id = wi.fields['System.Id'];
      const webUrl = wi._links?.html?.href;
      if (webUrl) {
        console.log(chalk.blue(`#${id}: ${webUrl}`));
      }
    });
  }
}



function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

function getStateWithColor(state: string): string {
  const upperState = state.toUpperCase();
  const stateColors: Record<string, (text: string) => string> = {
    'NEW': chalk.blue,
    'ACTIVE': chalk.yellow,
    'IN DEVELOPMENT': chalk.cyan,
    'READY TO DEVELOP': chalk.blue,
    'GROOMING': chalk.magenta,
    'ON HOLD': chalk.red,
    'RESOLVED': chalk.green,
    'CLOSED': chalk.gray,
    'REMOVED': chalk.red,
    'DONE': chalk.green,
    'TO DO': chalk.blue,
    'IN PROGRESS': chalk.yellow,
    'BLOCKED': chalk.red,
    'TESTING': chalk.cyan,
    'REVIEW': chalk.magenta
  };
  
  const colorFn = stateColors[upperState] || chalk.white;
  return colorFn(upperState);
}

async function createWorkItem(configManager: ConfigManager, options: any): Promise<void> {
  const client = new AdoApiClient(configManager);
  
  let { title, type: workItemType, body: description, assignee, area, iteration, label, priority, state } = options;
  
  if (!title) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'title',
        message: 'Work item title:',
        validate: (input: string) => input.trim() ? true : 'Title is required'
      }
    ]);
    title = answers.title;
  }
  
  if (!workItemType) {
    const spinner = ora('Fetching work item types...').start();
    const types = await client.getWorkItemTypes();
    spinner.stop();
    
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'workItemType',
        message: 'Select work item type:',
        choices: types.filter(t => !t.isDisabled).map(t => ({
          name: `${t.name} - ${t.description}`,
          value: t.name
        }))
      }
    ]);
    workItemType = answers.workItemType;
  }
  
  if (!description && !options.body) {
    const answers = await inquirer.prompt([
      {
        type: 'editor',
        name: 'description',
        message: 'Work item description (optional):',
        default: ''
      }
    ]);
    description = answers.description || undefined;
  }
  
  const tags = label ? label.split(',').map((tag: string) => tag.trim()) : undefined;
  const parsedPriority = priority ? parseInt(priority) : undefined;
  
  const request: CreateWorkItemRequest = {
    title,
    workItemType,
    description,
    assignedTo: assignee,
    areaPath: area,
    iterationPath: iteration,
    tags,
    priority: parsedPriority,
    state
  };
  
  const spinner = ora('Creating work item...').start();
  
  try {
    const workItem = await client.createWorkItem(request);
    spinner.succeed(`Work item created: #${workItem.id}`);
    
    console.log('');
    console.log(chalk.green(`✅ Work item #${workItem.id} created successfully`));
    console.log(`📝 Title: ${workItem.fields['System.Title']}`);
    console.log(`🏷️  Type: ${workItem.fields['System.WorkItemType']}`);
    console.log(`📊 State: ${getStateWithColor(workItem.fields['System.State'])}`);
    
    if (workItem.fields['System.AssignedTo']) {
      console.log(`👤 Assignee: ${workItem.fields['System.AssignedTo'].displayName}`);
    }
    
    console.log(`🔗 URL: ${workItem._links.html.href}`);
    
    if (options.web) {
      await open(workItem._links.html.href);
    }
  } catch (error) {
    spinner.fail('Failed to create work item');
    throw error;
  }
}

async function closeWorkItem(configManager: ConfigManager, id: number, options: any): Promise<void> {
  const client = new AdoApiClient(configManager);
  
  const spinner = ora(`Closing work item #${id}...`).start();
  
  try {
    const operations: WorkItemUpdateRequest[] = [
      { op: 'replace', path: '/fields/System.State', value: 'Closed' }
    ];
    
    if (options.comment) {
      operations.push({ op: 'add', path: '/fields/System.History', value: options.comment });
    }
    
    const workItem = await client.updateWorkItem(id, operations);
    spinner.succeed(`Work item #${id} closed`);
    
    console.log('');
    console.log(chalk.green(`✅ Work item #${id} closed successfully`));
    console.log(`📝 Title: ${workItem.fields['System.Title']}`);
    console.log(`📊 State: ${getStateWithColor(workItem.fields['System.State'])}`);
  } catch (error) {
    spinner.fail(`Failed to close work item #${id}`);
    throw error;
  }
}

async function reopenWorkItem(configManager: ConfigManager, id: number, options: any): Promise<void> {
  const client = new AdoApiClient(configManager);
  
  const spinner = ora(`Reopening work item #${id}...`).start();
  
  try {
    const operations: WorkItemUpdateRequest[] = [
      { op: 'replace', path: '/fields/System.State', value: 'Active' }
    ];
    
    if (options.comment) {
      operations.push({ op: 'add', path: '/fields/System.History', value: options.comment });
    }
    
    const workItem = await client.updateWorkItem(id, operations);
    spinner.succeed(`Work item #${id} reopened`);
    
    console.log('');
    console.log(chalk.green(`✅ Work item #${id} reopened successfully`));
    console.log(`📝 Title: ${workItem.fields['System.Title']}`);
    console.log(`📊 State: ${getStateWithColor(workItem.fields['System.State'])}`);
  } catch (error) {
    spinner.fail(`Failed to reopen work item #${id}`);
    throw error;
  }
}

async function viewWorkItem(configManager: ConfigManager, id: number): Promise<void> {
  const client = new AdoApiClient(configManager);
  
  const spinner = ora(`Fetching work item #${id}...`).start();
  
  try {
    const workItem = await client.getWorkItem(id);
    spinner.succeed(`Work item #${id} found`);
    
    const webUrl = workItem._links?.html?.href;
    if (webUrl) {
      console.log('');
      console.log(chalk.green(`✅ Opening work item #${id} in browser`));
      console.log(`📝 Title: ${workItem.fields['System.Title']}`);
      console.log(`🔗 URL: ${chalk.blue(webUrl)}`);
      
      await open(webUrl);
    } else {
      throw new Error('Work item URL not available');
    }
  } catch (error) {
    spinner.fail(`Failed to open work item #${id}`);
    throw error;
  }
}