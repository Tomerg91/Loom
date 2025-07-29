/**
 * Test data fixtures for E2E tests
 * Contains predefined test users, sessions, and other test data
 */

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'client' | 'coach' | 'admin';
  phone?: string;
  timezone?: string;
  language?: 'en' | 'he';
}

export interface TestSession {
  title: string;
  description: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduledAt: Date;
  coachEmail: string;
  clientEmail: string;
}

export interface TestAvailability {
  coachEmail: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  timezone: string;
}

export interface TestReflection {
  clientEmail: string;
  content: string;
  moodRating: number; // 1-10
  insights?: string;
  goalsForNextSession?: string;
}

export interface TestNote {
  coachEmail: string;
  clientEmail: string;
  title: string;
  content: string;
  privacyLevel: 'private' | 'shared_with_client';
  tags?: string[];
}

/**
 * Pre-defined test users with consistent credentials
 */
export const testUsers: TestUser[] = [
  {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
    role: 'client',
    phone: '+1-555-0101',
    timezone: 'America/New_York',
    language: 'en',
  },
  {
    email: 'coach@example.com',
    password: 'password123',
    firstName: 'Coach',
    lastName: 'Williams',
    role: 'coach',
    phone: '+1-555-0102',
    timezone: 'America/New_York',
    language: 'en',
  },
  {
    email: 'client@example.com',
    password: 'password123',
    firstName: 'Client',
    lastName: 'Johnson',
    role: 'client',
    phone: '+1-555-0103',
    timezone: 'America/Los_Angeles',
    language: 'en',
  },
  {
    email: 'admin@example.com',
    password: 'password123',
    firstName: 'Admin',
    lastName: 'Smith',
    role: 'admin',
    phone: '+1-555-0104',
    timezone: 'UTC',
    language: 'en',
  },
  {
    email: 'coach2@example.com',
    password: 'password123',
    firstName: 'Sarah',
    lastName: 'Davis',
    role: 'coach',
    phone: '+1-555-0105',
    timezone: 'Europe/London',
    language: 'en',
  },
  {
    email: 'client2@example.com',
    password: 'password123',
    firstName: 'Michael',
    lastName: 'Brown',
    role: 'client',
    phone: '+1-555-0106',
    timezone: 'Asia/Tokyo',
    language: 'en',
  },
];

/**
 * Coach availability data for testing scheduling
 */
export const testAvailability: TestAvailability[] = [
  // Coach Williams - Regular business hours
  {
    coachEmail: 'coach@example.com',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/New_York',
  },
  {
    coachEmail: 'coach@example.com',
    dayOfWeek: 2, // Tuesday
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/New_York',
  },
  {
    coachEmail: 'coach@example.com',
    dayOfWeek: 3, // Wednesday
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/New_York',
  },
  {
    coachEmail: 'coach@example.com',
    dayOfWeek: 4, // Thursday
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/New_York',
  },
  {
    coachEmail: 'coach@example.com',
    dayOfWeek: 5, // Friday
    startTime: '09:00',
    endTime: '15:00',
    timezone: 'America/New_York',
  },
  
  // Coach Davis - Different schedule
  {
    coachEmail: 'coach2@example.com',
    dayOfWeek: 1, // Monday
    startTime: '10:00',
    endTime: '18:00',
    timezone: 'Europe/London',
  },
  {
    coachEmail: 'coach2@example.com',
    dayOfWeek: 2, // Tuesday
    startTime: '10:00',
    endTime: '18:00',
    timezone: 'Europe/London',
  },
  {
    coachEmail: 'coach2@example.com',
    dayOfWeek: 4, // Thursday
    startTime: '12:00',
    endTime: '20:00',
    timezone: 'Europe/London',
  },
  {
    coachEmail: 'coach2@example.com',
    dayOfWeek: 5, // Friday
    startTime: '10:00',
    endTime: '16:00',
    timezone: 'Europe/London',
  },
];

/**
 * Test sessions for various scenarios
 */
