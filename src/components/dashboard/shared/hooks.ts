// Custom hooks for dashboard components
import { useMemo } from 'react';
import { formatDate } from './utils';

export const useFormattedDates = (data: any) => {
  return useMemo(() => {
    if (!data) return {};
    
    const dates: Record<string, string> = {};
    
    // Format goal target dates
    data.goals?.forEach((goal: any) => {
      dates[`goal-${goal.id}-target`] = formatDate(goal.targetDate);
      goal.milestones?.forEach((milestone: any) => {
        if (milestone.completedDate) {
          dates[`milestone-${milestone.id}`] = formatDate(milestone.completedDate);
        }
      });
    });
    
    // Format session dates
    data.sessions?.forEach((session: any) => {
      dates[`session-${session.id}`] = formatDate(session.date);
    });
    
    // Format achievement dates
    data.achievements?.forEach((achievement: any) => {
      dates[`achievement-${achievement.id}`] = formatDate(achievement.earnedDate);
    });
    
    return dates;
  }, [data]);
};

export const useFilteredData = <T>(
  data: T[] | undefined,
  searchTerm: string,
  searchFields: (keyof T)[],
  filters: Record<string, string> = {}
) => {
  return useMemo(() => {
    if (!data) return [];
    
    return data.filter((item: T) => {
      // Search term filtering
      const matchesSearch = searchTerm === '' || searchFields.some(field => {
        const value = item[field];
        return typeof value === 'string' && 
          value.toLowerCase().includes(searchTerm.toLowerCase());
      });
      
      // Additional filters
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (value === 'all') return true;
        return (item as any)[key] === value;
      });
      
      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, searchFields, filters]);
};