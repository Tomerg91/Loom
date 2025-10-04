/**
 * Coach Onboarding API Client
 * Client-side helper functions for the coach onboarding API
 */

import type {
  CoachOnboardingRequest,
  CoachOnboardingResponse,
  CoachOnboardingErrorResponse,
  AvailabilitySlot,
} from '@/types/coach-onboarding';

/**
 * Submit coach onboarding data
 * @param data - Coach onboarding request data
 * @param accessToken - User's access token
 * @returns Promise with the response
 */
export async function submitCoachOnboarding(
  data: CoachOnboardingRequest,
  accessToken: string
): Promise<CoachOnboardingResponse> {
  const response = await fetch('/api/onboarding/coach', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error: CoachOnboardingErrorResponse = await response.json();
    throw new CoachOnboardingError(error.error, error.code, error.details);
  }

  return response.json();
}

/**
 * Custom error class for coach onboarding errors
 */
export class CoachOnboardingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: {
      issues?: Array<{
        path: string[];
        message: string;
        code: string;
      }>;
    }
  ) {
    super(message);
    this.name = 'CoachOnboardingError';
  }

  /**
   * Get formatted error messages for display
   */
  getFormattedErrors(): string[] {
    if (!this.details?.issues) {
      return [this.message];
    }

    return this.details.issues.map((issue) => {
      const field = issue.path.join('.');
      return `${field}: ${issue.message}`;
    });
  }

  /**
   * Get errors grouped by field
   */
  getErrorsByField(): Record<string, string[]> {
    if (!this.details?.issues) {
      return { _general: [this.message] };
    }

    const errorsByField: Record<string, string[]> = {};

    this.details.issues.forEach((issue) => {
      const field = issue.path.join('.');
      if (!errorsByField[field]) {
        errorsByField[field] = [];
      }
      errorsByField[field].push(issue.message);
    });

    return errorsByField;
  }
}

/**
 * Validate coach onboarding data on the client side
 * Provides immediate feedback before submitting to the server
 */
export function validateCoachOnboardingData(
  data: CoachOnboardingRequest
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate profile
  if (!data.profile.bio || data.profile.bio.length < 50) {
    errors.push('Bio must be at least 50 characters');
  }
  if (data.profile.bio && data.profile.bio.length > 2000) {
    errors.push('Bio must not exceed 2000 characters');
  }
  if (data.profile.experienceYears < 0 || data.profile.experienceYears > 100) {
    errors.push('Experience years must be between 0 and 100');
  }
  if (!data.profile.specializations || data.profile.specializations.length === 0) {
    errors.push('At least one specialization is required');
  }
  if (data.profile.specializations && data.profile.specializations.length > 10) {
    errors.push('Maximum 10 specializations allowed');
  }

  // Validate pricing
  if (data.pricing.sessionRate <= 0 || data.pricing.sessionRate > 10000) {
    errors.push('Session rate must be between 0 and 10000');
  }
  if (!data.pricing.currency || data.pricing.currency.length !== 3) {
    errors.push('Currency must be a 3-letter code');
  }
  if (!data.pricing.languages || data.pricing.languages.length === 0) {
    errors.push('At least one language is required');
  }
  if (!data.pricing.timezone) {
    errors.push('Timezone is required');
  }

  // Validate availability
  if (!data.availability.weeklySlots || data.availability.weeklySlots.length === 0) {
    errors.push('At least one availability slot is required');
  }
  if (data.availability.weeklySlots && data.availability.weeklySlots.length > 50) {
    errors.push('Maximum 50 availability slots allowed');
  }
  if (data.availability.defaultDuration < 15 || data.availability.defaultDuration > 480) {
    errors.push('Default duration must be between 15 and 480 minutes');
  }
  if (data.availability.bufferTime < 0 || data.availability.bufferTime > 120) {
    errors.push('Buffer time must be between 0 and 120 minutes');
  }

  // Validate each availability slot
  data.availability.weeklySlots?.forEach((slot, index) => {
    if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      errors.push(`Slot ${index + 1}: Day of week must be between 0 and 6`);
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(slot.startTime)) {
      errors.push(`Slot ${index + 1}: Invalid start time format (use HH:MM)`);
    }
    if (!timeRegex.test(slot.endTime)) {
      errors.push(`Slot ${index + 1}: Invalid end time format (use HH:MM)`);
    }

    if (slot.startTime && slot.endTime) {
      const [startHour, startMin] = slot.startTime.split(':').map(Number);
      const [endHour, endMin] = slot.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (startMinutes >= endMinutes) {
        errors.push(`Slot ${index + 1}: Start time must be before end time`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a sample availability slot
 * Useful for testing and form initialization
 */
export function createSampleAvailabilitySlot(
  dayOfWeek: number,
  startHour: number,
  endHour: number
): AvailabilitySlot {
  return {
    dayOfWeek,
    startTime: `${startHour.toString().padStart(2, '0')}:00`,
    endTime: `${endHour.toString().padStart(2, '0')}:00`,
  };
}

/**
 * Create sample onboarding data for testing
 */
export function createSampleOnboardingData(userId: string): CoachOnboardingRequest {
  return {
    userId,
    profile: {
      bio: 'Experienced leadership coach with over 10 years of experience helping executives and entrepreneurs achieve their goals. Specialized in career transitions, personal development, and performance optimization.',
      experienceYears: 10,
      specializations: ['Leadership', 'Career Development', 'Executive Coaching'],
      profilePictureUrl: '',
    },
    pricing: {
      sessionRate: 150,
      currency: 'USD',
      languages: ['English', 'Spanish'],
      timezone: 'America/New_York',
    },
    availability: {
      weeklySlots: [
        createSampleAvailabilitySlot(1, 9, 12), // Monday 9am-12pm
        createSampleAvailabilitySlot(1, 14, 17), // Monday 2pm-5pm
        createSampleAvailabilitySlot(3, 9, 17), // Wednesday 9am-5pm
        createSampleAvailabilitySlot(5, 10, 15), // Friday 10am-3pm
      ],
      defaultDuration: 60,
      bufferTime: 15,
    },
  };
}

/**
 * React hook for coach onboarding (example)
 * Can be used with React Query or similar state management
 */
export function useCoachOnboarding() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<CoachOnboardingError | null>(null);
  const [success, setSuccess] = useState(false);

  const submitOnboarding = async (
    data: CoachOnboardingRequest,
    accessToken: string
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await submitCoachOnboarding(data, accessToken);
      setSuccess(true);
      return result;
    } catch (err) {
      if (err instanceof CoachOnboardingError) {
        setError(err);
      } else {
        setError(
          new CoachOnboardingError(
            'An unexpected error occurred',
            'UNKNOWN_ERROR'
          )
        );
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    success,
    submitOnboarding,
  };
}

// Note: Import useState from React when using the hook
import { useState } from 'react';
