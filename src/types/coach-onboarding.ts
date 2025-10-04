/**
 * Coach Onboarding Types
 * Type definitions for the coach onboarding API endpoint
 */

export interface AvailabilitySlot {
  dayOfWeek: number; // 0-6 (Sunday=0, Monday=1, etc.)
  startTime: string; // Format: "HH:MM" (24-hour)
  endTime: string; // Format: "HH:MM" (24-hour)
}

export interface CoachOnboardingProfile {
  bio: string; // 50-2000 characters
  experienceYears: number; // 0-100
  specializations: string[]; // 1-10 items
  profilePictureUrl?: string; // Optional, valid URL
}

export interface CoachOnboardingPricing {
  sessionRate: number; // Positive number, max 10000
  currency: string; // 3-letter code (e.g., "USD", "EUR")
  languages: string[]; // 1-10 items
  timezone: string; // IANA timezone (e.g., "America/New_York")
}

export interface CoachOnboardingAvailability {
  weeklySlots: AvailabilitySlot[]; // 1-50 slots
  defaultDuration: number; // 15-480 minutes
  bufferTime: number; // 0-120 minutes
}

export interface CoachOnboardingRequest {
  userId: string; // UUID
  profile: CoachOnboardingProfile;
  pricing: CoachOnboardingPricing;
  availability: CoachOnboardingAvailability;
}

export interface CoachProfile {
  id: string;
  coach_id: string;
  bio: string;
  experience_years: number;
  specializations: string[];
  session_rate: number;
  currency: string;
  languages: string[];
  timezone: string;
  default_session_duration: number;
  booking_buffer_time: number;
  profile_picture_url?: string;
  onboarding_completed_at: string;
  created_at: string;
  updated_at: string;
  users?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    timezone: string;
  };
}

export interface CoachOnboardingResponse {
  success: true;
  data: {
    coach: CoachProfile;
    onboardingCompleted: boolean;
    message: string;
  };
  message: string;
}

export interface CoachOnboardingErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: {
    issues?: Array<{
      path: string[];
      message: string;
      code: string;
    }>;
  };
}

// Day of week enum for better type safety
export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

// Helper type for day names
export type DayName = 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

// Map day of week number to name
export const DAY_NAMES: Record<DayOfWeek, DayName> = {
  [DayOfWeek.Sunday]: 'Sunday',
  [DayOfWeek.Monday]: 'Monday',
  [DayOfWeek.Tuesday]: 'Tuesday',
  [DayOfWeek.Wednesday]: 'Wednesday',
  [DayOfWeek.Thursday]: 'Thursday',
  [DayOfWeek.Friday]: 'Friday',
  [DayOfWeek.Saturday]: 'Saturday',
};

// Supported currencies (can be extended)
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'ILS'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

// Validation constants
export const VALIDATION_LIMITS = {
  bio: {
    min: 50,
    max: 2000,
  },
  experienceYears: {
    min: 0,
    max: 100,
  },
  specializations: {
    min: 1,
    max: 10,
    itemMaxLength: 100,
  },
  sessionRate: {
    min: 0.01,
    max: 10000,
  },
  languages: {
    min: 1,
    max: 10,
    itemMaxLength: 50,
  },
  weeklySlots: {
    min: 1,
    max: 50,
  },
  defaultDuration: {
    min: 15,
    max: 480,
  },
  bufferTime: {
    min: 0,
    max: 120,
  },
} as const;

// Common specializations for autocomplete
export const COMMON_SPECIALIZATIONS = [
  'Leadership',
  'Career Development',
  'Executive Coaching',
  'Life Coaching',
  'Business Coaching',
  'Health & Wellness',
  'Performance Coaching',
  'Relationship Coaching',
  'Financial Coaching',
  'Sports Coaching',
  'Mindfulness',
  'Communication Skills',
  'Time Management',
  'Stress Management',
  'Goal Setting',
] as const;

// Common languages
export const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Hebrew',
  'Russian',
] as const;

// Utility function to create a time string
export function createTimeString(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Utility function to parse time string
export function parseTimeString(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(':').map(Number);
  return { hours, minutes };
}

// Utility function to validate time slot
export function isValidTimeSlot(slot: AvailabilitySlot): boolean {
  const { hours: startHours, minutes: startMinutes } = parseTimeString(slot.startTime);
  const { hours: endHours, minutes: endMinutes } = parseTimeString(slot.endTime);

  const startMinutesTotal = startHours * 60 + startMinutes;
  const endMinutesTotal = endHours * 60 + endMinutes;

  return (
    slot.dayOfWeek >= 0 &&
    slot.dayOfWeek <= 6 &&
    startMinutesTotal < endMinutesTotal &&
    startHours >= 0 &&
    startHours <= 23 &&
    endHours >= 0 &&
    endHours <= 23 &&
    startMinutes >= 0 &&
    startMinutes <= 59 &&
    endMinutes >= 0 &&
    endMinutes <= 59
  );
}

// Utility function to format currency
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Utility function to get day name
export function getDayName(dayOfWeek: number): DayName {
  return DAY_NAMES[dayOfWeek as DayOfWeek] || 'Sunday';
}
