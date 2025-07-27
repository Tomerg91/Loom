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
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {showTimeRange && timeRange && onTimeRangeChange && (
          <Select value={timeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
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
        {showRefresh && onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        )}
        {showExport && onExport && (
          <Button variant="outline" onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}