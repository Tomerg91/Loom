/**
 * Runtime stub for `@prisma/client` used during Vitest runs in environments
 * where the generated Prisma client package is not available. The enums mirror
 * the declarations provided in `types/prisma-client.d.ts` so application code
 * can safely import them without bundler resolution errors.
 */
export const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
} as const;

export const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
} as const;

export const NotificationJobType = {
  ASSIGNMENT_CREATED: 'ASSIGNMENT_CREATED',
  UPCOMING_DUE: 'UPCOMING_DUE',
  OVERDUE: 'OVERDUE',
  RECURRING_PROMPT: 'RECURRING_PROMPT',
} as const;

export const NotificationJobStatus = {
  PENDING: 'PENDING',
  SCHEDULED: 'SCHEDULED',
  SENT: 'SENT',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

// Minimal Prisma namespace placeholder used for JSON value typing.
export const Prisma = {
  JsonNullValue: null,
};

 
export class PrismaClient {
  $transaction(): Promise<never> {
    return Promise.reject(
      new Error('PrismaClient stub should not be executed in tests.')
    );
  }

  $disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

export default PrismaClient;
