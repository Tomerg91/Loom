# Supabase Platform Clients

This document explains how to interact with Supabase within the Loom
application now that the client factories live under
`src/modules/platform/supabase`.

## Browser Usage

- Import from `@/modules/platform/supabase/client`.
- Call `createClient()` when you need an explicit instance.
- Prefer importing the named `supabase` singleton in React hooks and
  services that expect the legacy behaviour.
- All browser factories validate environment variables at runtime. If
  you see validation errors, update `.env.local` or your deployment
  provider with the real Supabase project URL and anon key.

```ts
import { createClient, supabase } from '@/modules/platform/supabase/client';

const sb = createClient();
const { data } = await sb.from('users').select('*');
```

## Server Usage

- Import from `@/modules/platform/supabase/server`.
- Use `createServerClient()` for server utilities without request
  context.
- Use `createServerClientWithRequest(request, response)` inside
  middleware or edge handlers so cookie rotation continues working.
- Use `createClient()` in Next.js route handlers or server components to
  automatically integrate with the `cookies()` helper when available.
- Only call `createAdminClient()` in trusted server code. The helper
  ensures the service role key is never bundled into client builds.

```ts
import { createServerClientWithRequest } from '@/modules/platform/supabase/server';

export async function GET(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClientWithRequest(request, response);
  const { data } = await supabase.from('users').select('*');
  return NextResponse.json({ data });
}
```

## Migration Guidance

Existing imports from `@/lib/supabase/*` still function because those
files now re-export the new factories. New modules should reference the
platform locations directly so future refactors can trim the legacy
compatibility layer.
