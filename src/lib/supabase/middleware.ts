import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/types/supabase';

export async function createSupabaseMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  const supabase = createMiddlewareClient<Database>({ req: request, res: response });
  
  // Refresh session if expired - required for Server Components
  await supabase.auth.getSession();
  
  return response;
}