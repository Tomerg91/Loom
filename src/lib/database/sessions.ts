import type { Session, SessionStatus } from '@/types';

// Import specialized services
import { SessionAnalyticsService } from './services/session-analytics';
import { SessionCrudService } from './services/session-crud';
import { SessionParticipantsService } from './services/session-participants';
import { SessionSchedulingService } from './services/session-scheduling';
import { SessionWorkflowService } from './services/session-workflow';

// Re-export interfaces for backward compatibility
export type {
  GetSessionsOptions,
  GetSessionsCountOptions,
  CreateSessionData,
  UpdateSessionData,
} from './services/base-session';

/**
 * Refactored SessionService using composition pattern
 * Delegates responsibilities to specialized service classes
 */
export class SessionService {
  private crudService: SessionCrudService;
  private schedulingService: SessionSchedulingService;
  private participantsService: SessionParticipantsService;
  private workflowService: SessionWorkflowService;
  private analyticsService: SessionAnalyticsService;

  constructor(isServer = true) {
    // Initialize specialized services
    this.crudService = new SessionCrudService(isServer);
    this.schedulingService = new SessionSchedulingService(isServer);
    this.participantsService = new SessionParticipantsService(isServer);
    this.workflowService = new SessionWorkflowService(isServer);
    this.analyticsService = new SessionAnalyticsService(isServer);
  }

  // ==================== CRUD OPERATIONS ====================
  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return this.crudService.getSession(sessionId);
  }

  /**
   * Create new session
   */
  async createSession(sessionData: {
    coachId: string;
    clientId: string;
    title: string;
    description?: string;
    scheduledAt: Date;
    durationMinutes?: number;
  }): Promise<Session | null> {
    return this.crudService.createSession(sessionData);
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    return this.crudService.updateSession(sessionId, updates);
  }

  // ==================== WORKFLOW OPERATIONS ====================
  /**
   * Update session status
   */
  async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<boolean> {
    return this.workflowService.updateSessionStatus(sessionId, status);
  }

  /**
   * Cancel session
   */
  async cancelSession(sessionId: string): Promise<boolean> {
    return this.workflowService.cancelSession(sessionId);
  }

  /**
   * Complete session
   */
  async completeSession(sessionId: string, notes?: string): Promise<boolean> {
    return this.workflowService.completeSession(sessionId, notes);
  }

  /**
   * Start session
   */
  async startSession(sessionId: string): Promise<boolean> {
    return this.workflowService.startSession(sessionId);
  }

  /**
   * Mark session as no-show
   */
  async markNoShow(sessionId: string, reason?: string): Promise<boolean> {
    return this.workflowService.markNoShow(sessionId, reason);
  }

  // ==================== PARTICIPANT OPERATIONS ====================
  /**
   * Get upcoming sessions for a user
   */
  async getUpcomingSessions(userId: string): Promise<Session[]> {
    return this.participantsService.getUpcomingSessions(userId);
  }

  /**
   * Get sessions for a specific coach
   */
  async getCoachSessions(coachId: string, limit = 50): Promise<Session[]> {
    return this.participantsService.getCoachSessions(coachId, limit);
  }

  /**
   * Get sessions for a specific client
   */
  async getClientSessions(clientId: string, limit = 50): Promise<Session[]> {
    return this.participantsService.getClientSessions(clientId, limit);
  }

  /**
   * Get sessions between coach and client
   */
  async getSessionsBetweenUsers(coachId: string, clientId: string): Promise<Session[]> {
    return this.participantsService.getSessionsBetweenUsers(coachId, clientId);
  }

  // ==================== SCHEDULING OPERATIONS ====================
  /**
   * Check if time slot is available
   */
  async isTimeSlotAvailable(
    coachId: string, 
    startTime: Date, 
    durationMinutes = 60
  ): Promise<boolean> {
    return this.schedulingService.isTimeSlotAvailable(coachId, startTime, durationMinutes);
  }

  /**
   * Get available time slots for a coach on a specific date
   */
  async getAvailableTimeSlots(
    coachId: string, 
    date: Date, 
    slotDuration = 60
  ): Promise<{ startTime: string; endTime: string; isAvailable: boolean }[]> {
    return this.schedulingService.getAvailableTimeSlots(coachId, date, slotDuration);
  }

  // ==================== ANALYTICS OPERATIONS ====================
  /**
   * Search sessions by title or description
   */
  async searchSessions(
    query: string, 
    userId?: string, 
    status?: SessionStatus
  ): Promise<Session[]> {
    return this.analyticsService.searchSessions(query, userId, status);
  }

  /**
   * Get sessions with pagination and filtering (for API)
   */
  async getSessionsPaginated(options: GetSessionsOptions): Promise<Session[]> {
    return this.analyticsService.getSessionsPaginated(options);
  }

  /**
   * Get total count of sessions (for API pagination)
   */
  async getSessionsCount(options: GetSessionsCountOptions): Promise<number> {
    return this.analyticsService.getSessionsCount(options);
  }

  /**
   * Get session by ID (for API)
   */
  async getSessionById(sessionId: string): Promise<Session | null> {
    return this.getSession(sessionId);
  }

  /**
   * Create session (for API)
   */
  async createSessionFromApi(sessionData: CreateSessionData): Promise<Session | null> {
    return this.crudService.createSessionFromApi(sessionData);
  }

  /**
   * Update session (for API)
   */
  async updateSessionFromApi(sessionId: string, updates: UpdateSessionData): Promise<Session | null> {
    return this.crudService.updateSessionFromApi(sessionId, updates);
  }

  /**
   * Delete session (for API)
   */
  async deleteSessionFromApi(sessionId: string): Promise<boolean> {
    return this.crudService.deleteSession(sessionId);
  }

  // ==================== TEST-COMPATIBLE METHODS ====================
  /**
   * Test-compatible methods (aliases for existing functionality)
   */
  async create(sessionData: CreateSessionData): Promise<Session | null> {
    return this.createSessionFromApi(sessionData);
  }

  async findMany(options: GetSessionsOptions = {}): Promise<{ data: Session[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const data = await this.getSessionsPaginated(options);
    const total = await this.getSessionsCount(options);
    const page = Math.floor((options.offset || 0) / (options.limit || 10)) + 1;
    const limit = options.limit || 10;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      }
    };
  }

  async findById(sessionId: string): Promise<Session | null> {
    return this.getSessionById(sessionId);
  }

  async update(sessionId: string, updates: UpdateSessionData): Promise<Session | null> {
    return this.updateSessionFromApi(sessionId, updates);
  }

  async delete(sessionId: string): Promise<boolean> {
    return this.deleteSessionFromApi(sessionId);
  }

  async findUpcoming(userId: string): Promise<Session[]> {
    return this.getUpcomingSessions(userId);
  }

  async findByDateRange(from: string, to: string, userId?: string): Promise<Session[]> {
    return this.analyticsService.findByDateRange(from, to, userId);
  }

  async updateStatus(sessionId: string, status: SessionStatus): Promise<boolean> {
    return this.updateSessionStatus(sessionId, status);
  }
}

