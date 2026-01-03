import {
  WorkItem,
  TeamConfig,
  TeamMember,
  HealthThresholds,
  StateCategories,
  HealthAlert,
  TeamHealthReport,
  MemberWorkload,
  ActivitySummary,
} from '../../types';

export class HealthAnalyzer {
  constructor(
    private thresholds: HealthThresholds,
    private stateCategories: StateCategories
  ) {}

  analyzeTeamHealth(workItems: WorkItem[], team: TeamConfig): TeamHealthReport {
    const now = new Date();
    const alerts: HealthAlert[] = [];

    // Run all detection functions
    alerts.push(...this.detectStaleItems(workItems));
    alerts.push(...this.detectBlockedItems(workItems));
    alerts.push(...this.detectHighPriorityAtRisk(workItems));
    const workloadAlerts = this.detectWorkloadImbalance(workItems, team);
    alerts.push(...workloadAlerts);

    // Get unassigned items
    const unassignedItems = this.getUnassignedItems(workItems);
    if (unassignedItems.length > 0) {
      alerts.push({
        severity: 'alert',
        category: 'unassigned',
        message: `${unassignedItems.length} unassigned work item${unassignedItems.length > 1 ? 's' : ''}`,
        workItems: unassignedItems,
      });
    }

    // Calculate workload distribution
    const workloadDistribution = this.calculateWorkloadDistribution(workItems, team);

    // Calculate activity summary
    const recentActivity = this.calculateActivitySummary(workItems);

    // Calculate health score
    const healthScore = this.calculateHealthScore(alerts, workItems.length, team.members.length);

    // Count active (non-completed) items
    const activeItems = workItems.filter(wi => !this.isCompleted(wi)).length;

    return {
      generatedAt: now.toISOString(),
      team,
      summary: {
        teamSize: team.members.length,
        activeItems,
        healthScore,
      },
      alerts,
      workloadDistribution,
      unassignedItems,
      recentActivity,
    };
  }

  private detectStaleItems(workItems: WorkItem[]): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const now = new Date();
    const staleThreshold = this.thresholds.staleDays * 24 * 60 * 60 * 1000;

    const staleItems = workItems.filter(wi => {
      if (this.isCompleted(wi)) return false;
      const changedDate = new Date(wi.fields['System.ChangedDate']);
      return (now.getTime() - changedDate.getTime()) > staleThreshold;
    });

    if (staleItems.length > 0) {
      // Separate critical (high priority stale) from regular stale
      const highPriorityStale = staleItems.filter(wi =>
        (wi.fields['Microsoft.VSTS.Common.Priority'] || 4) <= 2
      );
      const regularStale = staleItems.filter(wi =>
        (wi.fields['Microsoft.VSTS.Common.Priority'] || 4) > 2
      );

      if (highPriorityStale.length > 0) {
        alerts.push({
          severity: 'alert',
          category: 'stale',
          message: `${highPriorityStale.length} high priority item${highPriorityStale.length > 1 ? 's' : ''} stale > ${this.thresholds.staleDays} days`,
          workItems: highPriorityStale,
        });
      }

      if (regularStale.length > 0) {
        alerts.push({
          severity: 'warning',
          category: 'stale',
          message: `${regularStale.length} item${regularStale.length > 1 ? 's' : ''} not updated in ${this.thresholds.staleDays}+ days`,
          workItems: regularStale,
        });
      }
    }

