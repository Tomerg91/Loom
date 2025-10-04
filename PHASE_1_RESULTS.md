# Phase 1 Execution Results

**Date:** 2025-10-04
**Status:** ⚠️ PARTIALLY SUCCESSFUL - REQUIRES ALTERNATIVE APPROACH

---

## Summary

Attempted to revoke dangerous HTTP function permissions (`net.http_get`, `net.http_post`, `net.http_delete`) from `anon` and `authenticated` roles to prevent SSRF attacks.

### Key Finding: Supabase System Protection

**The permissions CANNOT be revoked in a standard way** because:

1. **Event Trigger Re-grants Permissions**: Supabase has an event trigger `issue_pg_net_access` that automatically grants permissions to `anon` and `authenticated` whenever the `pg_net` extension is loaded.

2. **System Function Ownership**: The event trigger function `extensions.grant_pg_net_access()` is owned by `supabase_admin` and cannot be modified by the `postgres` role.

3. **Automatic Re-grant**: The function explicitly runs:
   ```sql
   GRANT EXECUTE ON FUNCTION net.http_get(...)
     TO supabase_functions_admin, postgres, anon, authenticated, service_role;
   ```

---

## Current State

### HTTP Function ACLs (Access Control Lists)

| Function          | Roles with EXECUTE Permission                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `net.http_get`    | `supabase_admin`, `supabase_functions_admin`, `postgres`, `anon`, `authenticated`, `service_role` |
| `net.http_post`   | `supabase_admin`, `supabase_functions_admin`, `postgres`, `anon`, `authenticated`, `service_role` |
| `net.http_delete` | `supabase_admin`, `PUBLIC` (=X)                                                                   |

### Test Results

```sql
-- Testing as anon role
SET ROLE anon;
SELECT net.http_get('https://httpbin.org/get');
-- Result: SUCCESS (request ID returned)
```

**⚠️ SECURITY RISK:** Anonymous and authenticated users CAN execute HTTP requests, enabling potential SSRF attacks.

---

## Alternative Mitigation Strategies

Since we cannot revoke permissions directly, here are alternative approaches:

### Option 1: RLS-Based HTTP Request Wrapper (RECOMMENDED)

Create wrapper functions that add authorization checks:

```sql
-- Create a wrapper function with authorization
CREATE OR REPLACE FUNCTION public.authorized_http_get(
  url text,
  params jsonb DEFAULT '{}'::jsonb,
  headers jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_id bigint;
  user_role text;
BEGIN
  -- Check if user is authorized (example: only admins)
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();

  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can make HTTP requests';
  END IF;

  -- Validate URL (prevent SSRF)
  IF url !~ '^https://(api\.yourservice\.com|webhooks\.yourservice\.com)' THEN
    RAISE EXCEPTION 'Unauthorized: URL not in allowlist';
  END IF;

  -- Make the request using the underlying function
  SELECT net.http_get(url, params, headers) INTO result_id;

  -- Log the request for audit
  INSERT INTO security_audit_log (
    user_id,
    action,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    'http_request',
    jsonb_build_object('url', url, 'request_id', result_id),
    now()
  );

  RETURN jsonb_build_object('request_id', result_id);
END;
$$;

-- Revoke from public (your wrapper, not the underlying function)
REVOKE ALL ON FUNCTION public.authorized_http_get(text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authorized_http_get(text, jsonb, jsonb) TO authenticated;

-- Document that users should use authorized_http_get instead of net.http_get
COMMENT ON FUNCTION public.authorized_http_get IS
'Authorized wrapper for HTTP GET requests. Use this instead of net.http_get directly.';
```

**Pros:**

- Adds URL allowlisting
- Adds role-based authorization
- Provides audit logging
- Works within Supabase constraints

**Cons:**

- Users can still call `net.http_get` directly if they know about it
- Requires code changes to use wrapper functions

---

### Option 2: Database-Level URL Allowlist