// Export individual functions for API usage (backward compatibility)
const sessionService = new SessionService(true);

export const getSessionsPaginated = (options: GetSessionsOptions) => sessionService.getSessionsPaginated(options);
export const getSessionsCount = (options: GetSessionsCountOptions) => sessionService.getSessionsCount(options);
export const getSessionById = (sessionId: string) => sessionService.getSessionById(sessionId);
export const createSession = (sessionData: CreateSessionData) => sessionService.createSessionFromApi(sessionData);
export const updateSession = (sessionId: string, updates: UpdateSessionData) => sessionService.updateSessionFromApi(sessionId, updates);
export const deleteSession = (sessionId: string) => sessionService.deleteSessionFromApi(sessionId);

// Export workflow methods
export const startSession = (sessionId: string) => sessionService.startSession(sessionId);
export const completeSession = (sessionId: string, notes?: string) => sessionService.completeSession(sessionId, notes);
export const cancelSession = (sessionId: string, _reason?: string) => sessionService.cancelSession(sessionId);
export const markNoShow = (sessionId: string, reason?: string) => sessionService.markNoShow(sessionId, reason);
export const updateSessionStatus = (sessionId: string, status: SessionStatus) => sessionService.updateSessionStatus(sessionId, status);

// Export specialized services for direct access if needed
export { SessionCrudService } from './services/session-crud';
export { SessionSchedulingService } from './services/session-scheduling';
export { SessionParticipantsService } from './services/session-participants';
export { SessionWorkflowService } from './services/session-workflow';
export { SessionAnalyticsService } from './services/session-analytics';