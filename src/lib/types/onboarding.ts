/**
 * Coach Onboarding Data Types
 * Defines the structure of data collected during the coach onboarding process
 */

export type Specialization =
  | 'life_coaching'
  | 'career_coaching'
  | 'health_wellness'
  | 'business_coaching'
  | 'relationship_coaching'
  | 'executive_coaching'
  | 'spiritual_coaching'
  | 'performance_coaching'
  | 'mindfulness_coaching'
  | 'other';

export type Currency = 'USD' | 'EUR' | 'ILS' | 'GBP';

export type SpokenLanguage = 'en' | 'he' | 'es' | 'fr' | 'de' | 'ar' | 'ru' | 'pt';

export type SessionDuration = 30 | 45 | 60 | 90 | 120;

export type BufferTime = 0 | 15 | 30 | 60;

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeSlot {
  startTime: string; // Format: "HH:mm" (24-hour)
  endTime: string;   // Format: "HH:mm" (24-hour)
}

export interface DayAvailability {
  day: DayOfWeek;
  isAvailable: boolean;
  timeSlots: TimeSlot[];
}

/**
 * Step 1: Profile Information
 */
export interface ProfileStepData {
  bio: string;
  yearsOfExperience: number;
  specializations: Specialization[];
  profilePicture?: File | null;
  profilePictureUrl?: string | null;
}

/**
 * Step 2: Pricing and Languages
 */
export interface PricingStepData {
  sessionRate: number;
  currency: Currency;
  languages: SpokenLanguage[];
  timezone: string;
}

/**
 * Step 3: Availability Schedule
 */
export interface AvailabilityStepData {
  weeklyAvailability: DayAvailability[];
  defaultSessionDuration: SessionDuration;
  bookingBuffer: BufferTime;
}

/**
 * Step 4: Review and Terms
 */
export interface ReviewStepData {
  acceptedTerms: boolean;
}

/**
 * Complete Onboarding Data
 */
export interface CoachOnboardingData {
  profile: ProfileStepData;
  pricing: PricingStepData;
  availability: AvailabilityStepData;
  review: ReviewStepData;
}

/**
 * Onboarding Wizard Steps
 */
export type OnboardingStep = 'profile' | 'pricing' | 'availability' | 'review';

/**
 * Step validation status
 */
export interface StepValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * API Request/Response Types
 */
export interface OnboardingSubmitRequest {
  userId: string;
  onboardingData: CoachOnboardingData;
}

export interface OnboardingSubmitResponse {
  success: boolean;
  message: string;
  coachProfileId?: string;
  errors?: string[];
}

/**
 * Helper type for partial data during wizard flow
 */
export type PartialOnboardingData = {
  profile?: Partial<ProfileStepData>;
  pricing?: Partial<PricingStepData>;
  availability?: Partial<AvailabilityStepData>;
  review?: Partial<ReviewStepData>;
};
