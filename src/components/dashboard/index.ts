// Dashboard components exports

// Cards
export { StatsCard } from './cards/stats-card';
export { ProgressCard } from './cards/progress-card';

// Charts
export { ChartPlaceholder } from './charts/chart-placeholder';

// Widgets
export { DashboardHeader } from './widgets/dashboard-header';
export { LoadingState } from './widgets/loading-state';
export { ErrorState } from './widgets/error-state';
export { FilterControls } from './widgets/filter-controls';
export { DataTable } from './widgets/data-table';
export { ProgressList } from './widgets/progress-list';
export { SessionList } from './widgets/session-list';
export { AchievementGrid } from './widgets/achievement-grid';

// User Management Widgets
export { UserManagementTable } from './widgets/user-management-table';
export { UserEditDialog } from './widgets/user-edit-dialog';
export { UserDeleteDialog } from './widgets/user-delete-dialog';

// Coach Insights Widgets
export { ClientProgressOverview } from './widgets/client-progress-overview';
export { GoalAnalysisWidget } from './widgets/goal-analysis-widget';
export { FeedbackList } from './widgets/feedback-list';

// Booking Widgets
export { BookingStepIndicator } from './widgets/booking-step-indicator';
export { CoachSelectionGrid } from './widgets/coach-selection-grid';
export { TimeSlotCalendar } from './widgets/time-slot-calendar';
export { BookingSummary } from './widgets/booking-summary';
export { BookingConfirmation } from './widgets/booking-confirmation';

// Shared
export * from './shared/types';
export * from './shared/utils';
export * from './shared/hooks';