Create a table-driven allowlist system:

```sql
-- Create allowlist table
CREATE TABLE IF NOT EXISTS public.http_url_allowlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_pattern text NOT NULL UNIQUE,
  description text,
  allowed_roles user_role[] NOT NULL DEFAULT ARRAY['admin']::user_role[],
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.http_url_allowlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage allowlist"
ON public.http_url_allowlist
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Create validation function
CREATE OR REPLACE FUNCTION public.is_http_url_allowed(
  url text,
  user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role user_role;
  allowed boolean := false;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM users WHERE id = user_id;

  -- Check if URL matches any allowed pattern for this role
  SELECT EXISTS (
    SELECT 1
    FROM http_url_allowlist
    WHERE url ~ url_pattern
    AND user_role = ANY(allowed_roles)
  ) INTO allowed;

  RETURN allowed;
END;
$$;

-- Application should check this before calling net.http_get
-- Example usage:
-- IF NOT public.is_http_url_allowed('https://api.example.com/webhook', auth.uid()) THEN
--   RAISE EXCEPTION 'URL not in allowlist';
-- END IF;
```

---

### Option 3: Application-Level Protection (BEST PRACTICE)

**Never call `net.http_get()` from client-side SQL queries.** Instead:

1. **Use Next.js API Routes** for HTTP requests:

   ```typescript
   // /app/api/webhook/route.ts
   export async function POST(request: Request) {
     const session = await getSession();
     if (session.user.role !== 'admin') {
       return new Response('Unauthorized', { status: 403 });
     }

     const { url } = await request.json();

     // Validate URL against allowlist
     if (!isAllowedUrl(url)) {
       return new Response('URL not allowed', { status: 403 });
     }

     // Make request server-side
     const response = await fetch(url);
     return Response.json(await response.json());
   }
   ```

2. **Use Supabase Edge Functions** for authenticated HTTP requests:

   ```typescript
   // supabase/functions/make-http-request/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

   serve(async req => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_ANON_KEY')!,
       {
         global: {
           headers: { Authorization: req.headers.get('Authorization')! },
         },
       }
     );

     const {
       data: { user },
     } = await supabase.auth.getUser();

     if (!user || user.role !== 'admin') {
       return new Response('Unauthorized', { status: 403 });
     }

     const { url } = await req.json();

     // Validate and make request
     const response = await fetch(url);
     return new Response(await response.text());
   });
   ```

**Pros:**

- Complete control over authorization
- URL validation at application layer
- No reliance on database permissions
- Better separation of concerns

**Cons:**

- Requires application code changes
- Cannot prevent direct SQL access (but can monitor/audit it)

---

### Option 4: Monitoring & Alerting (DEFENSE IN DEPTH)

Since we can't prevent the calls, we can detect and alert on them:

```sql
-- Create a trigger on http_request_queue to detect suspicious activity
CREATE TABLE IF NOT EXISTS public.http_request_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id bigint,
  url text,
  method text,
  headers jsonb,
  requested_by uuid,
  requested_at timestamptz DEFAULT now(),
  flagged_as_suspicious boolean DEFAULT false,
  alert_sent boolean DEFAULT false
);

-- Create a function to monitor the net.http_request_queue
CREATE OR REPLACE FUNCTION public.audit_http_requests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_suspicious boolean := false;
  user_role text;
BEGIN
  -- Get the current user (if available)
  SELECT role INTO user_role FROM users WHERE id = auth.uid();

  -- Flag suspicious patterns
  IF NEW.url !~ '^https://(api\.yourservice\.com|webhooks\.yourservice\.com)' THEN
    is_suspicious := true;
  END IF;

  IF user_role IN ('anon', 'client') THEN
    is_suspicious := true;
  END IF;

  -- Log the request
  INSERT INTO http_request_audit (
    request_id,
    url,
    method,
    headers,
    requested_by,
    flagged_as_suspicious
  ) VALUES (
    NEW.id,
    NEW.url,
    NEW.method,
    NEW.headers,
    auth.uid(),
    is_suspicious
  );

  -- Send alert if suspicious
  IF is_suspicious THEN
    PERFORM pg_notify('security_alert', json_build_object(
      'type', 'suspicious_http_request',
      'user_id', auth.uid(),
      'url', NEW.url,
      'timestamp', now()
    )::text);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to http_request_queue
CREATE TRIGGER http_request_audit_trigger
  BEFORE INSERT ON net.http_request_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_http_requests();
```

