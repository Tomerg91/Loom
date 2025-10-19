-- ============================================================================
-- SECURITY DEFINER Function Inventory
-- ============================================================================
-- This query identifies all SECURITY DEFINER functions that lack proper
-- SET search_path clauses, which can lead to privilege escalation vulnerabilities.
--
-- Generated: 2025-10-21
-- ============================================================================

SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 'HAS search_path ✓'
    ELSE 'MISSING search_path ✗'
  END AS search_path_status,
  CASE
    WHEN prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security_type,
  pg_get_functiondef(p.oid) AS full_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND prosecdef = true  -- Only SECURITY DEFINER functions
ORDER BY
  CASE
    WHEN pg_get_functiondef(p.oid) LIKE '%SET search_path%' THEN 1
    ELSE 0
  END,
  p.proname;

-- Summary statistics
SELECT
  COUNT(*) FILTER (WHERE prosecdef = true) AS total_security_definer,
  COUNT(*) FILTER (WHERE prosecdef = true AND pg_get_functiondef(p.oid) LIKE '%SET search_path%') AS has_search_path,
  COUNT(*) FILTER (WHERE prosecdef = true AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%') AS missing_search_path,
  ROUND(100.0 * COUNT(*) FILTER (WHERE prosecdef = true AND pg_get_functiondef(p.oid) LIKE '%SET search_path%') /
    NULLIF(COUNT(*) FILTER (WHERE prosecdef = true), 0), 2) AS percent_secure
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';
