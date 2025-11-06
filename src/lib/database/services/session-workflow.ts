import type { SessionStatus } from '@/types';

import { BaseSessionService } from './base-session';
import { logger } from '@/lib/logger';

/**
 * Session workflow and status management service
 * Handles session lifecycle operations, status transitions, and workflow logic
 */
export class SessionWorkflowService extends BaseSessionService {

  /**
   * Update session status with validation
   */
  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<boolean> {
    // Validate status transition
    const isValidTransition = await this.validateStatusTransition(sessionId, status);
    if (!isValidTransition) {
      logger.warn(`Invalid status transition to ${status} for session ${sessionId}`);
      return false;
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add additional fields based on status
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    } else if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      this.logError('updating session status', error);
      return false;
    }

    return true;
  }

  /**
   * Cancel session with optional reason
   */
  async cancelSession(sessionId: string, reason?: string): Promise<boolean> {
    const updateData: Record<string, unknown> = {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      cancelled_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.cancellation_reason = reason;
    }

    const { error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      this.logError('cancelling session', error);
      return false;
    }

    return true;
  }

  /**
   * Complete session with notes
   */
  async completeSession(sessionId: string, notes?: string): Promise<boolean> {
    const updateData: Record<string, unknown> = {
      status: 'completed',
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      this.logError('completing session', error);
      return false;
    }

    return true;
  }

  /**
   * Start session (mark as in progress)
   */
  async startSession(sessionId: string): Promise<boolean> {
    const updateData = {
      status: 'in_progress' as SessionStatus,
      updated_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      this.logError('starting session', error);
      return false;
    }

    return true;
  }

  /**
   * Mark session as no-show
   */
  async markNoShow(sessionId: string, reason?: string): Promise<boolean> {
    const updateData: Record<string, unknown> = {
      status: 'no_show',
      updated_at: new Date().toISOString(),
      no_show_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.no_show_reason = reason;
    }

    const { error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (error) {
      this.logError('marking session as no-show', error);
      return false;
    }

    return true;
  }

  /**
   * Get sessions by status
   */
  async getSessionsByStatus(status: SessionStatus, limit = 50): Promise<{
    id: string;
    title: string;
    scheduledAt: string;
    coachName: string;
    clientName: string;
  }[]> {
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        id,
        title,
        scheduled_at,
        coach:users!sessions_coach_id_fkey(first_name, last_name),
        client:users!sessions_client_id_fkey(first_name, last_name)
      `)
      .eq('status', status)
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logError('fetching sessions by status', error);
      return [];
    }

    return data.map(session => ({
      id: session.id,
      title: session.title,
      scheduledAt: session.scheduled_at,
      coachName: session.coach ? `${session.coach.first_name || ''} ${session.coach.last_name || ''}`.trim() : 'Unknown Coach',
      clientName: session.client ? `${session.client.first_name || ''} ${session.client.last_name || ''}`.trim() : 'Unknown Client',
    }));
  }

  /**
   * Get sessions that are overdue (scheduled time has passed but still in 'scheduled' status)
   */
  async getOverdueSessions(): Promise<{
    id: string;
    title: string;
    scheduledAt: string;
    coachName: string;
    clientName: string;
    minutesOverdue: number;
  }[]> {
    const now = new Date();
    const { data, error } = await this.supabase
      .from('sessions')
      .select(`
        id,
        title,
        scheduled_at,
        duration_minutes,
        coach:users!sessions_coach_id_fkey(first_name, last_name),
        client:users!sessions_client_id_fkey(first_name, last_name)
      `)
      .eq('status', 'scheduled')
      .lt('scheduled_at', now.toISOString());

    if (error) {
      this.logError('fetching overdue sessions', error);
      return [];
    }

    return data.map(session => {
      const scheduledTime = new Date(session.scheduled_at);
      const minutesOverdue = Math.floor((now.getTime() - scheduledTime.getTime()) / (1000 * 60));

      return {
        id: session.id,
        title: session.title,
        scheduledAt: session.scheduled_at,
        coachName: session.coach ? `${session.coach.first_name || ''} ${session.coach.last_name || ''}`.trim() : 'Unknown Coach',
        clientName: session.client ? `${session.client.first_name || ''} ${session.client.last_name || ''}`.trim() : 'Unknown Client',
        minutesOverdue,
      };
    });
  }

  /**
   * Validate status transition
   */
  private async validateStatusTransition(sessionId: string, newStatus: SessionStatus): Promise<boolean> {
    // Get current session status
    const { data: session, error } = await this.supabase
      .from('sessions')
      .select('status, scheduled_at')
      .eq('id', sessionId)
      .single();

    if (error) {
      this.logError('fetching session for status validation', error);
      return false;
    }

    const currentStatus = session.status as SessionStatus;
    const scheduledTime = new Date(session.scheduled_at);
    const now = new Date();

    // Define valid transitions
    const validTransitions: Record<SessionStatus, SessionStatus[]> = {
      'scheduled': ['in_progress', 'cancelled', 'no_show'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [], // Cannot transition from completed
      'cancelled': ['scheduled'], // Can reschedule cancelled sessions
      'no_show': ['scheduled'], // Can reschedule no-show sessions
    };

    // Check if transition is allowed
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return false;
    }

    // Additional business rule validations
    if (newStatus === 'in_progress' && scheduledTime > now) {
      // Cannot start a session before its scheduled time
      return false;
    }

    if (newStatus === 'completed' && currentStatus !== 'in_progress') {
      // Can only complete sessions that are in progress
      return false;
    }

    return true;
  }

  /**
   * Get session workflow history
   */
  async getSessionWorkflowHistory(sessionId: string): Promise<{
    status: SessionStatus;
    timestamp: string;
    reason?: string;
  }[]> {
    // This would require a separate audit/history table in a real implementation
    // For now, we'll return basic status information from the main table
    const { data, error } = await this.supabase
      .from('sessions')
      .select('status, created_at, updated_at, started_at, completed_at, cancelled_at')
      .eq('id', sessionId)
      .single();

    if (error) {
      this.logError('fetching session workflow history', error);
      return [];
    }

    const history: { status: SessionStatus; timestamp: string; reason?: string }[] = [];

    // Add creation event
    history.push({
      status: 'scheduled',
      timestamp: data.created_at,
    });

    // Add status change events based on timestamps
    if (data.started_at) {
      history.push({
        status: 'in_progress',
        timestamp: data.started_at,
      });
    }

    if (data.completed_at) {
      history.push({
        status: 'completed',
        timestamp: data.completed_at,
      });
    }

    if (data.cancelled_at) {
      history.push({
        status: 'cancelled',
        timestamp: data.cancelled_at,
      });
    }

    return history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Bulk update session statuses
   */
  async bulkUpdateStatus(sessionIds: string[], status: SessionStatus): Promise<{
    successful: string[];
    failed: string[];
  }> {
    const results = { successful: [] as string[], failed: [] as string[] };

    // Process each session individually to ensure proper validation
    for (const sessionId of sessionIds) {
      const success = await this.updateSessionStatus(sessionId, status);
      if (success) {
        results.successful.push(sessionId);
      } else {
        results.failed.push(sessionId);
      }
    }

    return results;
  }
}