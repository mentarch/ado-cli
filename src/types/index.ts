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

// Team Health Types

export interface TeamMember {
  name: string;
  email: string;
  aliases?: string[];
}

export interface TeamConfig {
  name: string;
  members: TeamMember[];
}

export interface HealthThresholds {
  staleDays: number;
  stuckInStateDays: number;
  maxItemsPerPerson: number;
  minItemsPerPerson: number;
  highPriorityDays: number;
}

export interface StateCategories {
  active: string[];
  blocked: string[];
  completed: string[];
}

export interface TeamHealthConfig {
  team: TeamConfig;
  thresholds: HealthThresholds;
  states: StateCategories;
}

export type AlertSeverity = 'alert' | 'warning' | 'info';
export type AlertCategory = 'stale' | 'blocked' | 'workload' | 'unassigned' | 'high-priority';

export interface HealthAlert {
  severity: AlertSeverity;
  category: AlertCategory;
  message: string;
  workItems?: WorkItem[];
  member?: TeamMember;
}

export interface MemberWorkload {
  member: TeamMember;
  active: number;
  blocked: number;
  total: number;
  items: WorkItem[];
  status: 'ok' | 'warning' | 'alert';
}

export interface ActivitySummary {
  last24h: { updated: number; closed: number; created: number };
  last7d: { updated: number; closed: number; created: number };
}

export interface TeamHealthReport {
  generatedAt: string;
  team: TeamConfig;
  summary: {
    teamSize: number;
    activeItems: number;
    healthScore: number;
  };
  alerts: HealthAlert[];
  workloadDistribution: MemberWorkload[];
  unassignedItems: WorkItem[];
  recentActivity: ActivitySummary;
}