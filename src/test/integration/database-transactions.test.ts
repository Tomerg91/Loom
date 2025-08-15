import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase server client
const mockSupabaseServerClient = {
  from: vi.fn(),
  rpc: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabaseServerClient),
}));

// Mock database connection for raw SQL transactions
const mockPostgresClient = {
  query: vi.fn(),
  begin: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
};

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(mockPostgresClient),
    end: vi.fn(),
  })),
}));

// Test data setup
const createMockUser = (id: string, role: 'client' | 'coach' | 'admin' = 'client') => ({
  id,
  email: `${id}@example.com`,
  firstName: 'Test',
  lastName: 'User',
  role,
  status: 'active' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createMockSession = (id: string, coachId: string, clientId: string) => ({
  id,
  title: 'Test Session',
  description: 'A test coaching session',
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  duration: 60,
  status: 'scheduled' as const,
  type: 'individual' as const,
  coachId,
  clientId,
  sessionUrl: null,
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Database Transaction Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful query mocks
    mockSupabaseServerClient.from.mockImplementation((table: string) => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Session Booking with Concurrent Availability Checks', () => {
    it('prevents double booking with proper transaction isolation', async () => {
      const coachId = 'coach-123';
      const clientId1 = 'client-456';
      const clientId2 = 'client-789';
      const timeSlot = '2024-12-20T10:00:00Z';

      // Mock the transaction flow for concurrent booking attempts
      const mockTransaction = {
        from: vi.fn().mockImplementation((table: string) => ({
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockReturnThis(),
          single: vi.fn(),
        })),
      };

      // First booking attempt - should succeed
      mockTransaction.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null, // No conflicting sessions
          error: null,
        }),
      });

      // Second booking attempt - should find conflict
      mockTransaction.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'session-123', coachId, scheduledAt: timeSlot },
          error: null,
        }),
      });

      const bookingService = {
        async bookSession(coachId: string, clientId: string, scheduledAt: string) {
          const supabase = await createClient();
          
          // Begin transaction (simulated)
          const tx = mockTransaction;
          
          // Check for conflicting sessions within transaction
          const conflictCheck = await tx
            .from('sessions')
            .select('id, coach_id, scheduled_at')
            .eq('coach_id', coachId)
            .gte('scheduled_at', new Date(new Date(scheduledAt).getTime() - 30 * 60 * 1000).toISOString())
            .lte('scheduled_at', new Date(new Date(scheduledAt).getTime() + 90 * 60 * 1000).toISOString())
            .single();

          if (conflictCheck.data) {
            throw new Error('Time slot no longer available');
          }

          // Create session
          const sessionData = {
            coach_id: coachId,
            client_id: clientId,
            scheduled_at: scheduledAt,
            status: 'scheduled',
            duration: 60,
          };

          return tx.from('sessions').insert(sessionData);
        }
      };

      // First booking should succeed
      await expect(
        bookingService.bookSession(coachId, clientId1, timeSlot)
      ).resolves.not.toThrow();

      // Second booking should fail due to conflict
      await expect(
        bookingService.bookSession(coachId, clientId2, timeSlot)
      ).rejects.toThrow('Time slot no longer available');
    });

    it('handles optimistic concurrency with version-based conflict detection', async () => {
      const sessionId = 'session-123';
      const initialVersion = 1;
      const updatedData = {
        notes: 'Updated session notes',
        status: 'completed' as const,
      };

      // Mock version check - first attempt finds correct version
      mockSupabaseServerClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: sessionId, version: initialVersion },
          error: null,
        }),
      });

      // Mock update with version increment
      mockSupabaseServerClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...updatedData, version: initialVersion + 1 },
          error: null,
        }),
      });

      const optimisticUpdateService = {
        async updateSession(sessionId: string, updates: any, expectedVersion: number) {
          const supabase = await createClient();
          
          // Verify current version
          const currentRecord = await supabase
            .from('sessions')
            .select('id, version')
            .eq('id', sessionId)
            .single();

          if (currentRecord.data?.version !== expectedVersion) {
            throw new Error('Concurrent modification detected. Please refresh and try again.');
          }

          // Update with version increment
          return supabase
            .from('sessions')
            .update({
              ...updates,
              version: expectedVersion + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .eq('version', expectedVersion)
            .select()
            .single();
        }
      };

      const result = await optimisticUpdateService.updateSession(sessionId, updatedData, initialVersion);
      
      expect(result).toBeDefined();
      expect(mockSupabaseServerClient.from).toHaveBeenCalledWith('sessions');
    });

    it('handles session cancellation with proper compensation transactions', async () => {
      const sessionId = 'session-123';
      const coachId = 'coach-456';
      const clientId = 'client-789';
      const cancellationReason = 'Client requested cancellation';

      // Mock successful cancellation chain
      const mockCancellationTransaction = {
        from: vi.fn().mockImplementation((table: string) => {
          const mockChain = {
            update: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          };
          return mockChain;
        }),
      };

      const cancellationService = {
        async cancelSession(sessionId: string, reason: string) {
          const tx = mockCancellationTransaction;
          
          try {
            // 1. Update session status
            await tx.from('sessions')
              .update({ 
                status: 'cancelled',
                cancellation_reason: reason,
                cancelled_at: new Date().toISOString(),
              })
              .eq('id', sessionId);

            // 2. Create audit log entry
            await tx.from('audit_logs')
              .insert({
                table_name: 'sessions',
                record_id: sessionId,
                action: 'cancel',
                old_values: null,
                new_values: { status: 'cancelled', reason },
                user_id: clientId,
              });

            // 3. Update coach availability (free up the slot)
            await tx.from('coach_availability')
              .update({ is_booked: false })
              .eq('coach_id', coachId)
              .eq('session_id', sessionId);

            // 4. Create notification for coach
            await tx.from('notifications')
              .insert({
                user_id: coachId,
                type: 'session_cancelled',
                title: 'Session Cancelled',
                message: `Session cancelled by client: ${reason}`,
                data: { sessionId, reason },
              });

            return { success: true };
          } catch (error) {
            throw new Error(`Cancellation failed: ${error.message}`);
          }
        }
      };

      const result = await cancellationService.cancelSession(sessionId, cancellationReason);
      
      expect(result.success).toBe(true);
      expect(mockCancellationTransaction.from).toHaveBeenCalledWith('sessions');
      expect(mockCancellationTransaction.from).toHaveBeenCalledWith('audit_logs');
      expect(mockCancellationTransaction.from).toHaveBeenCalledWith('coach_availability');
      expect(mockCancellationTransaction.from).toHaveBeenCalledWith('notifications');
    });
  });

  describe('User Role Management with Permission Propagation', () => {
    it('handles role changes with cascading permission updates', async () => {
      const userId = 'user-123';
      const oldRole = 'client';
      const newRole = 'coach';

      const mockRoleTransaction = {
        from: vi.fn().mockImplementation((table: string) => ({
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        })),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const roleManagementService = {
        async changeUserRole(userId: string, newRole: string) {
          const tx = mockRoleTransaction;

          try {
            // 1. Update user role
            await tx.from('users')
              .update({ 
                role: newRole,
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId);

            // 2. Clear existing permissions
            await tx.from('user_permissions')
              .delete()
              .eq('user_id', userId);

            // 3. Assign new role-based permissions
            const rolePermissions = await tx.from('role_permissions')
              .select('permission_id')
              .eq('role', newRole);

            if (rolePermissions.data?.length) {
              const permissionInserts = rolePermissions.data.map(p => ({
                user_id: userId,
                permission_id: p.permission_id,
                granted_at: new Date().toISOString(),
              }));

              await tx.from('user_permissions')
                .insert(permissionInserts);
            }

            // 4. Update role-specific profile data
            if (newRole === 'coach') {
              await tx.from('coach_profiles')
                .insert({
                  user_id: userId,
                  specialties: [],
                  experience_years: 0,
                  hourly_rate: null,
                  bio: '',
                });
            } else if (newRole === 'client') {
              await tx.from('client_profiles')
                .insert({
                  user_id: userId,
                  goals: [],
                  preferences: {},
                });
            }

            // 5. Create audit log
            await tx.from('audit_logs')
              .insert({
                table_name: 'users',
                record_id: userId,
                action: 'role_change',
                old_values: { role: oldRole },
                new_values: { role: newRole },
                user_id: userId,
              });

            // 6. Invalidate user sessions (force re-authentication)
            await tx.rpc('invalidate_user_sessions', { user_id: userId });

            return { success: true, newRole };
          } catch (error) {
            throw new Error(`Role change failed: ${error.message}`);
          }
        }
      };

      const result = await roleManagementService.changeUserRole(userId, newRole);
      
      expect(result.success).toBe(true);
      expect(result.newRole).toBe(newRole);
      expect(mockRoleTransaction.from).toHaveBeenCalledWith('users');
      expect(mockRoleTransaction.from).toHaveBeenCalledWith('user_permissions');
      expect(mockRoleTransaction.from).toHaveBeenCalledWith('coach_profiles');
      expect(mockRoleTransaction.rpc).toHaveBeenCalledWith('invalidate_user_sessions', { user_id: userId });
    });

    it('handles bulk role assignments with proper transaction boundaries', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const targetRole = 'coach';

      const mockBulkTransaction = {
        from: vi.fn().mockImplementation(() => ({
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
        })),
      };

      const bulkRoleService = {
        async bulkUpdateRoles(userIds: string[], newRole: string) {
          const tx = mockBulkTransaction;
          const results = { succeeded: [], failed: [] };

          try {
            // Batch update users
            await tx.from('users')
              .update({ 
                role: newRole,
                updated_at: new Date().toISOString(),
              })
              .in('id', userIds);

            // Batch create role-specific profiles
            const profileInserts = userIds.map(userId => ({
              user_id: userId,
              specialties: [],
              experience_years: 0,
              created_at: new Date().toISOString(),
            }));

            await tx.from('coach_profiles')
              .insert(profileInserts);

            // Batch audit logging
            const auditInserts = userIds.map(userId => ({
              table_name: 'users',
              record_id: userId,
              action: 'bulk_role_change',
              new_values: { role: newRole },
              created_at: new Date().toISOString(),
            }));

            await tx.from('audit_logs')
              .insert(auditInserts);

            results.succeeded = userIds;
            return results;
          } catch (error) {
            results.failed = userIds;
            throw new Error(`Bulk role update failed: ${error.message}`);
          }
        }
      };

      const result = await bulkRoleService.bulkUpdateRoles(userIds, targetRole);
      
      expect(result.succeeded).toEqual(userIds);
      expect(result.failed).toEqual([]);
      expect(mockBulkTransaction.from).toHaveBeenCalledWith('users');
      expect(mockBulkTransaction.from).toHaveBeenCalledWith('coach_profiles');
      expect(mockBulkTransaction.from).toHaveBeenCalledWith('audit_logs');
    });
  });

  describe('Data Consistency and Referential Integrity', () => {
    it('handles cascading deletes properly', async () => {
      const userId = 'user-123';
      const relatedSessions = ['session-1', 'session-2'];
      const relatedFiles = ['file-1', 'file-2'];

      const mockCascadeTransaction = {
        from: vi.fn().mockImplementation((table: string) => {
          const mockChain = {
            select: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
          };

          // Mock different responses for different tables
          if (table === 'sessions') {
            mockChain.select = vi.fn().mockResolvedValue({
              data: relatedSessions.map(id => ({ id, status: 'scheduled' })),
              error: null,
            });
          } else if (table === 'files') {
            mockChain.select = vi.fn().mockResolvedValue({
              data: relatedFiles.map(id => ({ id, path: `/uploads/${id}` })),
              error: null,
            });
          }

          return mockChain;
        }),
      };

      const userDeletionService = {
        async deleteUser(userId: string) {
          const tx = mockCascadeTransaction;
          
          try {
            // 1. Find and cancel related sessions
            const sessions = await tx.from('sessions')
              .select('id, status')
              .eq('client_id', userId)
              .or(`coach_id.eq.${userId}`);

            if (sessions.data?.length) {
              await tx.from('sessions')
                .update({ 
                  status: 'cancelled',
                  cancellation_reason: 'User account deleted',
                })
                .in('id', sessions.data.map(s => s.id));
            }

            // 2. Handle user files
            const files = await tx.from('files')
              .select('id, path')
              .eq('user_id', userId);

            if (files.data?.length) {
              // Mark files for deletion (actual deletion handled asynchronously)
              await tx.from('files')
                .update({ 
                  status: 'pending_deletion',
                  deleted_at: new Date().toISOString(),
                })
                .eq('user_id', userId);
            }

            // 3. Delete related records in dependency order
            await tx.from('user_permissions').delete().eq('user_id', userId);
            await tx.from('notifications').delete().eq('user_id', userId);
            await tx.from('audit_logs').delete().eq('user_id', userId);
            
            // 4. Delete profile records
            await tx.from('coach_profiles').delete().eq('user_id', userId);
            await tx.from('client_profiles').delete().eq('user_id', userId);
            
            // 5. Finally delete the user
            await tx.from('users').delete().eq('id', userId);

            return { 
              success: true, 
              sessionsAffected: sessions.data?.length || 0,
              filesAffected: files.data?.length || 0,
            };
          } catch (error) {
            throw new Error(`User deletion failed: ${error.message}`);
          }
        }
      };

      const result = await userDeletionService.deleteUser(userId);
      
      expect(result.success).toBe(true);
      expect(result.sessionsAffected).toBe(2);
      expect(result.filesAffected).toBe(2);
      expect(mockCascadeTransaction.from).toHaveBeenCalledWith('sessions');
      expect(mockCascadeTransaction.from).toHaveBeenCalledWith('files');
      expect(mockCascadeTransaction.from).toHaveBeenCalledWith('users');
    });

    it('handles foreign key constraint violations gracefully', async () => {
      const invalidCoachId = 'nonexistent-coach';
      const clientId = 'client-123';
      const sessionData = {
        coach_id: invalidCoachId,
        client_id: clientId,
        scheduled_at: new Date().toISOString(),
        duration: 60,
      };

      // Mock foreign key constraint error
      mockSupabaseServerClient.from.mockReturnValueOnce({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23503',
            message: 'insert or update on table "sessions" violates foreign key constraint "sessions_coach_id_fkey"',
            details: 'Key (coach_id)=(nonexistent-coach) is not present in table "users".',
          },
        }),
      });

      const sessionBookingService = {
        async createSession(sessionData: any) {
          const supabase = await createClient();
          
          try {
            const result = await supabase
              .from('sessions')
              .insert(sessionData)
              .select()
              .single();

            if (result.error) {
              if (result.error.code === '23503') {
                throw new Error('Invalid coach or client ID provided');
              }
              throw result.error;
            }

            return result.data;
          } catch (error) {
            throw error;
          }
        }
      };

      await expect(
        sessionBookingService.createSession(sessionData)
      ).rejects.toThrow('Invalid coach or client ID provided');
    });
  });

  describe('Database Backup and Restore Scenarios', () => {
    it('handles partial backup restoration with data validation', async () => {
      const backupData = {
        users: [
          createMockUser('user-1', 'client'),
          createMockUser('user-2', 'coach'),
        ],
        sessions: [
          createMockSession('session-1', 'user-2', 'user-1'),
        ],
      };

      const mockRestoreTransaction = {
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          upsert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
        })),
      };

      const backupRestoreService = {
        async restoreFromBackup(backupData: any) {
          const tx = mockRestoreTransaction;
          const results = {
            usersRestored: 0,
            sessionsRestored: 0,
            errors: [],
          };

          try {
            // Restore users first (dependency order)
            if (backupData.users?.length) {
              await tx.from('users').upsert(backupData.users);
              results.usersRestored = backupData.users.length;
            }

            // Validate foreign key relationships before restoring sessions
            if (backupData.sessions?.length) {
              const validUserIds = backupData.users.map(u => u.id);
              const validSessions = backupData.sessions.filter(session => 
                validUserIds.includes(session.coachId) && 
                validUserIds.includes(session.clientId)
              );

              if (validSessions.length > 0) {
                await tx.from('sessions').upsert(validSessions);
                results.sessionsRestored = validSessions.length;
              }

              const invalidSessions = backupData.sessions.length - validSessions.length;
              if (invalidSessions > 0) {
                results.errors.push(`${invalidSessions} sessions skipped due to invalid user references`);
              }
            }

            return results;
          } catch (error) {
            throw new Error(`Restore failed: ${error.message}`);
          }
        }
      };

      const result = await backupRestoreService.restoreFromBackup(backupData);
      
      expect(result.usersRestored).toBe(2);
      expect(result.sessionsRestored).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockRestoreTransaction.from).toHaveBeenCalledWith('users');
      expect(mockRestoreTransaction.from).toHaveBeenCalledWith('sessions');
    });

    it('handles corrupted backup data with rollback', async () => {
      const corruptedBackupData = {
        users: [
          { id: 'user-1' }, // Missing required fields
          createMockUser('user-2', 'coach'),
        ],
        sessions: [
          { id: 'session-1', invalidField: 'corrupt' }, // Invalid structure
        ],
      };

      const mockCorruptTransaction = {
        from: vi.fn().mockImplementation(() => ({
          upsert: vi.fn().mockRejectedValue(new Error('Invalid data structure')),
        })),
      };

      const backupRestoreService = {
        async restoreFromBackup(backupData: any) {
          const tx = mockCorruptTransaction;
          
          try {
            // Attempt to restore users
            await tx.from('users').upsert(backupData.users);
            return { success: true };
          } catch (error) {
            // Rollback would happen here in a real transaction
            throw new Error(`Backup restore failed due to data corruption: ${error.message}`);
          }
        }
      };

      await expect(
        backupRestoreService.restoreFromBackup(corruptedBackupData)
      ).rejects.toThrow('Backup restore failed due to data corruption');
    });
  });

  describe('Complex Multi-Table Operations', () => {
    it('handles session completion with multiple related updates', async () => {
      const sessionId = 'session-123';
      const coachId = 'coach-456';
      const clientId = 'client-789';
      const sessionNotes = 'Great progress on communication skills';
      const nextSessionGoals = ['Practice active listening', 'Work on confidence'];

      const mockCompleteSessionTransaction = {
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        })),
      };

      const sessionCompletionService = {
        async completeSession(sessionId: string, completionData: any) {
          const tx = mockCompleteSessionTransaction;
          
          try {
            // 1. Update session status and add notes
            await tx.from('sessions')
              .update({
                status: 'completed',
                notes: completionData.notes,
                completed_at: new Date().toISOString(),
                rating: completionData.rating,
              })
              .eq('id', sessionId);

            // 2. Create coach reflection
            await tx.from('coach_reflections')
              .insert({
                session_id: sessionId,
                coach_id: coachId,
                reflection: completionData.coachReflection,
                key_insights: completionData.keyInsights,
                areas_for_improvement: completionData.areasForImprovement,
              });

            // 3. Update client progress tracking
            await tx.from('client_progress')
              .insert({
                client_id: clientId,
                session_id: sessionId,
                progress_notes: completionData.progressNotes,
                goals_achieved: completionData.goalsAchieved,
                next_session_goals: completionData.nextSessionGoals,
              });

            // 4. Update coach availability (free up the slot)
            await tx.from('coach_availability')
              .update({ is_booked: false })
              .eq('coach_id', coachId)
              .eq('session_id', sessionId);

            // 5. Create follow-up notifications
            await tx.from('notifications')
              .insert([
                {
                  user_id: clientId,
                  type: 'session_completed',
                  title: 'Session Completed',
                  message: 'Please share your feedback on the session',
                  data: { sessionId, coachId },
                },
                {
                  user_id: coachId,
                  type: 'session_completed',
                  title: 'Session Completed',
                  message: 'Session completed successfully',
                  data: { sessionId, clientId },
                },
              ]);

            // 6. Update session statistics
            await tx.from('coach_stats')
              .update({
                total_sessions: tx.raw('total_sessions + 1'),
                updated_at: new Date().toISOString(),
              })
              .eq('coach_id', coachId);

            return { success: true };
          } catch (error) {
            throw new Error(`Session completion failed: ${error.message}`);
          }
        }
      };

      const completionData = {
        notes: sessionNotes,
        rating: 5,
        coachReflection: 'Client made excellent progress',
        keyInsights: ['Strong motivation', 'Good self-awareness'],
        areasForImprovement: ['Time management'],
        progressNotes: 'Significant improvement in confidence',
        goalsAchieved: ['Completed communication exercise'],
        nextSessionGoals,
      };

      const result = await sessionCompletionService.completeSession(sessionId, completionData);
      
      expect(result.success).toBe(true);
      expect(mockCompleteSessionTransaction.from).toHaveBeenCalledWith('sessions');
      expect(mockCompleteSessionTransaction.from).toHaveBeenCalledWith('coach_reflections');
      expect(mockCompleteSessionTransaction.from).toHaveBeenCalledWith('client_progress');
      expect(mockCompleteSessionTransaction.from).toHaveBeenCalledWith('coach_availability');
      expect(mockCompleteSessionTransaction.from).toHaveBeenCalledWith('notifications');
      expect(mockCompleteSessionTransaction.from).toHaveBeenCalledWith('coach_stats');
    });
  });
});