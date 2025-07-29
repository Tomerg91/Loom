// Refactored to use consolidated formatting utilities
import { createDateTimeFormatter } from '@/lib/utils';

// Use the enhanced date-time formatter instead of duplicate logic
export const formatDateTime = createDateTimeFormatter();