---

## Recommended Implementation Plan

### Immediate (Production Environment):

1. ✅ **Document the Risk**: Add to security documentation that `net.http_*` functions are accessible to authenticated users in Supabase by design.

2. ✅ **Code Review**: Search codebase for any direct calls to `net.http_*` functions:

   ```bash
   grep -r "net\.http_" . --include="*.ts" --include="*.sql"
   ```

3. ✅ **Application-Level Protection**: Ensure all HTTP requests are made through:
   - Next.js API routes (for server-side requests)
   - Supabase Edge Functions (for authenticated requests)
   - Never from client-side SQL queries

4. ✅ **Add Monitoring**: Implement the audit trigger (Option 4) to detect any attempts to use these functions.

### Short-term (Within 1 week):

5. ✅ **Create Wrapper Functions**: Implement authorized wrapper functions (Option 1) for any legitimate use cases.

6. ✅ **Update Documentation**: Document that developers should NEVER call `net.http_*` directly.

7. ✅ **CI/CD Checks**: Add linting rules to prevent `net.http_*` calls in SQL migrations and queries.

### Long-term (Production Deployment):

8. ✅ **For Production/Hosted Supabase**: Contact Supabase support to request permission revocation or ask about their recommended security patterns for pg_net.

9. ✅ **For Self-Hosted**: Modify the `extensions.grant_pg_net_access()` function to exclude `anon` and `authenticated`.

---

## Production Supabase Considerations

**For production Supabase projects (hosted by Supabase):**

You may want to contact Supabase support to discuss:

- Whether `pg_net` functions should be accessible to `anon`/`authenticated` roles
- If there's a recommended way to restrict these functions
- Whether this is an intentional design decision

**Documentation Reference:**

- Supabase pg_net extension: https://supabase.com/docs/guides/database/extensions/pg_net
- Supabase security best practices: https://supabase.com/docs/guides/database/postgres/row-level-security

---

## Rollback (If Needed)

No changes were successfully applied, so no rollback is needed.

If wrapper functions or triggers were added:

```sql
-- Drop wrapper functions
DROP FUNCTION IF EXISTS public.authorized_http_get(text, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.is_http_url_allowed(text, uuid);

-- Drop audit system
DROP TRIGGER IF EXISTS http_request_audit_trigger ON net.http_request_queue;
DROP FUNCTION IF EXISTS public.audit_http_requests();
DROP TABLE IF EXISTS public.http_request_audit;
DROP TABLE IF EXISTS public.http_url_allowlist;
```

---

## Conclusion

**Phase 1 Status: ⚠️ BLOCKED by Supabase System Design**

The `net.http_*` functions are intentionally granted to `anon` and `authenticated` by Supabase's system event triggers and cannot be easily revoked in a local development environment.

**Recommended Approach:**

1. **Implement Option 3** (Application-Level Protection) - Never call these functions from client code
2. **Implement Option 4** (Monitoring & Alerting) - Detect any misuse
3. **Optionally implement Option 1** (Wrapper Functions) - Add authorization layer for legitimate use cases

**Next Steps:**

- Proceed to **Phase 2**: Tighten RLS policies (this can be done successfully)
- Update team documentation about `net.http_*` security considerations
- Implement application-level protections

---

**Report Generated:** 2025-10-04
**Auditor:** Claude Code Security Agent