    return alerts;
  }

  private detectBlockedItems(workItems: WorkItem[]): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const blockedItems = workItems.filter(wi =>
      this.stateCategories.blocked.some(state =>
        wi.fields['System.State'].toLowerCase() === state.toLowerCase()
      )
    );

    if (blockedItems.length > 0) {
      // Check how long items have been blocked (approximation using ChangedDate)
      const now = new Date();
      const longBlockedThreshold = 7 * 24 * 60 * 60 * 1000; // 7 days

      const longBlocked = blockedItems.filter(wi => {
        const changedDate = new Date(wi.fields['System.ChangedDate']);
        return (now.getTime() - changedDate.getTime()) > longBlockedThreshold;
      });

      if (longBlocked.length > 0) {
        alerts.push({
          severity: 'alert',
          category: 'blocked',
          message: `${longBlocked.length} item${longBlocked.length > 1 ? 's' : ''} blocked > 7 days`,
          workItems: longBlocked,
        });
      }

      const recentBlocked = blockedItems.filter(wi => !longBlocked.includes(wi));
      if (recentBlocked.length > 0) {
        alerts.push({
          severity: 'warning',
          category: 'blocked',
          message: `${recentBlocked.length} item${recentBlocked.length > 1 ? 's' : ''} currently blocked`,
          workItems: recentBlocked,
        });
      }
    }

    return alerts;
  }

  private detectHighPriorityAtRisk(workItems: WorkItem[]): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const now = new Date();
    const threshold = this.thresholds.highPriorityDays * 24 * 60 * 60 * 1000;

    // High priority items (P1 or P2) that haven't been updated recently
    const atRiskItems = workItems.filter(wi => {
      if (this.isCompleted(wi)) return false;
      const priority = wi.fields['Microsoft.VSTS.Common.Priority'] || 4;
      if (priority > 2) return false; // Only P1 and P2

      const changedDate = new Date(wi.fields['System.ChangedDate']);
      return (now.getTime() - changedDate.getTime()) > threshold;
    });

    if (atRiskItems.length > 0) {
      alerts.push({
        severity: 'alert',
        category: 'high-priority',
        message: `${atRiskItems.length} high priority item${atRiskItems.length > 1 ? 's' : ''} at risk (no progress in ${this.thresholds.highPriorityDays}+ days)`,
        workItems: atRiskItems,
      });
    }

    return alerts;
  }

  private detectWorkloadImbalance(workItems: WorkItem[], team: TeamConfig): HealthAlert[] {
    const alerts: HealthAlert[] = [];
    const memberCounts = new Map<string, number>();

    // Initialize counts for all members
    team.members.forEach(m => memberCounts.set(m.email.toLowerCase(), 0));

    // Count items per member
    workItems.forEach(wi => {
      if (this.isCompleted(wi)) return;
      const assignee = wi.fields['System.AssignedTo'];
      if (!assignee) return;

      const email = assignee.uniqueName?.toLowerCase();
      if (email && memberCounts.has(email)) {
        memberCounts.set(email, (memberCounts.get(email) || 0) + 1);
      } else {
        // Try to match by display name or aliases
        for (const member of team.members) {
          if (this.matchesMember(assignee, member)) {
            memberCounts.set(member.email.toLowerCase(), (memberCounts.get(member.email.toLowerCase()) || 0) + 1);
            break;
          }
        }
      }
    });

    // Check for imbalances
    for (const member of team.members) {
      const count = memberCounts.get(member.email.toLowerCase()) || 0;

      if (count > this.thresholds.maxItemsPerPerson) {
        alerts.push({
          severity: 'warning',
          category: 'workload',
          message: `${member.name}: ${count} items (above threshold of ${this.thresholds.maxItemsPerPerson})`,
          member,
        });
      } else if (count < this.thresholds.minItemsPerPerson) {
        alerts.push({
          severity: 'info',
          category: 'workload',
          message: `${member.name}: ${count} items (below threshold of ${this.thresholds.minItemsPerPerson})`,
          member,
        });
      }
    }

    return alerts;
  }

  private getUnassignedItems(workItems: WorkItem[]): WorkItem[] {
    return workItems.filter(wi => {
      if (this.isCompleted(wi)) return false;
      return !wi.fields['System.AssignedTo'];
    });
  }

  private calculateWorkloadDistribution(workItems: WorkItem[], team: TeamConfig): MemberWorkload[] {
    const distribution: MemberWorkload[] = [];

    for (const member of team.members) {
      const memberItems = workItems.filter(wi => {
        const assignee = wi.fields['System.AssignedTo'];
        return assignee && this.matchesMember(assignee, member);
      });

      const activeItems = memberItems.filter(wi =>
        this.stateCategories.active.some(s =>
          wi.fields['System.State'].toLowerCase() === s.toLowerCase()
        )
      );

      const blockedItems = memberItems.filter(wi =>
        this.stateCategories.blocked.some(s =>
          wi.fields['System.State'].toLowerCase() === s.toLowerCase()
        )
      );

      const total = memberItems.filter(wi => !this.isCompleted(wi)).length;

      let status: 'ok' | 'warning' | 'alert' = 'ok';
      if (total > this.thresholds.maxItemsPerPerson) {
        status = 'alert';
      } else if (total < this.thresholds.minItemsPerPerson) {
        status = 'warning';
      }

      distribution.push({
        member,
        active: activeItems.length,
        blocked: blockedItems.length,
        total,
        items: memberItems,
        status,
      });
    }

    // Sort by total items descending
    return distribution.sort((a, b) => b.total - a.total);
  }

  private calculateActivitySummary(workItems: WorkItem[]): ActivitySummary {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const last24h = { updated: 0, closed: 0, created: 0 };
    const last7d = { updated: 0, closed: 0, created: 0 };

    workItems.forEach(wi => {
      const changedDate = new Date(wi.fields['System.ChangedDate']);
      const createdDate = new Date(wi.fields['System.CreatedDate']);
      const isClosed = this.isCompleted(wi);

      // Last 24 hours
      if (changedDate >= oneDayAgo) {
        last24h.updated++;
        if (isClosed) last24h.closed++;
      }
      if (createdDate >= oneDayAgo) {
        last24h.created++;
      }

      // Last 7 days
      if (changedDate >= sevenDaysAgo) {
        last7d.updated++;
        if (isClosed) last7d.closed++;
      }
      if (createdDate >= sevenDaysAgo) {
        last7d.created++;
      }
    });

    return { last24h, last7d };
  }

  private calculateHealthScore(alerts: HealthAlert[], totalItems: number, teamSize: number): number {
    // Start at 100 and deduct points for issues
    let score = 100;

    for (const alert of alerts) {
      const itemCount = alert.workItems?.length || 1;

      switch (alert.severity) {
        case 'alert':
          score -= Math.min(15, itemCount * 5); // Max 15 points per alert category
          break;
        case 'warning':
          score -= Math.min(10, itemCount * 2); // Max 10 points per warning category
          break;
        case 'info':
          score -= Math.min(5, itemCount); // Max 5 points per info
          break;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private isCompleted(wi: WorkItem): boolean {
    return this.stateCategories.completed.some(state =>
      wi.fields['System.State'].toLowerCase() === state.toLowerCase()
    );
  }

  private matchesMember(assignee: { displayName: string; uniqueName: string }, member: TeamMember): boolean {
    const email = assignee.uniqueName?.toLowerCase();
    const name = assignee.displayName?.toLowerCase();

    if (email === member.email.toLowerCase()) return true;
    if (name === member.name.toLowerCase()) return true;

    if (member.aliases) {
      for (const alias of member.aliases) {
        if (email === alias.toLowerCase() || name === alias.toLowerCase()) {
          return true;
        }
      }
    }

    return false;
  }

  getDaysSinceUpdate(wi: WorkItem): number {
    const now = new Date();
    const changedDate = new Date(wi.fields['System.ChangedDate']);
    return Math.floor((now.getTime() - changedDate.getTime()) / (24 * 60 * 60 * 1000));
  }
}
