import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { ConfigManager } from '../config';
import { AdoApiClient } from '../api/client';
import { AuthManager } from '../auth';
import { WorkItem, WorkItemType, CreateWorkItemRequest, ListWorkItemsOptions, WorkItemUpdateRequest, WorkItemComment } from '../types';

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
    .command('comment <id>')
    .description('List or add comments to a work item')
    .option('-b, --body <text>', 'Comment body')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (id, options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();
        const workItemId = parseInt(id);
        if (options.body) {
          await addComment(configManager, workItemId, options.body);
        } else {
          await listComments(configManager, workItemId);
        }
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('view <id>')
    .description('View detailed information about a work item')
    .option('--web', 'Open work item in browser after displaying details')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (id, options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();
        await viewWorkItem(configManager, parseInt(id), options);
      } catch (error) {
        console.error(chalk.red(`Error: ${error}`));
        process.exit(1);
      }
    });

  command
    .command('edit <id>')
    .description('Edit a work item')
    .option('-a, --assignee <user>', 'Change assignee (@me for current user, empty string to unassign)')
    .option('-b, --body <text>', 'Update description')
    .option('-t, --title <title>', 'Update title')
    .option('-s, --state <state>', 'Change state')
    .option('-p, --priority <1-4>', 'Set priority level (1=highest, 4=lowest)')
    .option('-l, --label <labels>', 'Update labels/tags (comma-separated)')
    .option('--area <path>', 'Change area path')
    .option('--iteration <path>', 'Change iteration path')
    .option('--add-label <labels>', 'Add labels/tags (comma-separated)')
    .option('--remove-label <labels>', 'Remove labels/tags (comma-separated)')
    .option('-R, --repo <org/project>', 'Target organization/project')
    .action(async (id, options) => {
      try {
        if (options.repo) {
          configManager.setRepository(options.repo);
        }

        await authManager.ensureAuthenticated();
        await editWorkItem(configManager, parseInt(id), options);
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
    const type = getTypeWithColor(wi.fields['System.WorkItemType']);
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

function getTypeWithColor(type: string): string {
  const typeColors: Record<string, (text: string) => string> = {
    'EPIC': chalk.yellow,
    'FEATURE': chalk.blue
  };
  
  const colorFn = typeColors[type.toUpperCase()] || chalk.white;
  return colorFn(type);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return chalk.green('today');
  } else if (diffDays === 1) {
    return chalk.yellow('yesterday');
  } else if (diffDays < 7) {
    return chalk.yellow(`${diffDays} days ago`);
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return chalk.dim(`${weeks} week${weeks > 1 ? 's' : ''} ago`);
  } else {
    return chalk.dim(date.toLocaleDateString());
  }
}

function formatDescription(description?: string): string {
  if (!description) return chalk.dim('No description provided');
  
  // Remove HTML tags for terminal display
  const cleanDescription = description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
    
  if (cleanDescription.length === 0) {
    return chalk.dim('No description provided');
  }
  
  // Wrap long descriptions
  const maxWidth = 80;
  if (cleanDescription.length <= maxWidth) {
    return cleanDescription;
  }
  
  const words = cleanDescription.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if ((currentLine + word).length > maxWidth && currentLine.length > 0) {
      lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines.join('\n       ');
}

function displayDetailedWorkItem(workItem: WorkItem): void {
  const fields = workItem.fields;
  const webUrl = workItem._links?.html?.href;
  
  console.log('');
  
  // Header
  console.log(chalk.bold.cyan(`#${fields['System.Id']} ${fields['System.Title']}`));
  console.log(chalk.dim('─'.repeat(Math.min(process.stdout.columns || 80, 80))));
  
  // Status line
  const state = getStateWithColor(fields['System.State']);
  const type = getTypeWithColor(fields['System.WorkItemType']);
  console.log(`${chalk.bold('Status:')} ${state}  ${chalk.bold('Type:')} ${type}`);
  
  // Assignment
  const assignee = fields['System.AssignedTo']?.displayName || chalk.dim('Unassigned');
  const assigneeDisplay = fields['System.AssignedTo'] 
    ? chalk.green(assignee)
    : assignee;
  console.log(`${chalk.bold('Assignee:')} ${assigneeDisplay}`);
  
  // Priority
  if (fields['Microsoft.VSTS.Common.Priority']) {
    const priority = fields['Microsoft.VSTS.Common.Priority'];
    const priorityColors = [chalk.red, chalk.yellow, chalk.blue, chalk.gray];
    const priorityColor = priorityColors[priority - 1] || chalk.white;
    console.log(`${chalk.bold('Priority:')} ${priorityColor(priority.toString())}`);
  }
  
  // Area and Iteration
  if (fields['System.AreaPath']) {
    console.log(`${chalk.bold('Area:')} ${fields['System.AreaPath']}`);
  }
  if (fields['System.IterationPath']) {
    console.log(`${chalk.bold('Iteration:')} ${fields['System.IterationPath']}`);
  }
  
  // Tags
  if (fields['System.Tags']) {
    const tags = fields['System.Tags'].split(';').map((tag: string) => 
      chalk.cyan(`#${tag.trim()}`)
    ).join(' ');
    console.log(`${chalk.bold('Tags:')} ${tags}`);
  }
  
  console.log('');
  
  // Dates
  const created = formatDate(fields['System.CreatedDate']);
  const updated = formatDate(fields['System.ChangedDate']);
  const createdBy = fields['System.CreatedBy']?.displayName || 'Unknown';
  
  console.log(`${chalk.bold('Created:')} ${created} by ${chalk.blue(createdBy)}`);
  if (fields['System.CreatedDate'] !== fields['System.ChangedDate']) {
    console.log(`${chalk.bold('Updated:')} ${updated}`);
  }
  
  // Description
  if (fields['System.Description']) {
    console.log('');
    console.log(chalk.bold('Description:'));
    console.log(`       ${formatDescription(fields['System.Description'])}`);
  }
  
  // URL
  if (webUrl) {
    console.log('');
    console.log(`${chalk.bold('URL:')} ${chalk.blue.underline(webUrl)}`);
  }
  
  console.log('');
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
      const open = require('open');
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

async function listComments(configManager: ConfigManager, id: number): Promise<void> {
  const client = new AdoApiClient(configManager);
  const spinner = ora(`Fetching comments for work item #${id}...`).start();

  try {
    const comments: WorkItemComment[] = await client.getWorkItemComments(id);
    spinner.succeed(`Found ${comments.length} comments`);

    if (comments.length === 0) {
      console.log(chalk.yellow('No comments found.'));
      return;
    }

    console.log('');
    comments.forEach(comment => {
      const header = `${chalk.cyan(`#${comment.id}`)} ${comment.createdBy.displayName} - ${new Date(comment.createdDate).toLocaleString()}`;
      console.log(header);

      // Clean HTML from comment text
      const cleanText = comment.text
        .replace(/<[^>]*>/g, '')  // Remove HTML tags
        .replace(/&nbsp;/g, ' ')  // Replace &nbsp; with spaces
        .replace(/&amp;/g, '&')   // Replace &amp; with &
        .replace(/&lt;/g, '<')    // Replace &lt; with <
        .replace(/&gt;/g, '>')    // Replace &gt; with >
        .trim();

      console.log(cleanText);
      console.log('');
    });
  } catch (error) {
    spinner.fail(`Failed to fetch comments for work item #${id}`);
    throw error;
  }
}

async function addComment(configManager: ConfigManager, id: number, text: string): Promise<void> {
  const client = new AdoApiClient(configManager);
  const spinner = ora(`Adding comment to work item #${id}...`).start();

  try {
    const comment: WorkItemComment = await client.createWorkItemComment(id, text);
    spinner.succeed(`Comment #${comment.id} added`);

    console.log('');
    console.log(chalk.green(`✅ Comment added by ${comment.createdBy.displayName}`));
    console.log(comment.text);
  } catch (error) {
    spinner.fail(`Failed to add comment to work item #${id}`);
    throw error;
  }
}

async function editWorkItem(configManager: ConfigManager, id: number, options: any): Promise<void> {
  const client = new AdoApiClient(configManager);
  
  // First, fetch the current work item to show current values
  const spinner = ora(`Fetching work item #${id}...`).start();
  
  let currentWorkItem: WorkItem;
  try {
    currentWorkItem = await client.getWorkItem(id);
    spinner.succeed(`Work item #${id} loaded`);
  } catch (error) {
    spinner.fail(`Failed to fetch work item #${id}`);
    throw error;
  }

  const fields = currentWorkItem.fields;
  const operations: WorkItemUpdateRequest[] = [];
  
  // Check if any flags were provided for direct updates
  const hasDirectUpdates = !!(
    options.title || options.body || options.assignee !== undefined || 
    options.state || options.priority || options.label || 
    options.area || options.iteration || options.addLabel || options.removeLabel
  );
  
  if (hasDirectUpdates) {
    // Direct updates via flags
    if (options.title) {
      operations.push({ op: 'replace', path: '/fields/System.Title', value: options.title });
    }
    
    if (options.body !== undefined) {
      operations.push({ op: 'replace', path: '/fields/System.Description', value: options.body });
    }
    
    if (options.assignee !== undefined) {
      if (options.assignee === '') {
        operations.push({ op: 'remove', path: '/fields/System.AssignedTo' });
      } else {
        const assignee = options.assignee === '@me' ? '@Me' : options.assignee;
        operations.push({ op: 'replace', path: '/fields/System.AssignedTo', value: assignee });
      }
    }
    
    if (options.state) {
      operations.push({ op: 'replace', path: '/fields/System.State', value: options.state });
    }
    
    if (options.priority) {
      const priority = parseInt(options.priority);
      if (priority >= 1 && priority <= 4) {
        operations.push({ op: 'replace', path: '/fields/Microsoft.VSTS.Common.Priority', value: priority });
      } else {
        throw new Error('Priority must be between 1 and 4');
      }
    }
    
    if (options.area) {
      operations.push({ op: 'replace', path: '/fields/System.AreaPath', value: options.area });
    }
    
    if (options.iteration) {
      operations.push({ op: 'replace', path: '/fields/System.IterationPath', value: options.iteration });
    }
    
    // Handle label operations
    if (options.label) {
      const tags = options.label.split(',').map((tag: string) => tag.trim()).join(';');
      operations.push({ op: 'replace', path: '/fields/System.Tags', value: tags });
    } else if (options.addLabel || options.removeLabel) {
      const currentTags = fields['System.Tags'] ? fields['System.Tags'].split(';').map((tag: string) => tag.trim()) : [];
      let updatedTags = [...currentTags];
      
      if (options.addLabel) {
        const tagsToAdd = options.addLabel.split(',').map((tag: string) => tag.trim());
        tagsToAdd.forEach((tag: string) => {
          if (!updatedTags.includes(tag)) {
            updatedTags.push(tag);
          }
        });
      }
      
      if (options.removeLabel) {
        const tagsToRemove = options.removeLabel.split(',').map((tag: string) => tag.trim());
        updatedTags = updatedTags.filter(tag => !tagsToRemove.includes(tag));
      }
      
      const finalTags = updatedTags.join(';');
      operations.push({ op: 'replace', path: '/fields/System.Tags', value: finalTags });
    }
  } else {
    // Interactive mode
    console.log('');
    console.log(chalk.cyan(`Editing work item #${id}: ${fields['System.Title']}`));
    console.log(chalk.dim('─'.repeat(Math.min(process.stdout.columns || 80, 60))));
    
    const editChoices = [
      { name: `Title: ${chalk.yellow(fields['System.Title'])}`, value: 'title' },
      { name: `Assignee: ${fields['System.AssignedTo']?.displayName || chalk.dim('Unassigned')}`, value: 'assignee' },
      { name: `State: ${getStateWithColor(fields['System.State'])}`, value: 'state' },
      { name: `Priority: ${fields['Microsoft.VSTS.Common.Priority'] || chalk.dim('Not set')}`, value: 'priority' },
      { name: `Description: ${fields['System.Description'] ? chalk.green('Set') : chalk.dim('Not set')}`, value: 'description' },
      { name: `Tags: ${fields['System.Tags'] || chalk.dim('None')}`, value: 'tags' },
      { name: `Area Path: ${fields['System.AreaPath'] || chalk.dim('Default')}`, value: 'area' },
      { name: `Iteration Path: ${fields['System.IterationPath'] || chalk.dim('Default')}`, value: 'iteration' },
      { name: chalk.green('✓ Save changes'), value: 'save' },
      { name: chalk.red('✗ Cancel'), value: 'cancel' }
    ];
    
    const pendingOperations: WorkItemUpdateRequest[] = [];
    let continueEditing = true;
    
    while (continueEditing) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to edit?',
          choices: editChoices
        }
      ]);
      
      switch (action) {
        case 'title':
          const { newTitle } = await inquirer.prompt([
            {
              type: 'input',
              name: 'newTitle',
              message: 'New title:',
              default: fields['System.Title'],
              validate: (input: string) => input.trim() ? true : 'Title cannot be empty'
            }
          ]);
          if (newTitle !== fields['System.Title']) {
            pendingOperations.push({ op: 'replace', path: '/fields/System.Title', value: newTitle });
            editChoices[0].name = `Title: ${chalk.yellow(newTitle)}`;
          }
          break;
          
        case 'assignee':
          const { assigneeAction } = await inquirer.prompt([
            {
              type: 'list',
              name: 'assigneeAction',
              message: 'Assignee action:',
              choices: [
                { name: 'Assign to me', value: '@me' },
                { name: 'Assign to someone else', value: 'other' },
                { name: 'Unassign', value: 'unassign' },
                { name: 'Cancel', value: 'cancel' }
              ]
            }
          ]);
          
          if (assigneeAction === '@me') {
            pendingOperations.push({ op: 'replace', path: '/fields/System.AssignedTo', value: '@Me' });
            editChoices[1].name = `Assignee: ${chalk.green('You')}`;
          } else if (assigneeAction === 'other') {
            const { assigneeName } = await inquirer.prompt([
              {
                type: 'input',
                name: 'assigneeName',
                message: 'Assignee (username or email):',
                validate: (input: string) => input.trim() ? true : 'Assignee cannot be empty'
              }
            ]);
            pendingOperations.push({ op: 'replace', path: '/fields/System.AssignedTo', value: assigneeName });
            editChoices[1].name = `Assignee: ${chalk.green(assigneeName)}`;
          } else if (assigneeAction === 'unassign') {
            pendingOperations.push({ op: 'remove', path: '/fields/System.AssignedTo' });
            editChoices[1].name = `Assignee: ${chalk.dim('Unassigned')}`;
          }
          break;
          
        case 'state':
          const { newState } = await inquirer.prompt([
            {
              type: 'input',
              name: 'newState',
              message: 'New state:',
              default: fields['System.State'],
              validate: (input: string) => input.trim() ? true : 'State cannot be empty'
            }
          ]);
          if (newState !== fields['System.State']) {
            pendingOperations.push({ op: 'replace', path: '/fields/System.State', value: newState });
            editChoices[2].name = `State: ${getStateWithColor(newState)}`;
          }
          break;
          
        case 'priority':
          const { newPriority } = await inquirer.prompt([
            {
              type: 'list',
              name: 'newPriority',
              message: 'Select priority:',
              choices: [
                { name: '1 - Critical (Red)', value: 1 },
                { name: '2 - High (Yellow)', value: 2 },
                { name: '3 - Medium (Blue)', value: 3 },
                { name: '4 - Low (Gray)', value: 4 },
                { name: 'Remove priority', value: null }
              ],
              default: fields['Microsoft.VSTS.Common.Priority'] || 3
            }
          ]);
          
          if (newPriority === null) {
            pendingOperations.push({ op: 'remove', path: '/fields/Microsoft.VSTS.Common.Priority' });
            editChoices[3].name = `Priority: ${chalk.dim('Not set')}`;
          } else if (newPriority !== fields['Microsoft.VSTS.Common.Priority']) {
            pendingOperations.push({ op: 'replace', path: '/fields/Microsoft.VSTS.Common.Priority', value: newPriority });
            const priorityColors = [chalk.red, chalk.yellow, chalk.blue, chalk.gray];
            const priorityColor = priorityColors[newPriority - 1];
            editChoices[3].name = `Priority: ${priorityColor(newPriority.toString())}`;
          }
          break;
          
        case 'description':
          const { newDescription } = await inquirer.prompt([
            {
              type: 'editor',
              name: 'newDescription',
              message: 'Update description:',
              default: fields['System.Description'] || ''
            }
          ]);
          
          if (newDescription !== (fields['System.Description'] || '')) {
            pendingOperations.push({ op: 'replace', path: '/fields/System.Description', value: newDescription });
            editChoices[4].name = `Description: ${newDescription ? chalk.green('Updated') : chalk.dim('Cleared')}`;
          }
          break;
          
        case 'tags':
          const { newTags } = await inquirer.prompt([
            {
              type: 'input',
              name: 'newTags',
              message: 'Tags (comma-separated):',
              default: fields['System.Tags'] ? fields['System.Tags'].replace(/;/g, ', ') : ''
            }
          ]);
          
          const formattedTags = newTags ? newTags.split(',').map((tag: string) => tag.trim()).join(';') : '';
          if (formattedTags !== (fields['System.Tags'] || '')) {
            if (formattedTags) {
              pendingOperations.push({ op: 'replace', path: '/fields/System.Tags', value: formattedTags });
              editChoices[5].name = `Tags: ${chalk.cyan(formattedTags.replace(/;/g, ', '))}`;
            } else {
              pendingOperations.push({ op: 'remove', path: '/fields/System.Tags' });
              editChoices[5].name = `Tags: ${chalk.dim('None')}`;
            }
          }
          break;
          
        case 'area':
          const { newArea } = await inquirer.prompt([
            {
              type: 'input',
              name: 'newArea',
              message: 'Area path:',
              default: fields['System.AreaPath']
            }
          ]);
          
          if (newArea !== fields['System.AreaPath']) {
            pendingOperations.push({ op: 'replace', path: '/fields/System.AreaPath', value: newArea });
            editChoices[6].name = `Area Path: ${newArea || chalk.dim('Default')}`;
          }
          break;
          
        case 'iteration':
          const { newIteration } = await inquirer.prompt([
            {
              type: 'input',
              name: 'newIteration',
              message: 'Iteration path:',
              default: fields['System.IterationPath']
            }
          ]);
          
          if (newIteration !== fields['System.IterationPath']) {
            pendingOperations.push({ op: 'replace', path: '/fields/System.IterationPath', value: newIteration });
            editChoices[7].name = `Iteration Path: ${newIteration || chalk.dim('Default')}`;
          }
          break;
          
        case 'save':
          operations.push(...pendingOperations);
          continueEditing = false;
          break;
          
        case 'cancel':
          console.log(chalk.yellow('Edit cancelled.'));
          return;
      }
    }
  }
  
  if (operations.length === 0) {
    console.log(chalk.yellow('No changes to save.'));
    return;
  }
  
  // Apply the updates
  const updateSpinner = ora('Updating work item...').start();
  
  try {
    const updatedWorkItem = await client.updateWorkItem(id, operations);
    updateSpinner.succeed(`Work item #${id} updated successfully`);
    
    console.log('');
    console.log(chalk.green(`✅ Work item #${id} updated`));
    console.log(`📝 Title: ${updatedWorkItem.fields['System.Title']}`);
    console.log(`📊 State: ${getStateWithColor(updatedWorkItem.fields['System.State'])}`);
    
    if (updatedWorkItem.fields['System.AssignedTo']) {
      console.log(`👤 Assignee: ${chalk.green(updatedWorkItem.fields['System.AssignedTo'].displayName)}`);
    }
    
    const webUrl = updatedWorkItem._links?.html?.href;
    if (webUrl) {
      console.log(`🔗 URL: ${chalk.blue.underline(webUrl)}`);
    }
    
  } catch (error) {
    updateSpinner.fail(`Failed to update work item #${id}`);
    throw error;
  }
}

async function viewWorkItem(configManager: ConfigManager, id: number, options: any = {}): Promise<void> {
  const client = new AdoApiClient(configManager);
  
  const spinner = ora(`Fetching work item #${id}...`).start();
  
  try {
    const workItem = await client.getWorkItem(id);
    spinner.succeed(`Work item #${id} loaded`);
    
    displayDetailedWorkItem(workItem);
    
    if (options.web) {
      const webUrl = workItem._links?.html?.href;
      if (webUrl) {
        console.log('');
        console.log(chalk.cyan('🌐 Opening in browser...'));
        const open = require('open');
        await open(webUrl);
      }
    }
  } catch (error) {
    spinner.fail(`Failed to fetch work item #${id}`);
    throw error;
  }
}