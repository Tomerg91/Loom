/**
 * Legacy compatibility wrapper for modules that still import Supabase helpers
 * from `@/lib/supabase/server`. All logic now lives in
 * `@/modules/platform/supabase/server` under the platform module structure.
 */

export * from '@/modules/platform/supabase/server';
