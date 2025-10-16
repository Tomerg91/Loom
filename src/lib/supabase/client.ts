/**
 * Legacy compatibility wrapper for modules that still import Supabase helpers
 * from `@/lib/supabase/client`. All of the real implementation now lives in
 * `@/modules/platform/supabase/client`.
 */

export * from '@/modules/platform/supabase/client';
