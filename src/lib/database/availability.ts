import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface AvailabilitySlot {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

export class AvailabilityService {
  private supabase: ReturnType<typeof createServerClient> | ReturnType<typeof createClient>;

  constructor(isServer = true) {
    this.supabase = isServer ? createServerClient() : createClient();
  }

  /**
   * Get coach availability for a specific date
   */
  async getCoachAvailability(
    coachId: string, 
    date: string, 
    sessionDuration: number = 60
  ): Promise<TimeSlot[]> {
    try {
      // Get the day of week (0 = Sunday, 1 = Monday, etc.)
      const targetDate = new Date(date + 'T00:00:00');
      const dayOfWeek = targetDate.getDay();

      // Get coach's availability slots for this day of week
      const { data: availabilitySlots, error: slotsError } = await this.supabase
        .from('coach_availability')
        .select('start_time, end_time')
        .eq('coach_id', coachId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (slotsError) {
        console.error('Error fetching availability slots:', slotsError);
        return [];
      }

      if (!availabilitySlots || availabilitySlots.length === 0) {
        return [];
      }

      // Get existing sessions for this date
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;

      const { data: existingSessions, error: sessionsError } = await this.supabase
        .from('sessions')
        .select('scheduled_at, duration_minutes')
        .eq('coach_id', coachId)
        .gte('scheduled_at', startOfDay)
        .lte('scheduled_at', endOfDay)
        .in('status', ['scheduled', 'in_progress']);

      if (sessionsError) {
        console.error('Error fetching existing sessions:', sessionsError);
        return [];
      }

      // Generate time slots
      const timeSlots: TimeSlot[] = [];

      for (const slot of availabilitySlots) {
        const slotStart = this.parseTime(slot.start_time);
        const slotEnd = this.parseTime(slot.end_time);

        // Generate 15-minute intervals within this availability slot
        let currentTime = slotStart;
        
        while (currentTime + sessionDuration <= slotEnd) {
          const startTimeString = this.formatTime(currentTime);
          const endTimeString = this.formatTime(currentTime + sessionDuration);
          
          // Check if this time slot conflicts with existing sessions
          const isAvailable = !this.hasConflict(
            currentTime,
            currentTime + sessionDuration,
            existingSessions || []
          );

          timeSlots.push({
            startTime: startTimeString,
            endTime: endTimeString,
            isAvailable,
          });

          // Move to next 15-minute slot
          currentTime += 15;
        }
      }

      return timeSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    } catch (error) {
      console.error('Error in getCoachAvailability:', error);
      return [];
    }
  }

  /**
   * Set coach availability
   */
  async setCoachAvailability(
    coachId: string,
    slots: AvailabilitySlot[]
  ): Promise<boolean> {
    try {
      // First, deactivate all existing slots
      const { error: deactivateError } = await this.supabase
        .from('coach_availability')
        .update({ is_available: false })
        .eq('coach_id', coachId);

      if (deactivateError) {
        console.error('Error deactivating existing slots:', deactivateError);
        return false;
      }

      // Insert new slots
      const availabilityRecords = slots.map(slot => ({
        coach_id: coachId,
        day_of_week: slot.dayOfWeek,
        start_time: slot.startTime,
        end_time: slot.endTime,
        is_available: true,
      }));

      const { error: insertError } = await this.supabase
        .from('coach_availability')
        .insert(availabilityRecords);

      if (insertError) {
        console.error('Error inserting availability slots:', insertError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in setCoachAvailability:', error);
      return false;
    }
  }

  /**
   * Get coach's availability schedule
   */
  async getCoachSchedule(coachId: string): Promise<AvailabilitySlot[]> {
    try {
      const { data, error } = await this.supabase
        .from('coach_availability')
        .select('day_of_week, start_time, end_time')
        .eq('coach_id', coachId)
        .eq('is_available', true)
        .order('day_of_week')
        .order('start_time');

      if (error) {
        console.error('Error fetching coach schedule:', error);
        return [];
      }

      return (data || []).map(slot => ({
        dayOfWeek: slot.day_of_week,
        startTime: slot.start_time,
        endTime: slot.end_time,
      }));
    } catch (error) {
      console.error('Error in getCoachSchedule:', error);
      return [];
    }
  }

  /**
   * Check if a coach is available at a specific time
   */
  async isCoachAvailable(
    coachId: string,
    dateTime: string,
    duration: number
  ): Promise<boolean> {
    try {
      // const date = dateTime.split('T')[0]; // Not used currently
      const time = dateTime.split('T')[1].substring(0, 5); // HH:mm
      
      const targetDate = new Date(dateTime);
      const dayOfWeek = targetDate.getDay();
      const timeMinutes = this.parseTime(time);

      // Check if coach has availability for this day/time
      const { data: availabilitySlots, error: slotsError } = await this.supabase
        .from('coach_availability')
        .select('start_time, end_time')
        .eq('coach_id', coachId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (slotsError || !availabilitySlots) {
        return false;
      }

      // Check if requested time falls within any availability slot
      const hasAvailableSlot = availabilitySlots.some(slot => {
        const slotStart = this.parseTime(slot.start_time);
        const slotEnd = this.parseTime(slot.end_time);
        return timeMinutes >= slotStart && timeMinutes + duration <= slotEnd;
      });

      if (!hasAvailableSlot) {
        return false;
      }

      // Check for conflicts with existing sessions
      const sessionStart = new Date(dateTime);
      const sessionEnd = new Date(sessionStart.getTime() + duration * 60000);

      const { data: existingSessions, error: sessionsError } = await this.supabase
        .from('sessions')
        .select('scheduled_at, duration_minutes')
        .eq('coach_id', coachId)
        .gte('scheduled_at', sessionStart.toISOString())
        .lte('scheduled_at', sessionEnd.toISOString())
        .in('status', ['scheduled', 'in_progress']);

      if (sessionsError) {
        return false;
      }

      return !existingSessions || existingSessions.length === 0;
    } catch (error) {
      console.error('Error in isCoachAvailable:', error);
      return false;
    }
  }

  /**
   * Parse time string (HH:mm) to minutes from midnight
   */
  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Format minutes from midnight to time string (HH:mm)
   */
  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Check if a time range conflicts with existing sessions
   */
  private hasConflict(
    startMinutes: number,
    endMinutes: number,
    existingSessions: Array<{ scheduled_at: string; duration_minutes: number }>
  ): boolean {
    return existingSessions.some(session => {
      const sessionTime = new Date(session.scheduled_at);
      const sessionStartMinutes = sessionTime.getHours() * 60 + sessionTime.getMinutes();
      const sessionEndMinutes = sessionStartMinutes + session.duration_minutes;

      // Check for overlap
      return !(endMinutes <= sessionStartMinutes || startMinutes >= sessionEndMinutes);
    });
  }
}

// Export individual functions for API usage
const availabilityService = new AvailabilityService(true);

export const getCoachAvailability = (coachId: string, date: string, duration?: number) => 
  availabilityService.getCoachAvailability(coachId, date, duration);

export const setCoachAvailability = (coachId: string, slots: AvailabilitySlot[]) => 
  availabilityService.setCoachAvailability(coachId, slots);

export const getCoachSchedule = (coachId: string) => 
  availabilityService.getCoachSchedule(coachId);

export const isCoachAvailable = (coachId: string, dateTime: string, duration: number) => 
  availabilityService.isCoachAvailable(coachId, dateTime, duration);