import * as keytar from 'keytar';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AdoConfig } from '../types';

const SERVICE_NAME = 'ado-cli';
const CONFIG_DIR = path.join(os.homedir(), '.config', 'ado-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export class ConfigManager {
  private config: AdoConfig = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const configData = fs.readFileSync(CONFIG_FILE, 'utf8');
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      this.config = {};
    }
  }

  private saveConfig(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error}`);
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await keytar.getPassword(SERVICE_NAME, 'token');
    } catch (error) {
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await keytar.setPassword(SERVICE_NAME, 'token', token);
    } catch (error) {
      throw new Error(`Failed to store token: ${error}`);
    }
  }

  async deleteToken(): Promise<void> {
    try {
      await keytar.deletePassword(SERVICE_NAME, 'token');
    } catch (error) {
      // Ignore errors when deleting non-existent tokens
    }
  }

  getOrganization(): string | undefined {
    return this.config.organization;
  }

  setOrganization(organization: string): void {
    this.config.organization = organization;
    this.saveConfig();
  }

  getProject(): string | undefined {
    return this.config.project;
  }

  setProject(project: string): void {
    this.config.project = project;
    this.saveConfig();
  }

  setRepository(orgProject: string): void {
    const [organization, project] = orgProject.split('/');
    if (!organization || !project) {
      throw new Error('Repository must be in format: organization/project');
    }
    this.setOrganization(organization);
    this.setProject(project);
  }

  getRepository(): string | undefined {
    const org = this.getOrganization();
    const project = this.getProject();
    return org && project ? `${org}/${project}` : undefined;
  }

  getConfig(): AdoConfig {
    return { ...this.config };
  }

  clearConfig(): void {
    this.config = {};
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        fs.unlinkSync(CONFIG_FILE);
      }
    } catch (error) {
      // Ignore errors when deleting non-existent files
    }
  }
}