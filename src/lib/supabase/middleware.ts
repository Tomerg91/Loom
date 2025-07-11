import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

// Cache middleware clients to prevent multiple GoTrueClient instances
const middlewareClientCache = new Map<string, ReturnType<typeof createMiddlewareClient<Database>>>();

export async function createSupabaseMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Use request URL as cache key to avoid creating multiple clients for the same request
  const cacheKey = request.url;
  
  let supabase = middlewareClientCache.get(cacheKey);
  if (!supabase) {
    supabase = createMiddlewareClient<Database>({ req: request, res: response });
    middlewareClientCache.set(cacheKey, supabase);
    
    // Clear cache after a reasonable time to prevent memory leaks
    setTimeout(() => {
      middlewareClientCache.delete(cacheKey);
    }, 60000); // 1 minute
  }
  
  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession();
  
  return response;
}