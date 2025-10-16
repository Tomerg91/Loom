export type ClientEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_APP_URL?: string;
};

export type ServerEnv = ClientEnv & {
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DATABASE_URL?: string;
  SENTRY_DSN?: string;
  TASK_ATTACHMENTS_BUCKET?: string;
};

export const clientEnv: ClientEnv;
export const serverEnv: ServerEnv;
export const env: ServerEnv;

export const PLACEHOLDER_SUPABASE_URL: string;
export const PLACEHOLDER_SUPABASE_ANON_KEY: string;

export const resolveSupabaseUrl: () => string;
export const resolveSupabaseAnonKey: () => string;
