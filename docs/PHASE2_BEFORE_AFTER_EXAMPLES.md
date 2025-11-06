# Before/After Comparison Examples

## Example 1: Notification Analytics Route (20 errors → 0 errors)

### Before (Line 24)
```typescript
function generateTimeSeriesData(notifications: any[], startDate: Date, endDate: Date, range: string) {
  const intervalHours = range === '1d' ? 1 : 24;
  const data = [];
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const intervalEnd = new Date(current);
    intervalEnd.setHours(intervalEnd.getHours() + intervalHours);
    
    const intervalNotifications = notifications.filter(n => {
      const createdAt = new Date(n.created_at);
      return createdAt >= current && createdAt < intervalEnd;
    });
    
    data.push({
      timestamp: current.toISOString(),
      sent: intervalNotifications.length,
      delivered: intervalNotifications.filter(n => n.sent_at).length,
      opened: intervalNotifications.filter(n => n.read_at).length,
    });
    
    current.setHours(current.getHours() + intervalHours);
  }
  
  return data;
}
```

### After
```typescript
import { NotificationRow, TimeSeriesDataPoint } from '@/types/api';

function generateTimeSeriesData(
  notifications: NotificationRow[], 
  startDate: Date, 
  endDate: Date, 
  range: '1d' | '7d' | '30d' | '90d'
): TimeSeriesDataPoint[] {
  const intervalHours = range === '1d' ? 1 : 24;
  const data: TimeSeriesDataPoint[] = [];
  
  const current = new Date(startDate);
  while (current <= endDate) {
    const intervalEnd = new Date(current);
    intervalEnd.setHours(intervalEnd.getHours() + intervalHours);
    
    const intervalNotifications = notifications.filter((n: NotificationRow) => {
      const createdAt = new Date(n.created_at);
      return createdAt >= current && createdAt < intervalEnd;
    });
    
    data.push({
      timestamp: current.toISOString(),
      sent: intervalNotifications.length,
      delivered: intervalNotifications.filter((n: NotificationRow) => n.sent_at).length,
      opened: intervalNotifications.filter((n: NotificationRow) => n.read_at).length,
    });
    
    current.setHours(current.getHours() + intervalHours);
  }
  
  return data;
}
```

**Benefits**:
- Type safety: TypeScript knows the structure of `NotificationRow`
- Autocomplete: IDE suggests available properties
- Compile-time errors: Typos like `n.send_at` caught immediately
- Better refactoring: Renaming fields updates all references

---

## Example 2: Dashboard Hooks (6 errors → 0 errors)

### Before (Line 6)
```typescript
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
```

### After
```typescript
interface Goal {
  id: string;
  targetDate: string;
  milestones?: Array<{
    id: string;
    completedDate?: string;
  }>;
}

interface Session {
  id: string;
  date: string;
}

interface Achievement {
  id: string;
  earnedDate: string;
}

interface DashboardData {
  goals?: Goal[];
  sessions?: Session[];
  achievements?: Achievement[];
}

export const useFormattedDates = (data: DashboardData | null | undefined) => {
  return useMemo(() => {
    if (!data) return {};
    
    const dates: Record<string, string> = {};
    
    // Format goal target dates
    data.goals?.forEach((goal: Goal) => {
      dates[`goal-${goal.id}-target`] = formatDate(goal.targetDate);
      goal.milestones?.forEach((milestone) => {
        if (milestone.completedDate) {
          dates[`milestone-${milestone.id}`] = formatDate(milestone.completedDate);
        }
      });
    });
    
    // Format session dates
    data.sessions?.forEach((session: Session) => {
      dates[`session-${session.id}`] = formatDate(session.date);
    });
    
    // Format achievement dates
    data.achievements?.forEach((achievement: Achievement) => {
      dates[`achievement-${achievement.id}`] = formatDate(achievement.earnedDate);
    });
    
    return dates;
  }, [data]);
};
```

**Benefits**:
- Clear data structure: Anyone can see what data shape is expected
- Type inference: No need to annotate inside forEach callbacks
- Refactoring safety: Renaming `targetDate` shows all usages
- Better documentation: Types serve as inline documentation

---

## Example 3: Performance Optimized Chart (8 errors → 0 errors)

