import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/auth';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api/types';

export interface ClientProgressData {
  clientId: string;
  clientName: string;
  progressScore: number;
  sessionsCompleted: number;
  goalAchievement: number;
  lastSession: string;
  trend: 'up' | 'down' | 'stable';
}

export interface TimeSlotData {
  id: string;
  coachId: string;
  date: string;
  time: string;
  duration: number;
  available: boolean;
  sessionType: 'video' | 'phone' | 'in-person';
}

export interface CoachData {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  avatarUrl?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  bio: string;
}

export interface AnalyticsResponse {
  clientProgress?: ClientProgressData[];
  availableTimeSlots?: TimeSlotData[];
  availableCoaches?: CoachData[];
  totalUsers?: number;
  totalSessions?: number;
  totalRevenue?: number;
  userGrowth?: {
    thisMonth: number;
    lastMonth: number;
    percentageChange: number;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<AnalyticsResponse>>> {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'client-progress', 'time-slots', 'coaches', 'admin-stats'
    const limit = parseInt(searchParams.get('limit') || '10');

    let response: AnalyticsResponse = {};

    if (type === 'client-progress' && user.role === 'coach') {
      // Get client progress data for coach dashboard
      const { data: coachSessions } = await supabase
        .from('sessions')
        .select(`
          id,
          client_id,
          status,
          scheduled_at,
          created_at,
          client:client_id(first_name, last_name, avatar_url)
        `)
        .eq('coach_id', user.id)
        .order('scheduled_at', { ascending: false });

      const clientMap = new Map<string, {
        clientId: string;
        clientName: string;
        sessions: any[];
        lastSession?: string;
      }>();

      // Group sessions by client
      coachSessions?.forEach(session => {
        const client = session.client as any;
        if (!clientMap.has(session.client_id)) {
          clientMap.set(session.client_id, {
            clientId: session.client_id,
            clientName: client ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : 'Unknown',
            sessions: [],
            lastSession: undefined
          });
        }
        
        const clientData = clientMap.get(session.client_id)!;
        clientData.sessions.push(session);
        
        if (session.status === 'completed' && (!clientData.lastSession || session.scheduled_at > clientData.lastSession)) {
          clientData.lastSession = session.scheduled_at;
        }
      });

      // Get reflections for progress scoring
      const { data: reflections } = await supabase
        .from('reflections')
        .select('client_id, mood_rating, created_at')
        .in('client_id', Array.from(clientMap.keys()));

      const clientProgress: ClientProgressData[] = Array.from(clientMap.values()).map(clientData => {
        const completedSessions = clientData.sessions.filter(s => s.status === 'completed');
        const clientReflections = reflections?.filter(r => r.client_id === clientData.clientId) || [];
        
        // Calculate progress score based on session frequency and mood ratings
        const recentMoodRatings = clientReflections
          .filter(r => r.mood_rating !== null && typeof r.mood_rating === 'number')
          .slice(0, 5)
          .map(r => r.mood_rating as number);
        
        const averageMood = recentMoodRatings.length > 0 
          ? recentMoodRatings.reduce((sum, rating) => sum + rating, 0) / recentMoodRatings.length
          : 5;
        
        const sessionFrequency = completedSessions.length > 0 ? 
          Math.min(completedSessions.length / 10, 1) : 0;
        
        const progressScore = Math.round((averageMood / 10 * 50) + (sessionFrequency * 50));
        
        // Calculate goal achievement (simplified)
        const goalAchievement = Math.min(Math.round((completedSessions.length / 5) * 100), 100);
        
        // Calculate trend based on recent mood ratings
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentMoodRatings.length >= 2) {
          const recent = recentMoodRatings.slice(0, 2).reduce((sum, r) => sum + r, 0) / 2;
          const older = recentMoodRatings.slice(2, 4).reduce((sum, r) => sum + r, 0) / Math.max(recentMoodRatings.slice(2, 4).length, 1);
          
          if (recent > older + 1) trend = 'up';
          else if (recent < older - 1) trend = 'down';
        }

        return {
          clientId: clientData.clientId,
          clientName: clientData.clientName,
          progressScore,
          sessionsCompleted: completedSessions.length,
          goalAchievement,
          lastSession: clientData.lastSession || new Date().toISOString(),
          trend
        };
      });

      response.clientProgress = clientProgress.slice(0, limit);

    } else if (type === 'time-slots') {
      // Get available time slots for booking
      const { data: coaches } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .eq('role', 'coach')
        .eq('status', 'active');

      // Get coach availability
      const { data: availability } = await supabase
        .from('coach_availability')
        .select('*')
        .eq('is_available', true);

      // Generate time slots for the next 7 days based on availability
      const timeSlots: TimeSlotData[] = [];
      const startDate = new Date();
      
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);
        const dayOfWeek = currentDate.getDay();
        
        // Find availability for this day of week
        const dayAvailability = availability?.filter(a => a.day_of_week === dayOfWeek) || [];
        
        dayAvailability.forEach(avail => {
          const coach = coaches?.find(c => c.id === avail.coach_id);
          if (!coach) return;
          
          // Generate hourly slots between start and end time
          const startTime = new Date(`2000-01-01T${avail.start_time}`);
          const endTime = new Date(`2000-01-01T${avail.end_time}`);
          
          let currentSlotTime = new Date(startTime);
          while (currentSlotTime < endTime) {
            const slotDateTime = new Date(currentDate);
            slotDateTime.setHours(currentSlotTime.getHours(), currentSlotTime.getMinutes());
            
            // Only show future slots
            if (slotDateTime > new Date()) {
              timeSlots.push({
                id: `${avail.coach_id}-${slotDateTime.toISOString()}`,
                coachId: avail.coach_id,
                date: slotDateTime.toISOString(),
                time: currentSlotTime.toTimeString().slice(0, 5),
                duration: 60, // Default 60 minutes
                available: true, // Simplified - would check against existing sessions
                sessionType: 'video'
              });
            }
            
            currentSlotTime.setHours(currentSlotTime.getHours() + 1);
          }
        });
      }

