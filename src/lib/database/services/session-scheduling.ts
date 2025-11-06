import { BaseSessionService } from './base-session';
import { logger } from '@/lib/logger';

/**
 * Session scheduling and availability service
 * Handles time slot availability, calendar operations, and scheduling logic
 */
export class SessionSchedulingService extends BaseSessionService {

  /**
   * Check if time slot is available for a coach
   */
  async isTimeSlotAvailable(
    coachId: string, 
    startTime: Date, 
    durationMinutes = 60
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('is_time_slot_available', {
        coach_id: coachId,
        start_time: startTime.toISOString(),
        duration_minutes: durationMinutes,
      });

    if (error) {
      this.logError('checking time slot availability', error);
      return false;
    }

    return data;
  }

  /**
   * Get available time slots for a coach on a specific date
   */
  async getAvailableTimeSlots(
    coachId: string, 
    date: Date, 
    slotDuration = 60
  ): Promise<{ startTime: string; endTime: string; isAvailable: boolean }[]> {
    const { data, error } = await this.supabase
      .rpc('get_available_time_slots', {
        coach_id: coachId,
        target_date: date.toISOString().split('T')[0], // Convert to date string
        slot_duration: slotDuration,
      });

    if (error) {
      this.logError('fetching available time slots', error);
      return [];
    }

    return data.map((slot: unknown) => ({
      startTime: (slot as { start_time: string }).start_time,
      endTime: (slot as { end_time: string }).end_time,
      isAvailable: (slot as { is_available: boolean }).is_available,
    }));
  }

  /**
   * Get sessions in a date range for scheduling conflict detection
   */
  async getSessionsInDateRange(
    coachId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ id: string; scheduledAt: string; duration: number }[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select('id, scheduled_at, duration_minutes')
      .eq('coach_id', coachId)
      .gte('scheduled_at', startDate.toISOString())
      .lte('scheduled_at', endDate.toISOString())
      .in('status', ['scheduled', 'in_progress']);

    if (error) {
      this.logError('fetching sessions in date range', error);
      return [];
    }

    return data.map(session => ({
      id: session.id,
      scheduledAt: session.scheduled_at,
      duration: session.duration_minutes,
    }));
  }

  /**
   * Check for scheduling conflicts
   */
  async hasSchedulingConflict(
    coachId: string,
    proposedStartTime: Date,
    durationMinutes: number,
    excludeSessionId?: string
  ): Promise<boolean> {
    const proposedEndTime = new Date(proposedStartTime.getTime() + (durationMinutes * 60000));
    
    let query = this.supabase
      .from('sessions')
      .select('id, scheduled_at, duration_minutes')
      .eq('coach_id', coachId)
      .in('status', ['scheduled', 'in_progress'])
      .lte('scheduled_at', proposedEndTime.toISOString())
      .gte('scheduled_at', new Date(proposedStartTime.getTime() - (24 * 60 * 60000)).toISOString()); // Check 24 hours around

    if (excludeSessionId) {
      query = query.neq('id', excludeSessionId);
    }

    const { data, error } = await query;

    if (error) {
      this.logError('checking scheduling conflicts', error);
      return true; // Assume conflict on error for safety
    }

    // Check for time overlaps
    for (const session of data) {
      const sessionStart = new Date(session.scheduled_at);
      const sessionEnd = new Date(sessionStart.getTime() + (session.duration_minutes * 60000));

      // Check if times overlap
      const hasOverlap = (
        (proposedStartTime >= sessionStart && proposedStartTime < sessionEnd) ||
        (proposedEndTime > sessionStart && proposedEndTime <= sessionEnd) ||
        (proposedStartTime <= sessionStart && proposedEndTime >= sessionEnd)
      );

      if (hasOverlap) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find next available time slot for a coach
   */
  async findNextAvailableSlot(
    coachId: string,
    afterDate: Date,
    durationMinutes = 60
  ): Promise<{ startTime: Date; endTime: Date } | null> {
    // This is a simplified implementation - in practice you'd want to check coach availability patterns
    const searchStartDate = new Date(afterDate);
    const maxSearchDays = 30; // Search up to 30 days ahead

    for (let day = 0; day < maxSearchDays; day++) {
      const checkDate = new Date(searchStartDate);
      checkDate.setDate(checkDate.getDate() + day);
      
      // Check business hours (9 AM to 5 PM) in 30-minute increments
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const proposedStart = new Date(checkDate);
          proposedStart.setHours(hour, minute, 0, 0);
          
          // Skip if the time has already passed
          if (proposedStart <= new Date()) {
            continue;
          }

          const isAvailable = await this.isTimeSlotAvailable(coachId, proposedStart, durationMinutes);
          
          if (isAvailable) {
            const endTime = new Date(proposedStart.getTime() + (durationMinutes * 60000));
            return { startTime: proposedStart, endTime };
          }
        }
      }
    }

    return null;
  }

  /**
   * Reschedule a session to a new time
   */
  async rescheduleSession(
    sessionId: string,
    newStartTime: Date,
    newDurationMinutes?: number
  ): Promise<boolean> {
    // First get the current session to get coach info
    const { data: currentSession, error: fetchError } = await this.supabase
      .from('sessions')
      .select('coach_id, duration_minutes')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      this.logError('fetching session for rescheduling', fetchError);
      return false;
    }

    const duration = newDurationMinutes || currentSession.duration_minutes;

    // Check if new time slot is available
    const hasConflict = await this.hasSchedulingConflict(
      currentSession.coach_id,
      newStartTime,
      duration,
      sessionId // Exclude current session from conflict check
    );

    if (hasConflict) {
      logger.warn('Cannot reschedule: time slot has conflict');
      return false;
    }

    // Update the session
    const updateData: Record<string, unknown> = {
      scheduled_at: newStartTime.toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (newDurationMinutes) {
      updateData.duration_minutes = newDurationMinutes;
    }

    const { error: updateError } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      this.logError('rescheduling session', updateError);
      return false;
    }

    return true;
  }
}