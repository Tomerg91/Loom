import { memo, useMemo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProgressCardProps {
  title: string;
  value: number;
  maxValue?: number;
  description?: string;
  showPercentage?: boolean;
  color?: string;
}

export const ProgressCard = memo(({ 
  title, 
  value, 
  maxValue = 100, 
  description,
  showPercentage = true,
  color = 'bg-primary'
}: ProgressCardProps) => {
  const percentage = useMemo(() => Math.round((value / maxValue) * 100), [value, maxValue]);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">
              {showPercentage ? `${percentage}%` : `${value}/${maxValue}`}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className={`${color} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});