import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardStats } from '../shared/types';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  description?: string;
  testId?: string;
}

export const StatsCard = React.memo(({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  description,
  testId 
}: StatsCardProps) => {
  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:scale-[1.02] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">
          {title}
        </CardTitle>
        <div className="flex-shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div 
          className="text-xl sm:text-2xl font-bold truncate" 
          data-testid={testId}
          title={React.useMemo(() => typeof value === 'string' ? value : value.toString(), [value])}
        >
          {value}
        </div>
        {trend && (
          <div className="flex items-center space-x-1">
            <span 
              className={React.useMemo(() => `text-xs font-medium ${
                trend.isPositive 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`, [trend.isPositive])}
              aria-label={React.useMemo(() => `${trend.isPositive ? 'Positive' : 'Negative'} trend: ${trend.value}`, [trend])}
            >
              {trend.value}
            </span>
            {description && (
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            )}
          </div>
        )}
        {!trend && description && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = 'StatsCard';