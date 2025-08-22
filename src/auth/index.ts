import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigManager } from '../config';
import { AdoApiClient } from '../api/client';

export class AuthManager {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async ensureAuthenticated(): Promise<void> {
    const token = await this.configManager.getToken();
    
    if (!token) {
      console.log(chalk.yellow('No authentication token found.'));
      await this.login();
      return;
    }

    const client = new AdoApiClient(this.configManager);
    const isValid = await client.testConnection();
    
    if (!isValid) {
      console.log(chalk.yellow('Stored token is invalid or expired.'));
      await this.login();
    }
  }

  async login(): Promise<void> {
    console.log(chalk.blue('🔐 Azure DevOps Authentication'));
    console.log('');
    
    // Check if organization and project are set first
    const currentOrg = this.configManager.getOrganization();
    const currentProject = this.configManager.getProject();
    
    if (!currentOrg || !currentProject) {
      console.log(chalk.yellow('⚠️  No default organization/project configured'));
      console.log(chalk.dim('Let\'s set up your default organization and project first:'));
      console.log('');
      
      const orgProjectAnswers = await inquirer.prompt([
        {
          type: 'input',
          name: 'organization',
          message: 'Enter your Azure DevOps organization name:',
          default: currentOrg || '',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Organization name is required';
            }
            return true;
          }
        },
        {
          type: 'input',
          name: 'project',
          message: 'Enter your Azure DevOps project name:',
          default: currentProject || '',
          validate: (input: string) => {
            if (!input.trim()) {
              return 'Project name is required';
            }
            return true;
          }
        }
      ]);
      
      this.configManager.setOrganization(orgProjectAnswers.organization.trim());
      this.configManager.setProject(orgProjectAnswers.project.trim());
      
      console.log(chalk.green(`✅ Default repository set to: ${chalk.cyan(orgProjectAnswers.organization.trim() + '/' + orgProjectAnswers.project.trim())}`));
      console.log('');
    }
    
    console.log('To authenticate, you need a Personal Access Token (PAT) from Azure DevOps.');
    console.log('');
    console.log(chalk.dim('Steps to get a PAT:'));
    console.log(chalk.dim('1. Go to https://dev.azure.com'));
    console.log(chalk.dim('2. Click User Settings > Personal Access Tokens'));
    console.log(chalk.dim('3. Create a new token with Work Items: Read & Write permissions'));
    console.log('');

    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter your Personal Access Token:',
        mask: '*',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Token is required';
          }
          return true;
        }
      }
    ]);

    const token = answers.token.trim();

    try {
      await this.configManager.setToken(token);
      
      const client = new AdoApiClient(this.configManager);
      const isValid = await client.testConnection();
      
      if (!isValid) {
        await this.configManager.deleteToken();
        throw new Error('Invalid token or insufficient permissions');
      }
      
      console.log(chalk.green('✅ Authentication successful!'));
      
    } catch (error) {
      console.log(chalk.red(`❌ Authentication failed: ${error}`));
      throw error;
    }
  }

  async status(): Promise<void> {
    const token = await this.configManager.getToken();
    const repository = this.configManager.getRepository();
    
    if (!token) {
      console.log(chalk.red('❌ Not authenticated'));
      console.log('Run `ado auth login` to authenticate');
      return;
    }

    const client = new AdoApiClient(this.configManager);
    const isValid = await client.testConnection();
    
    if (isValid) {
      console.log(chalk.green('✅ Authenticated'));
      if (repository) {
        console.log(`📁 Default repository: ${chalk.cyan(repository)}`);
      } else {
        console.log(chalk.yellow('⚠️  No default repository set'));
        console.log('Use `-R organization/project` or set with `ado repo set-default`');
      }
    } else {
      console.log(chalk.red('❌ Token is invalid or expired'));
      console.log('Run `ado auth login` to re-authenticate');
    }
  }

  async logout(): Promise<void> {
    await this.configManager.deleteToken();
    console.log(chalk.green('✅ Logged out successfully'));
  }
}