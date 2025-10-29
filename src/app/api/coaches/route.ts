import { NextRequest, NextResponse } from 'next/server';

import { createAuthenticatedSupabaseClient, propagateCookies } from '@/lib/api/auth-client';
import { ApiError } from '@/lib/api/errors';
import { ApiResponseHelper } from '@/lib/api/types';
import { rateLimit } from '@/lib/security/rate-limit';

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  title: string;
  bio: string;
  specialties: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  languages: string[];
  availability: {
    timezone: string;
    slots: Array<{
      day: string;
      times: string[];
    }>;
  };
  credentials: string[];
  approach: string;
  successStories: number;
}

// Apply rate limiting for coaches listing to prevent scraping
const rateLimitedHandler = rateLimit(200, 60000)( // 200 requests per minute
  async (request: NextRequest): Promise<NextResponse> => {
  const { client: supabase, response: authResponse } = createAuthenticatedSupabaseClient(
    request,
    new NextResponse()
  );

  try {
    // Verify authentication and get user
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      const errorResponse = ApiResponseHelper.unauthorized('Authentication required');
      return propagateCookies(authResponse, errorResponse);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const specialty = searchParams.get('specialty');
    const minRating = searchParams.get('minRating');
    const maxRate = searchParams.get('maxRate');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build query for coaches
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        avatar_url,
        timezone,
        created_at,
        coach_profiles (
          title,
          bio,
          specialties,
          experience_years,
          hourly_rate,
          location,
          languages,
          credentials,
          approach
        )
      `)
      .eq('role', 'coach')
      .eq('status', 'active')
      .limit(limit);

    // Apply search filter
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }

    const { data: coachData, error } = await query;

    if (error) {
      const errorResponse = ApiResponseHelper.error('FETCH_COACHES_FAILED', 'Failed to fetch coaches', 500);
      return propagateCookies(authResponse, errorResponse);
    }

    // Get additional statistics for each coach
    const coaches: Coach[] = await Promise.all(
      (coachData || []).map(async (coach) => {
        // Session count tracking (rating functionality will be implemented later)
        // Note: Currently unused but kept for future rating calculations
        await supabase
          .from('sessions')
          .select('status')
          .eq('coach_id', coach.id)
          .eq('status', 'completed');

        // Get real rating data from reflections of completed sessions
        const { data: ratingStats } = await supabase
          .from('reflections')
          .select('mood_rating, sessions!inner(coach_id, status)')
          .eq('sessions.coach_id', coach.id)
          .eq('sessions.status', 'completed')
          .not('mood_rating', 'is', null);

        let averageRating = 0;
        let reviewCount = 0;
        
        if (ratingStats && ratingStats.length > 0) {
          const ratings = ratingStats.map(s => s.mood_rating).filter(r => r !== null && r > 0) as number[];
          averageRating = ratings.length > 0 
            ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
            : 0;
          reviewCount = ratings.length;
        }

        // Get unique clients count (success stories)
        const { data: clientSessions } = await supabase
          .from('sessions')
          .select('client_id')
          .eq('coach_id', coach.id)
          .eq('status', 'completed');

        const uniqueClients = new Set(clientSessions?.map(s => s.client_id) || []);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profile = coach.coach_profiles?.[0] as any;

        return {
          id: coach.id,
          firstName: coach.first_name || '',
          lastName: coach.last_name || '',
          email: coach.email,
          phone: coach.phone || undefined,
          avatarUrl: coach.avatar_url || undefined,
          title: profile?.title || 'Professional Coach',
          bio: profile?.bio || 'Experienced coach dedicated to helping clients achieve their goals.',
          specialties: Array.isArray(profile?.specialties) ? profile.specialties : [],
          experience: typeof profile?.experience_years === 'number' ? profile.experience_years : 0,
          rating: averageRating,
          reviewCount: reviewCount,
          hourlyRate: typeof profile?.hourly_rate === 'number' ? profile.hourly_rate : 100,
          location: profile?.location || 'Online',
          languages: Array.isArray(profile?.languages) ? profile.languages : ['English'],
          availability: {
            timezone: coach.timezone || 'UTC',
            slots: [
              { day: 'Monday', times: ['09:00', '14:00', '16:00'] },
              { day: 'Tuesday', times: ['10:00', '15:00'] },
              { day: 'Wednesday', times: ['09:00', '13:00', '17:00'] },
            ], // This would come from availability table in real implementation
          },
          credentials: Array.isArray(profile?.credentials) ? profile.credentials : [],
          approach: profile?.approach || 'Client-centered coaching approach focused on practical solutions.',
          successStories: uniqueClients.size,
        };
      })
    );

    // Apply additional filters
    let filteredCoaches = coaches;

    if (specialty && specialty !== 'all') {
      filteredCoaches = filteredCoaches.filter(coach =>
        coach.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
      );
    }

    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      filteredCoaches = filteredCoaches.filter(coach => coach.rating >= minRatingNum);
    }

    if (maxRate) {
      const maxRateNum = parseFloat(maxRate);
      filteredCoaches = filteredCoaches.filter(coach => coach.hourlyRate <= maxRateNum);
    }

    const successResponse = ApiResponseHelper.success(filteredCoaches);
    return propagateCookies(authResponse, successResponse);

  } catch (error) {
    console.error('Coaches API error:', error);

    const errorResponse = error instanceof ApiError
      ? ApiResponseHelper.error(error.code, error.message, error.statusCode)
      : ApiResponseHelper.internalError('Failed to fetch coaches');

    return propagateCookies(authResponse, errorResponse);
  }
  }
);

export async function GET(request: NextRequest): Promise<Response> {
  return rateLimitedHandler(request);
}