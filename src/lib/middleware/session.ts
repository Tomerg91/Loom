import { NextRequest, NextResponse } from 'next/server';

import { createServerClientWithRequest } from '@/lib/supabase/server';

export async function refreshSessionOnResponse(request: NextRequest, response: NextResponse) {
  try {
    const supabase = createServerClientWithRequest(request, response);
    await supabase.auth.getSession();
  } catch (error) {
    console.warn('Failed to refresh Supabase session in middleware:', error);
  }
  return response;
}
