// Minimal Prisma client module stub for local type-checking in CI environments
// where `@prisma/client` has not yet been generated. The real package will merge
// with these declarations once `npm install` / `prisma generate` have run.
declare module '@prisma/client' {
  export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
  }

  export enum TaskStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    OVERDUE = 'OVERDUE',
  }

  export enum NotificationJobType {
    ASSIGNMENT_CREATED = 'ASSIGNMENT_CREATED',
    UPCOMING_DUE = 'UPCOMING_DUE',
    OVERDUE = 'OVERDUE',
    RECURRING_PROMPT = 'RECURRING_PROMPT',
  }

  export enum NotificationJobStatus {
    PENDING = 'PENDING',
    SCHEDULED = 'SCHEDULED',
    SENT = 'SENT',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED',
  }

  export namespace Prisma {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    interface JsonObject {
      [key: string]: JsonValue;
    }
    type JsonArray = JsonValue[];
  }

  export class PrismaClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    taskCategory: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    task: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    taskInstance: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exportLog: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction<T>(promises: Promise<T>[]): Promise<T[]>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $transaction<T>(fn: (client: PrismaClient) => Promise<T>): Promise<T>;
    $disconnect(): Promise<void>;
  }
}