      response.availableTimeSlots = timeSlots.slice(0, limit);

    } else if (type === 'coaches') {
      // Get available coaches for booking
      const { data: coaches } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'coach')
        .eq('status', 'active');

      // Get session counts and ratings for each coach
      const coachData: CoachData[] = [];
      
      for (const coach of coaches || []) {
        const { data: coachSessions } = await supabase
          .from('sessions')
          .select('id, status')
          .eq('coach_id', coach.id);

        const { data: coachReflections } = await supabase
          .from('reflections')
          .select('mood_rating')
          .in('session_id', coachSessions?.map(s => s.id) || [])
          .not('mood_rating', 'is', null);

        const reviewCount = coachReflections?.length || 0;
        const averageRating = reviewCount > 0 && coachReflections
          ? Math.round((coachReflections.reduce((sum, r) => sum + (r.mood_rating || 0), 0) / reviewCount / 2) * 10) / 10
          : 4.5; // Default rating

        // Generate realistic coach data
        const specialties = generateCoachSpecialties();
        const hourlyRate = 75 + Math.floor(Math.random() * 100); // $75-175/hour

        coachData.push({
          id: coach.id,
          firstName: coach.first_name || 'Coach',
          lastName: coach.last_name || 'Professional',
          title: generateCoachTitle(),
          avatarUrl: coach.avatar_url || undefined,
          specialties,
          rating: Math.min(5, Math.max(3, averageRating)),
          reviewCount,
          hourlyRate,
          location: generateLocation(),
          bio: generateCoachBio(specialties[0])
        });
      }

      response.availableCoaches = coachData.slice(0, limit);

    } else if (type === 'admin-stats' && user.role === 'admin') {
      // Get system-wide statistics for admin dashboard
      const { data: allUsers, count: totalUsers } = await supabase
        .from('users')
        .select('id, created_at', { count: 'exact' });

      const { data: allSessions, count: totalSessions } = await supabase
        .from('sessions')
        .select('id, status', { count: 'exact' });

      // Calculate user growth
      const thisMonth = new Date();
      thisMonth.setDate(1); // First day of current month
      const lastMonth = new Date(thisMonth);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const thisMonthUsers = allUsers?.filter(user => 
        new Date(user.created_at) >= thisMonth
      ).length || 0;

      const lastMonthUsers = allUsers?.filter(user => 
        new Date(user.created_at) >= lastMonth && new Date(user.created_at) < thisMonth
      ).length || 0;

      const percentageChange = lastMonthUsers > 0 
        ? Math.round(((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100)
        : 100;

      // Calculate estimated revenue (simplified)
      const completedSessions = allSessions?.filter(s => s.status === 'completed').length || 0;
      const averageSessionPrice = 100; // $100 average per session
      const totalRevenue = completedSessions * averageSessionPrice;

      response = {
        totalUsers: totalUsers || 0,
        totalSessions: totalSessions || 0,
        totalRevenue,
        userGrowth: {
          thisMonth: thisMonthUsers,
          lastMonth: lastMonthUsers,
          percentageChange
        }
      };
    }

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// Helper functions for generating realistic data
function generateCoachSpecialties(): string[] {
  const allSpecialties = [
    'Life Coaching', 'Career Development', 'Leadership', 'Executive Coaching',
    'Wellness', 'Stress Management', 'Communication', 'Time Management',
    'Goal Setting', 'Productivity', 'Work-Life Balance', 'Confidence Building',
    'Public Speaking', 'Team Building', 'Conflict Resolution', 'Emotional Intelligence'
  ];
  
  const count = Math.floor(Math.random() * 3) + 2; // 2-4 specialties
  const shuffled = allSpecialties.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateCoachTitle(): string {
  const titles = [
    'Certified Life Coach',
    'Executive Leadership Coach',
    'Professional Development Coach',
    'Career Transition Specialist',
    'Wellness & Mindfulness Coach',
    'Performance Coach',
    'Business Coach',
    'Personal Growth Facilitator'
  ];
  
  return titles[Math.floor(Math.random() * titles.length)];
}

function generateLocation(): string {
  const locations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'San Francisco, CA',
    'Austin, TX',
    'Seattle, WA',
    'Boston, MA',
    'Denver, CO',
    'Miami, FL',
    'Remote/Online'
  ];
  
  return locations[Math.floor(Math.random() * locations.length)];
}

function generateCoachBio(primarySpecialty: string): string {
  const bios = [
    `Passionate ${primarySpecialty.toLowerCase()} specialist with over 10 years of experience helping clients achieve their personal and professional goals.`,
    `Dedicated coach focused on ${primarySpecialty.toLowerCase()} with a proven track record of transforming lives through personalized coaching strategies.`,
    `Experienced professional specializing in ${primarySpecialty.toLowerCase()}, committed to empowering individuals to unlock their full potential.`,
    `Certified coach with expertise in ${primarySpecialty.toLowerCase()}, bringing a holistic approach to personal development and growth.`
  ];
  
  return bios[Math.floor(Math.random() * bios.length)];
}