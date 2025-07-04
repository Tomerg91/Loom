import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createServerClient();
    
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        // Get the user to update last seen
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Update last seen timestamp
          await supabase
            .from('users')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', user.id);
        }
        
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch (error) {
      console.error('Auth callback error:', error);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}