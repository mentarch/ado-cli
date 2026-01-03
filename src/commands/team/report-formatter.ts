import chalk from 'chalk';
import Table from 'cli-table3';
import { TeamHealthReport, HealthAlert, MemberWorkload, WorkItem } from '../../types';
import { HealthAnalyzer } from './health-analyzer';

export class ReportFormatter {
  constructor(private analyzer?: HealthAnalyzer) {}

  formatReport(report: TeamHealthReport, options: { detail?: boolean } = {}): void {
    this.printHeader(report);
    this.printSummary(report);
    this.printAlerts(report.alerts.filter(a => a.severity === 'alert'));
    this.printWarnings(report.alerts.filter(a => a.severity === 'warning' || a.severity === 'info'));
    this.printWorkloadTable(report.workloadDistribution);

    if (report.unassignedItems.length > 0) {
      this.printUnassignedItems(report.unassignedItems, options.detail);
    }

    this.printActivitySummary(report.recentActivity);
    this.printFooter();
  }

  private printHeader(report: TeamHealthReport): void {
    const date = new Date(report.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    console.log('');
    console.log(chalk.cyan('═'.repeat(72)));
    console.log(chalk.cyan.bold('                         TEAM HEALTH REPORT'));
    console.log(chalk.cyan(`                    ${report.team.name} - ${date}`));
    console.log(chalk.cyan('═'.repeat(72)));
    console.log('');
  }

  private printSummary(report: TeamHealthReport): void {
    const { summary } = report;
    const scoreColor = summary.healthScore >= 80 ? chalk.green :
                       summary.healthScore >= 60 ? chalk.yellow : chalk.red;

    console.log(chalk.bold('SUMMARY'));
    console.log(chalk.gray('─'.repeat(40)));
    console.log(`Team Size: ${chalk.bold(summary.teamSize)} members | ` +
                `Active Items: ${chalk.bold(summary.activeItems)} | ` +
                `Health Score: ${scoreColor.bold(summary.healthScore + '/100')}`);
    console.log('');

    // Summary table
    const alerts = report.alerts;
    const alertCount = alerts.filter(a => a.severity === 'alert').length;
    const warnCount = alerts.filter(a => a.severity === 'warning').length;
    const infoCount = alerts.filter(a => a.severity === 'info').length;

    if (alertCount > 0 || warnCount > 0) {
      console.log(`Issues: ${chalk.red.bold(alertCount + ' alerts')} | ` +
                  `${chalk.yellow.bold(warnCount + ' warnings')} | ` +
                  `${chalk.blue(infoCount + ' info')}`);
      console.log('');
    }
  }

  private printAlerts(alerts: HealthAlert[]): void {
    if (alerts.length === 0) return;

    console.log(chalk.red.bold('ALERTS (Action Required)'));
    console.log(chalk.gray('─'.repeat(40)));

    for (const alert of alerts) {
      console.log(chalk.red('[!] ' + alert.message));

      if (alert.workItems && alert.workItems.length > 0) {
        const items = alert.workItems.slice(0, 5); // Show max 5 items
        for (const wi of items) {
          const daysSince = this.getDaysSinceUpdate(wi);
          const priority = wi.fields['Microsoft.VSTS.Common.Priority'] || '-';
          const assignee = wi.fields['System.AssignedTo']?.displayName || 'Unassigned';
          const title = this.truncate(wi.fields['System.Title'], 35);

          console.log(chalk.gray(`    #${wi.id} ${title}`));
          console.log(chalk.gray(`        P${priority}  ${assignee}  ${daysSince} days stale`));
        }
        if (alert.workItems.length > 5) {
          console.log(chalk.gray(`    ... and ${alert.workItems.length - 5} more`));
        }
      }
      console.log('');
    }
  }

  private printWarnings(alerts: HealthAlert[]): void {
    if (alerts.length === 0) return;

    console.log(chalk.yellow.bold('WARNINGS'));
    console.log(chalk.gray('─'.repeat(40)));

    for (const alert of alerts) {
      const prefix = alert.severity === 'warning' ? chalk.yellow('[~]') : chalk.blue('[i]');
      console.log(`${prefix} ${alert.message}`);

      if (alert.workItems && alert.workItems.length > 0 && alert.workItems.length <= 3) {
        for (const wi of alert.workItems) {
          const daysSince = this.getDaysSinceUpdate(wi);
          const state = wi.fields['System.State'];
          const assignee = wi.fields['System.AssignedTo']?.displayName || '-';
          const title = this.truncate(wi.fields['System.Title'], 40);

          console.log(chalk.gray(`    #${wi.id} ${title}  ${state}  ${assignee}  ${daysSince}d`));
        }
      }
    }
    console.log('');
  }

  private printWorkloadTable(distribution: MemberWorkload[]): void {
    console.log(chalk.bold('WORKLOAD DISTRIBUTION'));
    console.log(chalk.gray('─'.repeat(40)));

    const table = new Table({
      head: [
        chalk.white('Member'),
        chalk.white('Active'),
        chalk.white('Blocked'),
        chalk.white('Total'),
        chalk.white('Status'),
      ],
      colWidths: [25, 10, 10, 10, 10],
      style: { head: [], border: [] },
    });

    for (const workload of distribution) {
      const statusIcon = workload.status === 'ok' ? chalk.green('[OK]') :
                         workload.status === 'warning' ? chalk.yellow('[~]') :
                         chalk.red('[!]');

      table.push([
        workload.member.name,
        workload.active.toString(),
        workload.blocked > 0 ? chalk.red(workload.blocked.toString()) : '0',
        chalk.bold(workload.total.toString()),
        statusIcon,
      ]);
    }

    console.log(table.toString());
    console.log('');
  }

  private printUnassignedItems(items: WorkItem[], detail: boolean = false): void {
    console.log(chalk.red.bold(`UNASSIGNED ITEMS (${items.length})`));
    console.log(chalk.gray('─'.repeat(40)));

    const displayItems = detail ? items : items.slice(0, 5);
    for (const wi of displayItems) {
      const type = wi.fields['System.WorkItemType'];
      const state = wi.fields['System.State'];
      const title = this.truncate(wi.fields['System.Title'], 45);

      console.log(chalk.gray(`#${wi.id} [${type}] ${title}  ${state}`));
    }

    if (!detail && items.length > 5) {
      console.log(chalk.gray(`... and ${items.length - 5} more`));
    }
    console.log('');
  }

  private printActivitySummary(activity: { last24h: any; last7d: any }): void {
    console.log(chalk.bold('RECENT ACTIVITY'));
    console.log(chalk.gray('─'.repeat(40)));

    const { last24h, last7d } = activity;
    console.log(`Last 24h: ${last24h.updated} updated, ${last24h.closed} closed, ${last24h.created} created`);
    console.log(`Last 7d:  ${last7d.updated} updated, ${last7d.closed} closed, ${last7d.created} created`);
    console.log('');
  }

  private printFooter(): void {
    console.log(chalk.cyan('═'.repeat(72)));
    console.log(chalk.gray("Run 'ado team status --json' for machine-readable output"));
    console.log(chalk.gray("Run 'ado team status --detail' for full work item details"));
    console.log(chalk.cyan('═'.repeat(72)));
    console.log('');
  }

  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.substring(0, maxLen - 3) + '...';
  }

  private getDaysSinceUpdate(wi: WorkItem): number {
    const now = new Date();
    const changedDate = new Date(wi.fields['System.ChangedDate']);
    return Math.floor((now.getTime() - changedDate.getTime()) / (24 * 60 * 60 * 1000));
  }

  formatJsonReport(report: TeamHealthReport): string {
    return JSON.stringify(report, null, 2);
  }
}
