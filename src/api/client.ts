import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ConfigManager } from '../config';
import { WorkItem, WorkItemType, CreateWorkItemRequest, WorkItemUpdateRequest, AdoApiResponse } from '../types';

export class AdoApiClient {
  private client: AxiosInstance;
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.client = axios.create({
      timeout: 30000,
    });

    this.client.interceptors.request.use(async (config) => {
      const token = await this.configManager.getToken();
      if (token) {
        const encodedToken = Buffer.from(`:${token}`).toString('base64');
        config.headers.Authorization = `Basic ${encodedToken}`;
      }
      return config;
    });
  }

  private getBaseUrl(): string {
    const organization = this.configManager.getOrganization();
    if (!organization) {
      throw new Error('Organization not configured. Use -R organization/project or set default repository.');
    }
    return `https://dev.azure.com/${encodeURIComponent(organization)}`;
  }

  private getProject(): string {
    const project = this.configManager.getProject();
    if (!project) {
      throw new Error('Project not configured. Use -R organization/project or set default repository.');
    }
    return encodeURIComponent(project);
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test token by calling the Azure DevOps REST API with organization
      // This endpoint validates the token and returns organization information
      const organization = this.configManager.getOrganization();
      if (!organization) {
        console.log('❌ No organization configured for token validation');
        return false;
      }
      
      const response = await this.client.get(`https://dev.azure.com/${encodeURIComponent(organization)}/_apis/projects`, {
        params: { 'api-version': '7.1' }
      });
      console.log('✅ Token validation successful');
      return true;
    } catch (error: any) {
      console.log('❌ Token validation failed:');
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Status Text: ${error.response.statusText}`);
        if (error.response.data) {
          console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
        }
      } else if (error.request) {
        console.log(`   Network Error: ${error.message}`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
      return false;
    }
  }

  async getWorkItemTypes(): Promise<WorkItemType[]> {
    const baseUrl = this.getBaseUrl();
    const project = this.getProject();
    
    const response = await this.client.get<AdoApiResponse<WorkItemType>>(
      `${baseUrl}/${project}/_apis/wit/workitemtypes`,
      {
        params: { 'api-version': '7.1' }
      }
    );
    
    return response.data.value;
  }

  async getWorkItems(wiql: string, limit: number = 30): Promise<WorkItem[]> {
    const baseUrl = this.getBaseUrl();
    const project = this.getProject();
    
    // First, execute WIQL query to get work item IDs
    const queryResponse = await this.client.post(
      `${baseUrl}/${project}/_apis/wit/wiql`,
      { query: wiql },
      {
        params: { 
          'api-version': '7.1',
          '$top': limit
        },
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const workItemIds = queryResponse.data.workItems?.map((wi: any) => wi.id) || [];
    
    if (workItemIds.length === 0) {
      return [];
    }
    
    // Then fetch the actual work items
    const workItemsResponse = await this.client.get<AdoApiResponse<WorkItem>>(
      `${baseUrl}/${project}/_apis/wit/workitems`,
      {
        params: {
          ids: workItemIds.join(','),
          '$expand': 'fields',
          'api-version': '7.1'
        }
      }
    );
    
    return workItemsResponse.data.value;
  }

  async getWorkItem(id: number): Promise<WorkItem> {
    const baseUrl = this.getBaseUrl();
    const project = this.getProject();
    
    const response = await this.client.get<WorkItem>(
      `${baseUrl}/${project}/_apis/wit/workitems/${id}`,
      {
        params: {
          '$expand': 'fields',
          'api-version': '7.1'
        }
      }
    );
    
    return response.data;
  }

  async createWorkItem(request: CreateWorkItemRequest): Promise<WorkItem> {
    const baseUrl = this.getBaseUrl();
    const project = this.getProject();
    
    const operations: WorkItemUpdateRequest[] = [
      { op: 'add', path: '/fields/System.Title', value: request.title }
    ];
    
    if (request.description) {
      operations.push({ op: 'add', path: '/fields/System.Description', value: request.description });
    }
    
    if (request.assignedTo) {
      operations.push({ op: 'add', path: '/fields/System.AssignedTo', value: request.assignedTo });
    }
    
    if (request.areaPath) {
      operations.push({ op: 'add', path: '/fields/System.AreaPath', value: request.areaPath });
    }
    
    if (request.iterationPath) {
      operations.push({ op: 'add', path: '/fields/System.IterationPath', value: request.iterationPath });
    }
    
    if (request.tags && request.tags.length > 0) {
      operations.push({ op: 'add', path: '/fields/System.Tags', value: request.tags.join(';') });
    }
    
    if (request.priority) {
      operations.push({ op: 'add', path: '/fields/Microsoft.VSTS.Common.Priority', value: request.priority });
    }
    
    if (request.state) {
      operations.push({ op: 'add', path: '/fields/System.State', value: request.state });
    }
    
    const response = await this.client.post<WorkItem>(
      `${baseUrl}/${project}/_apis/wit/workitems/$${request.workItemType}`,
      operations,
      {
        params: { 'api-version': '7.1' },
        headers: { 'Content-Type': 'application/json-patch+json' }
      }
    );
    
    return response.data;
  }

  async updateWorkItem(id: number, operations: WorkItemUpdateRequest[]): Promise<WorkItem> {
    const baseUrl = this.getBaseUrl();
    const project = this.getProject();
    
    const response = await this.client.patch<WorkItem>(
      `${baseUrl}/${project}/_apis/wit/workitems/${id}`,
      operations,
      {
        params: { 'api-version': '7.1' },
        headers: { 'Content-Type': 'application/json-patch+json' }
      }
    );
    
    return response.data;
  }

  async deleteWorkItem(id: number): Promise<void> {
    const baseUrl = this.getBaseUrl();
    const project = this.getProject();
    
    await this.client.delete(
      `${baseUrl}/${project}/_apis/wit/workitems/${id}`,
      {
        params: { 'api-version': '7.1' }
      }
    );
  }
}