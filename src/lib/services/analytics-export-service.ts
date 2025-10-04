// Type-only imports from admin-analytics
// Note: We don't import the service itself since this is client-side
import type {
  AdminAnalyticsOverview,
  UserGrowthData,
  SessionMetricsData,
  CoachPerformanceData,
} from '@/lib/database/admin-analytics';

export type ExportFormat = 'json' | 'csv' | 'excel' | 'pdf';

export interface ExportData {
  overview: AdminAnalyticsOverview;
  userGrowth: UserGrowthData[];
  sessionMetrics: SessionMetricsData[];
  coachPerformance: CoachPerformanceData[];
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
}

class AnalyticsExportService {
  /**
   * Export analytics data in specified format
   * Note: Data should be fetched by the server/component and passed to this method
   */
  async exportData(
    data: ExportData,
    format: ExportFormat = 'json'
  ): Promise<{ blob: Blob; filename: string }> {
    switch (format) {
      case 'json':
        return this.exportAsJson(data);
      case 'csv':
        return this.exportAsCsv(data);
      case 'excel':
        return this.exportAsExcel(data);
      case 'pdf':
        return this.exportAsPdf(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export as JSON
   */
  private exportAsJson(data: ExportData): { blob: Blob; filename: string } {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `analytics-export-${this.getDateString()}.json`;

    return { blob, filename };
  }

  /**
   * Export as CSV (multiple sheets in one file)
   */
  private exportAsCsv(data: ExportData): { blob: Blob; filename: string } {
    let csvContent = '';

    // Overview section
    csvContent += 'ANALYTICS OVERVIEW\n';
    csvContent += `Generated At,${data.generatedAt}\n`;
    csvContent += `Date Range,${data.dateRange.start} to ${data.dateRange.end}\n\n`;

    csvContent += 'Metric,Value\n';
    csvContent += `Total Users,${data.overview.totalUsers}\n`;
    csvContent += `Active Users,${data.overview.activeUsers}\n`;
    csvContent += `Total Sessions,${data.overview.totalSessions}\n`;
    csvContent += `Completed Sessions,${data.overview.completedSessions}\n`;
    csvContent += `Revenue,${data.overview.revenue}\n`;
    csvContent += `Average Rating,${data.overview.averageRating}\n`;
    csvContent += `Total Coaches,${data.overview.totalCoaches}\n`;
    csvContent += `Total Clients,${data.overview.totalClients}\n\n`;

    // User Growth section
    csvContent += 'USER GROWTH DATA\n';
    csvContent += 'Date,New Users,Active Users,Total Users\n';
    data.userGrowth.forEach(row => {
      csvContent += `${row.date},${row.newUsers},${row.activeUsers},${row.totalUsers}\n`;
    });
    csvContent += '\n';

    // Session Metrics section
    csvContent += 'SESSION METRICS\n';
    csvContent +=
      'Date,Total Sessions,Completed Sessions,Cancelled Sessions,Scheduled Sessions,Completion Rate\n';
    data.sessionMetrics.forEach(row => {
      csvContent += `${row.date},${row.totalSessions},${row.completedSessions},${row.cancelledSessions},${row.scheduledSessions},${row.completionRate || 0}%\n`;
    });
    csvContent += '\n';

    // Coach Performance section
    csvContent += 'COACH PERFORMANCE\n';
    csvContent +=
      'Coach Name,Total Sessions,Completed Sessions,Average Rating,Revenue,Active Clients,Completion Rate\n';
    data.coachPerformance.forEach(row => {
      csvContent += `${row.coachName},${row.totalSessions},${row.completedSessions},${row.averageRating},${row.revenue},${row.activeClients},${row.completionRate}%\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = `analytics-export-${this.getDateString()}.csv`;

    return { blob, filename };
  }

  /**
   * Export as Excel (simplified - would need xlsx library for full Excel support)
   */
  private exportAsExcel(data: ExportData): { blob: Blob; filename: string } {
    // For now, create a tab-separated format that Excel can open
    // In production, you'd want to use a library like 'xlsx' or 'exceljs'

    let content = '';

    // Overview sheet
    content += 'Analytics Overview\t\t\t\n';
    content += `Generated At\t${data.generatedAt}\t\t\n`;
    content += `Date Range\t${data.dateRange.start} to ${data.dateRange.end}\t\t\n`;
    content += '\n';

    content += 'Metric\tValue\t\t\n';
    content += `Total Users\t${data.overview.totalUsers}\t\t\n`;
    content += `Active Users\t${data.overview.activeUsers}\t\t\n`;
    content += `Total Sessions\t${data.overview.totalSessions}\t\t\n`;
    content += `Completed Sessions\t${data.overview.completedSessions}\t\t\n`;
    content += `Revenue\t${data.overview.revenue}\t\t\n`;
    content += `Average Rating\t${data.overview.averageRating}\t\t\n`;
    content += '\n\n';

    // User Growth data
    content += 'User Growth Data\t\t\t\n';
    content += 'Date\tNew Users\tActive Users\tTotal Users\n';
    data.userGrowth.forEach(row => {
      content += `${row.date}\t${row.newUsers}\t${row.activeUsers}\t${row.totalUsers}\n`;
    });
    content += '\n';

    // Session Metrics data
    content += 'Session Metrics\t\t\t\t\t\n';
    content +=
      'Date\tTotal Sessions\tCompleted\tCancelled\tScheduled\tCompletion Rate\n';
    data.sessionMetrics.forEach(row => {
      content += `${row.date}\t${row.totalSessions}\t${row.completedSessions}\t${row.cancelledSessions}\t${row.scheduledSessions}\t${row.completionRate || 0}%\n`;
    });
    content += '\n';

    // Coach Performance data
    content += 'Coach Performance\t\t\t\t\t\t\n';
    content +=
      'Coach Name\tTotal Sessions\tCompleted\tRating\tRevenue\tActive Clients\tCompletion Rate\n';
    data.coachPerformance.forEach(row => {
      content += `${row.coachName}\t${row.totalSessions}\t${row.completedSessions}\t${row.averageRating}\t${row.revenue}\t${row.activeClients}\t${row.completionRate}%\n`;
    });

    const blob = new Blob([content], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    });
    const filename = `analytics-export-${this.getDateString()}.xls`;

    return { blob, filename };
  }

  /**
   * Export as PDF (simplified HTML to PDF approach)
   * For production use, consider using jsPDF or a proper PDF generation library
   */
  private exportAsPdf(data: ExportData): { blob: Blob; filename: string } {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    };

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US');
    };

    // Generate HTML content for PDF
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Analytics Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .header h1 { color: #2563eb; margin-bottom: 10px; }
        .metadata { color: #666; font-size: 14px; }
        .section { margin: 30px 0; }
        .section h2 { color: #1e40af; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
        .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #2563eb; }
        .metric-card h3 { margin: 0 0 5px 0; color: #1e40af; font-size: 14px; }
        .metric-card .value { font-size: 24px; font-weight: bold; color: #333; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f1f5f9; font-weight: 600; color: #1e40af; }
        tr:hover { background-color: #f8fafc; }
        .text-right { text-align: right; }
        .chart-placeholder { background: #f8fafc; padding: 40px; text-align: center; color: #666; border-radius: 8px; margin: 20px 0; }
        @media print {
          body { margin: 0; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Analytics Report</h1>
        <div class="metadata">
          <p>Generated: ${formatDate(data.generatedAt)}</p>
          <p>Date Range: ${formatDate(data.dateRange.start)} - ${formatDate(data.dateRange.end)}</p>
        </div>
      </div>

      <div class="section">
        <h2>System Overview</h2>
        <div class="overview-grid">
          <div class="metric-card">
            <h3>Total Users</h3>
            <div class="value">${data.overview.totalUsers.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <h3>Active Users</h3>
            <div class="value">${data.overview.activeUsers.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <h3>Total Sessions</h3>
            <div class="value">${data.overview.totalSessions.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <h3>Completed Sessions</h3>
            <div class="value">${data.overview.completedSessions.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <h3>Revenue</h3>
            <div class="value">${formatCurrency(data.overview.revenue)}</div>
          </div>
          <div class="metric-card">
            <h3>Average Rating</h3>
            <div class="value">${data.overview.averageRating.toFixed(1)}⭐</div>
          </div>
          <div class="metric-card">
            <h3>Total Coaches</h3>
            <div class="value">${data.overview.totalCoaches.toLocaleString()}</div>
          </div>
          <div class="metric-card">
            <h3>Total Clients</h3>
            <div class="value">${data.overview.totalClients.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>User Growth Trends</h2>
        <div class="chart-placeholder">
          User Growth Chart (${data.userGrowth.length} data points)
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th class="text-right">New Users</th>
              <th class="text-right">Active Users</th>
              <th class="text-right">Total Users</th>
            </tr>
          </thead>
          <tbody>
            ${data.userGrowth
              .slice(0, 10)
              .map(
                row => `
              <tr>
                <td>${formatDate(row.date)}</td>
                <td class="text-right">${row.newUsers.toLocaleString()}</td>
                <td class="text-right">${row.activeUsers.toLocaleString()}</td>
                <td class="text-right">${row.totalUsers.toLocaleString()}</td>
              </tr>
            `
              )
              .join('')}
            ${data.userGrowth.length > 10 ? `<tr><td colspan="4" style="text-align: center; color: #666;">... and ${data.userGrowth.length - 10} more rows</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Session Metrics</h2>
        <div class="chart-placeholder">
          Session Metrics Chart (${data.sessionMetrics.length} data points)
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th class="text-right">Total</th>
              <th class="text-right">Completed</th>
              <th class="text-right">Cancelled</th>
              <th class="text-right">Scheduled</th>
              <th class="text-right">Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            ${data.sessionMetrics
              .slice(0, 10)
              .map(
                row => `
              <tr>
                <td>${formatDate(row.date)}</td>
                <td class="text-right">${row.totalSessions.toLocaleString()}</td>
                <td class="text-right">${row.completedSessions.toLocaleString()}</td>
                <td class="text-right">${row.cancelledSessions.toLocaleString()}</td>
                <td class="text-right">${row.scheduledSessions.toLocaleString()}</td>
                <td class="text-right">${row.completionRate || 0}%</td>
              </tr>
            `
              )
              .join('')}
            ${data.sessionMetrics.length > 10 ? `<tr><td colspan="6" style="text-align: center; color: #666;">... and ${data.sessionMetrics.length - 10} more rows</td></tr>` : ''}
          </tbody>
        </table>
      </div>

      <div class="section">
        <h2>Coach Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Coach Name</th>
              <th class="text-right">Sessions</th>
              <th class="text-right">Completed</th>
              <th class="text-right">Rating</th>
              <th class="text-right">Revenue</th>
              <th class="text-right">Active Clients</th>
              <th class="text-right">Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            ${data.coachPerformance
              .map(
                row => `
              <tr>
                <td>${row.coachName}</td>
                <td class="text-right">${row.totalSessions.toLocaleString()}</td>
                <td class="text-right">${row.completedSessions.toLocaleString()}</td>
                <td class="text-right">${row.averageRating.toFixed(1)}⭐</td>
                <td class="text-right">${formatCurrency(row.revenue)}</td>
                <td class="text-right">${row.activeClients.toLocaleString()}</td>
                <td class="text-right">${row.completionRate}%</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const filename = `analytics-report-${this.getDateString()}.html`;

    return { blob, filename };
  }

  /**
   * Download file blob
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get formatted date string for filenames
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `${year}${month}${day}-${hours}${minutes}`;
  }
}

export const analyticsExportService = new AnalyticsExportService();
