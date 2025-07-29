// Refactored dashboard utilities using generic factories from main utils
import { 
  createMappingFunction, 
  formatters, 
  createUserProcessor 
} from '@/lib/utils';

// Use consolidated formatting utilities instead of duplicates
export const formatDate = formatters.date();
export const formatCurrency = formatters.currency();
export const formatPrice = formatters.currency(); // Same as currency formatting

// Create mapping functions using the generic factory
export const getStatusColor = createMappingFunction({
  completed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  not_started: 'bg-gray-100 text-gray-800',
  paused: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800'
}, 'bg-gray-100 text-gray-800');

export const getPriorityColor = createMappingFunction({
  high: 'border-red-200 bg-red-50',
  medium: 'border-yellow-200 bg-yellow-50',
  low: 'border-green-200 bg-green-50'
}, 'border-gray-200 bg-gray-50');

export const getRoleBadgeVariant = (role: string) => {
  switch (role) {
    case 'admin': return 'admin' as const;
    case 'coach': return 'coach' as const;
    case 'client': return 'client' as const;
    default: return 'outline' as const;
  }
};

export const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active': return 'success' as const;
    case 'completed': return 'success' as const;
    case 'inactive': return 'secondary' as const;
    case 'paused': return 'warning' as const;
    case 'pending': return 'outline' as const;
    case 'suspended': return 'destructive' as const;
    default: return 'outline' as const;
  }
};

// Use enhanced user processor instead of duplicate logic
const userProcessor = createUserProcessor();
export const getUserInitials = userProcessor.getInitials;
export const getUserDisplayName = userProcessor.getDisplayName;

export const DEFAULT_TIME_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

export const USER_ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'coach', label: 'Coach' },
  { value: 'client', label: 'Client' },
];

export const USER_STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
];