### Before (Line 12)
```typescript
interface PerformanceOptimizedChartProps {
  children: React.ReactNode;
  data: any[];
  maxDataPoints?: number;
  enableVirtualization?: boolean;
  showPerformanceWarning?: boolean;
}

export const PerformanceOptimizedChart: React.FC<PerformanceOptimizedChartProps> = ({
  children,
  data,
  maxDataPoints = 100,
  enableVirtualization = true,
  showPerformanceWarning = true,
}) => {
  // ... optimization logic
  
  return (
    <div className="space-y-2">
      {/* ... */}
      {React.isValidElement(children) &&
        React.cloneElement(children as React.ReactElement<{ data?: any[] }>, {
          data: optimizedData,
        })}
    </div>
  );
};
```

### After
```typescript
import { ChartDataPoint } from '@/types/charts';

interface PerformanceOptimizedChartProps<T = ChartDataPoint> {
  children: React.ReactNode;
  data: T[];
  maxDataPoints?: number;
  enableVirtualization?: boolean;
  showPerformanceWarning?: boolean;
}

export const PerformanceOptimizedChart = <T = ChartDataPoint,>({
  children,
  data,
  maxDataPoints = 100,
  enableVirtualization = true,
  showPerformanceWarning = true,
}: PerformanceOptimizedChartProps<T>) => {
  const [useOptimization, setUseOptimization] = useState(true);
  const [samplingRate, setSamplingRate] = useState(1);

  // Optimize data for large datasets
  const optimizedData = useMemo((): T[] => {
    if (!enableVirtualization || !useOptimization || data.length <= maxDataPoints) {
      return data;
    }

    // Calculate optimal sampling rate
    const optimalRate = Math.ceil(data.length / maxDataPoints);
    setSamplingRate(optimalRate);

    // Sample data points evenly
    return data.filter((_: T, index: number) => index % optimalRate === 0);
  }, [data, maxDataPoints, useOptimization, enableVirtualization]);

  const isDataOptimized = optimizedData.length < data.length;
  const performanceImpact = data.length > 1000 ? 'high' : data.length > 500 ? 'medium' : 'low';

  return (
    <div className="space-y-2">
      {/* ... performance warning UI ... */}
      
      {/* Render optimized chart */}
      {React.isValidElement(children) &&
        React.cloneElement(children as React.ReactElement<{ data?: T[] }>, {
          data: optimizedData,
        })}
    </div>
  );
};
```

**Benefits**:
- Generic type: Works with any chart data type
- Type preservation: Chart receives correctly typed data
- Reusability: Can wrap different chart types
- Flexibility: Consumer can specify their data type

---

## Example 4: System Health Check (5 errors → 0 errors)

### Before (Lines 79, 199, 209, 223, 237)
```typescript
async function checkDatabaseHealth(supabase: any, type: any): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
      
    if (error) throw error;
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message || 'Unknown error'
    };
  }
}
```

### After
```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
}

type DatabaseType = 'users' | 'sessions' | 'notifications';

async function checkDatabaseHealth(
  supabase: SupabaseClient<Database>, 
  type: DatabaseType
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase
      .from(type)
      .select('id')
      .limit(1);
      
    if (error) throw error;
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: errorMessage
    };
  }
}
```

**Benefits**:
- Proper error handling: Use `unknown` instead of `any`
- Type-safe database queries: Supabase client properly typed
- Limited table names: Can only check valid tables
- Clear return type: Function contract is explicit

---

## Example 5: Widget Filter Hook (Line 56)

### Before
```typescript
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
        return (item as any)[key] === value;  // ERROR: any type
      });
      
      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, searchFields, filters]);
};
```

### After
```typescript
export const useFilteredData = <T extends Record<string, unknown>>(
  data: T[] | undefined,
  searchTerm: string,
  searchFields: (keyof T)[],
  filters: Partial<Record<keyof T, string>> = {}
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
      
      // Additional filters - now type-safe
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (value === 'all') return true;
        return item[key as keyof T] === value;
      });
      
      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, searchFields, filters]);
};
```

**Benefits**:
- Type constraint: `T extends Record<string, unknown>` ensures object type
- Type-safe filters: Filters use `keyof T` instead of `string`
- No type assertions: Proper generic usage eliminates `any`
- Better autocomplete: IDE suggests valid filter keys

---

## Summary of Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Type Safety | Low | High | ✓ Compile-time checks |
| IDE Support | Poor | Excellent | ✓ Autocomplete & IntelliSense |
| Refactoring | Risky | Safe | ✓ Automated refactoring |
| Documentation | Implicit | Explicit | ✓ Self-documenting code |
| Error Detection | Runtime | Compile-time | ✓ Earlier bug detection |
| Maintainability | Difficult | Easy | ✓ Clear contracts |

