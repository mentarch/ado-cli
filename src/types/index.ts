export interface AdoConfig {
  organization?: string;
  project?: string;
  token?: string;
}

export interface WorkItem {
  id: number;
  rev: number;
  fields: {
    [key: string]: any;
    'System.Id': number;
    'System.Title': string;
    'System.WorkItemType': string;
    'System.State': string;
    'System.AssignedTo'?: {
      displayName: string;
      uniqueName: string;
    };
    'System.CreatedBy': {
      displayName: string;
      uniqueName: string;
    };
    'System.CreatedDate': string;
    'System.ChangedDate': string;
    'System.AreaPath': string;
    'System.IterationPath': string;
    'System.Description'?: string;
    'System.Tags'?: string;
    'Microsoft.VSTS.Common.Priority'?: number;
  };
  _links: {
    self: { href: string };
    workItemUpdates: { href: string };
    workItemRevisions: { href: string };
    workItemComments: { href: string };
    html: { href: string };
    workItemType: { href: string };
    fields: { href: string };
  };
  url: string;
}

export interface WorkItemComment {
  id: number;
  text: string;
  createdDate: string;
  createdBy: {
    displayName: string;
    uniqueName: string;
    id: string;
    url?: string;
    imageUrl?: string;
    _links?: any;
    descriptor?: string;
  };
  modifiedBy?: {
    displayName: string;
    uniqueName: string;
    id: string;
    url?: string;
    imageUrl?: string;
    _links?: any;
    descriptor?: string;
  };
  modifiedDate?: string;
  version?: number;
  workItemId?: number;
  format?: string;
  renderedText?: string;
  url?: string;
  mentions?: any[];
}

export interface WorkItemType {
  name: string;
  referenceName: string;
  description: string;
  color: string;
  icon: {
    id: string;
    url: string;
  };
  isDisabled: boolean;
}

export interface CreateWorkItemRequest {
  title: string;
  workItemType: string;
  description?: string;
  assignedTo?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string[];
  priority?: number;
  state?: string;
}

export interface ListWorkItemsOptions {
  assignee?: string;
  author?: string;
  state?: string;
  workItemType?: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AdoApiResponse<T> {
  value: T[];
  count: number;
}

export interface WorkItemUpdateRequest {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: any;
  from?: string;
}

export interface PullRequest {
  pullRequestId: number;
  title: string;
  description?: string;
  status: string;
  createdBy: {
    displayName: string;
    uniqueName: string;
  };
  creationDate: string;
  sourceRefName: string;
  targetRefName: string;
  _links: {
    web?: { href: string };
  };
}

export interface CreatePullRequestRequest {
  sourceRefName: string;
  targetRefName: string;
  title: string;
  description?: string;
}