export const testSessions: TestSession[] = [
  {
    title: 'Initial Consultation',
    description: 'First meeting to establish goals and expectations',
    duration_minutes: 60,
    status: 'completed',
    scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    coachEmail: 'coach@example.com',
    clientEmail: 'client@example.com',
  },
  {
    title: 'Progress Review',
    description: 'Review progress and adjust goals',
    duration_minutes: 45,
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    coachEmail: 'coach@example.com',
    clientEmail: 'client@example.com',
  },
  {
    title: 'Career Planning Session',
    description: 'Discuss career goals and development plan',
    duration_minutes: 90,
    status: 'scheduled',
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    coachEmail: 'coach2@example.com',
    clientEmail: 'client2@example.com',
  },
  {
    title: 'Quick Check-in',
    description: 'Brief status update and Q&A',
    duration_minutes: 30,
    status: 'completed',
    scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    coachEmail: 'coach@example.com',
    clientEmail: 'test@example.com',
  },
];

/**
 * Test reflections for client progress tracking
 */
export const testReflections: TestReflection[] = [
  {
    clientEmail: 'client@example.com',
    content: 'Had a great breakthrough today understanding my communication patterns. The role-playing exercise was particularly helpful.',
    moodRating: 8,
    insights: 'I tend to avoid difficult conversations, but practicing with my coach gave me confidence.',
    goalsForNextSession: 'Practice the new communication techniques with my team at work.',
  },
  {
    clientEmail: 'client@example.com',
    content: 'Feeling stuck on my career goals. Need to reassess what I really want.',
    moodRating: 5,
    insights: 'Maybe I need to be more honest about what motivates me.',
    goalsForNextSession: 'Explore my core values and how they align with my career path.',
  },
  {
    clientEmail: 'client2@example.com',
    content: 'Excellent session on time management. The Pomodoro technique is working well for me.',
    moodRating: 9,
    insights: 'Breaking tasks into smaller chunks makes them less overwhelming.',
    goalsForNextSession: 'Implement the time-blocking strategy we discussed.',
  },
  {
    clientEmail: 'test@example.com',
    content: 'Quick check-in went well. Making steady progress on my goals.',
    moodRating: 7,
    insights: 'Consistency is key to building new habits.',
  },
];

/**
 * Test coach notes for session documentation
 */
export const testNotes: TestNote[] = [
  {
    coachEmail: 'coach@example.com',
    clientEmail: 'client@example.com',
    title: 'Communication Patterns Observation',
    content: 'Client shows avoidance behavior when discussing workplace conflicts. Recommended assertiveness training exercises.',
    privacyLevel: 'private',
    tags: ['communication', 'conflict-resolution', 'assertiveness'],
  },
  {
    coachEmail: 'coach@example.com',
    clientEmail: 'client@example.com',
    title: 'Goal Setting Session Summary',
    content: 'Established SMART goals for Q1. Client committed to weekly progress check-ins.',
    privacyLevel: 'shared_with_client',
    tags: ['goal-setting', 'SMART-goals', 'progress-tracking'],
  },
  {
    coachEmail: 'coach2@example.com',
    clientEmail: 'client2@example.com',
    title: 'Career Development Plan',
    content: 'Outlined 5-year career progression. Focus on developing leadership skills and technical expertise.',
    privacyLevel: 'shared_with_client',
    tags: ['career-development', 'leadership', 'technical-skills'],
  },
  {
    coachEmail: 'coach@example.com',
    clientEmail: 'test@example.com',
    title: 'Quick Notes',
    content: 'Client is making good progress. Continue with current approach.',
    privacyLevel: 'private',
    tags: ['progress-update'],
  },
];

/**
 * Combined test fixtures for easy access
 */
export const testFixtures = {
  users: testUsers,
  sessions: testSessions,
  availability: testAvailability,
  reflections: testReflections,
  notes: testNotes,
};

/**
 * Helper function to get a specific test user by role
 */
export function getTestUserByRole(role: 'client' | 'coach' | 'admin'): TestUser | undefined {
  return testUsers.find(user => user.role === role);
}

/**
 * Helper function to get test user by email
 */
export function getTestUserByEmail(email: string): TestUser | undefined {
  return testUsers.find(user => user.email === email);
}

/**
 * Helper function to get all coaches
 */
export function getTestCoaches(): TestUser[] {
  return testUsers.filter(user => user.role === 'coach');
}

/**
 * Helper function to get all clients
 */
export function getTestClients(): TestUser[] {
  return testUsers.filter(user => user.role === 'client');
}

/**
 * Helper function to generate future date for testing
 */
export function getFutureDate(daysFromNow: number): Date {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
}

/**
 * Helper function to generate past date for testing
 */
export function getPastDate(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}