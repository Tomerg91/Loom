import { adminAnalyticsService } from '@/lib/database/admin-analytics';
import type { 
  AdminAnalyticsOverview,
  UserGrowthData, 
  SessionMetricsData, 
  CoachPerformanceData 
} from '@/lib/database/admin-analytics';

export type ExportFormat = 'json' | 'csv' | 'excel';

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
   */
  async exportData(
    startDate: Date, 
    endDate: Date, 
    format: ExportFormat = 'json'
  ): Promise<{ blob: Blob; filename: string }> {
    const data = await this.getExportData(startDate, endDate);
    
    switch (format) {
      case 'json':
        return this.exportAsJson(data);
      case 'csv':
        return this.exportAsCsv(data);
      case 'excel':
        return this.exportAsExcel(data);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get structured export data
   */
  private async getExportData(startDate: Date, endDate: Date): Promise<ExportData> {
    const [overview, userGrowth, sessionMetrics, coachPerformance] = await Promise.all([
      adminAnalyticsService.getOverview(startDate, endDate),
      adminAnalyticsService.getUserGrowth(startDate, endDate),
      adminAnalyticsService.getSessionMetrics(startDate, endDate),
      adminAnalyticsService.getCoachPerformance(startDate, endDate),
    ]);

    return {
      overview,
      userGrowth,
      sessionMetrics,
      coachPerformance,
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
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
    csvContent += 'ANALYTICS OVERVIEW\\n';
    csvContent += `Generated At,${data.generatedAt}\\n`;
    csvContent += `Date Range,${data.dateRange.start} to ${data.dateRange.end}\\n\\n`;
    
    csvContent += 'Metric,Value\\n';
    csvContent += `Total Users,${data.overview.totalUsers}\\n`;
    csvContent += `Active Users,${data.overview.activeUsers}\\n`;
    csvContent += `Total Sessions,${data.overview.totalSessions}\\n`;
    csvContent += `Completed Sessions,${data.overview.completedSessions}\\n`;
    csvContent += `Revenue,${data.overview.revenue}\\n`;
    csvContent += `Average Rating,${data.overview.averageRating}\\n`;
    csvContent += `Total Coaches,${data.overview.totalCoaches}\\n`;
    csvContent += `Total Clients,${data.overview.totalClients}\\n\\n`;

    // User Growth section
    csvContent += 'USER GROWTH DATA\\n';
    csvContent += 'Date,New Users,Active Users,Total Users\\n';
    data.userGrowth.forEach(row => {
      csvContent += `${row.date},${row.newUsers},${row.activeUsers},${row.totalUsers}\\n`;
    });
    csvContent += '\\n';

    // Session Metrics section
    csvContent += 'SESSION METRICS\\n';
    csvContent += 'Date,Total Sessions,Completed Sessions,Cancelled Sessions,Scheduled Sessions,Completion Rate\\n';
    data.sessionMetrics.forEach(row => {
      csvContent += `${row.date},${row.totalSessions},${row.completedSessions},${row.cancelledSessions},${row.scheduledSessions},${row.completionRate || 0}%\\n`;
    });
    csvContent += '\\n';

    // Coach Performance section
    csvContent += 'COACH PERFORMANCE\\n';
    csvContent += 'Coach Name,Total Sessions,Completed Sessions,Average Rating,Revenue,Active Clients,Completion Rate\\n';
    data.coachPerformance.forEach(row => {
      csvContent += `${row.coachName},${row.totalSessions},${row.completedSessions},${row.averageRating},${row.revenue},${row.activeClients},${row.completionRate}%\\n`;
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
    content += 'Analytics Overview\\t\\t\\t\\n';
    content += `Generated At\\t${data.generatedAt}\\t\\t\\n`;
    content += `Date Range\\t${data.dateRange.start} to ${data.dateRange.end}\\t\\t\\n`;
    content += '\\n';
    
    content += 'Metric\\tValue\\t\\t\\n';
    content += `Total Users\\t${data.overview.totalUsers}\\t\\t\\n`;
    content += `Active Users\\t${data.overview.activeUsers}\\t\\t\\n`;
    content += `Total Sessions\\t${data.overview.totalSessions}\\t\\t\\n`;
    content += `Completed Sessions\\t${data.overview.completedSessions}\\t\\t\\n`;
    content += `Revenue\\t${data.overview.revenue}\\t\\t\\n`;
    content += `Average Rating\\t${data.overview.averageRating}\\t\\t\\n`;
    content += '\\n\\n';

    // User Growth data
    content += 'User Growth Data\\t\\t\\t\\n';
    content += 'Date\\tNew Users\\tActive Users\\tTotal Users\\n';
    data.userGrowth.forEach(row => {
      content += `${row.date}\\t${row.newUsers}\\t${row.activeUsers}\\t${row.totalUsers}\\n`;
    });
    content += '\\n';

    // Session Metrics data  
    content += 'Session Metrics\\t\\t\\t\\t\\t\\n';
    content += 'Date\\tTotal Sessions\\tCompleted\\tCancelled\\tScheduled\\tCompletion Rate\\n';
    data.sessionMetrics.forEach(row => {
      content += `${row.date}\\t${row.totalSessions}\\t${row.completedSessions}\\t${row.cancelledSessions}\\t${row.scheduledSessions}\\t${row.completionRate || 0}%\\n`;
    });
    content += '\\n';

    // Coach Performance data
    content += 'Coach Performance\\t\\t\\t\\t\\t\\t\\n';
    content += 'Coach Name\\tTotal Sessions\\tCompleted\\tRating\\tRevenue\\tActive Clients\\tCompletion Rate\\n';
    data.coachPerformance.forEach(row => {
      content += `${row.coachName}\\t${row.totalSessions}\\t${row.completedSessions}\\t${row.averageRating}\\t${row.revenue}\\t${row.activeClients}\\t${row.completionRate}%\\n`;
    });

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const filename = `analytics-export-${this.getDateString()}.xls`;
    
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