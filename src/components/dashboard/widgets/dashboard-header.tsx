import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Download } from 'lucide-react';
import { TimeRangeOption } from '../shared/types';
import { DEFAULT_TIME_RANGES } from '../shared/utils';

interface DashboardHeaderProps {
  title: string;
  description: string;
  timeRange?: string;
  onTimeRangeChange?: (value: string) => void;
  timeRangeOptions?: TimeRangeOption[];
  onRefresh?: () => void;
  onExport?: () => void;
  showTimeRange?: boolean;
  showRefresh?: boolean;
  showExport?: boolean;
  children?: React.ReactNode;
}

export function DashboardHeader({
  title,
  description,
  timeRange,
  onTimeRangeChange,
  timeRangeOptions = DEFAULT_TIME_RANGES,
  onRefresh,
  onExport,
  showTimeRange = true,
  showRefresh = true,
  showExport = true,
  children
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
      </div>
      
      {/* Actions container */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Time range selector */}
        {showTimeRange && timeRange && onTimeRangeChange && (
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              {timeRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {/* Action buttons */}
        <div className="flex gap-2">
          {showRefresh && onRefresh && (
            <Button 
              variant="outline" 
              onClick={onRefresh}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <RefreshCw className="rtl:ml-2 rtl:mr-0 ltr:mr-2 ltr:ml-0 h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
          )}
          {showExport && onExport && (
            <Button 
              variant="outline" 
              onClick={onExport}
              className="flex-1 sm:flex-none"
              size="sm"
            >
              <Download className="rtl:ml-2 rtl:mr-0 ltr:mr-2 ltr:ml-0 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Export</span>
            </Button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}