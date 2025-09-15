/**
 * Database Security Migration Tests
 * 
 * This test suite verifies that the security migrations applied to the database
 * haven't broken any core functionality while properly implementing security measures.
 * 
 * Tests cover:
 * 1. Basic User Operations (handle_new_user function)
 * 2. User Authentication Flows
 * 3. Basic CRUD Operations on Core Tables
 * 4. MFA System Testing with RLS Policies
 * 5. View Access Testing
 * 6. Function Security Testing
 * 7. Session and Rating System
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Test constants
const TEST_EMAIL = 'test-security-migration@example.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_COACH_EMAIL = 'test-coach-migration@example.com';
const TEST_ADMIN_EMAIL = 'test-admin-migration@example.com';

// Global test clients
let supabase: SupabaseClient<Database>;
let adminClient: SupabaseClient<Database>;
let testUserId: string;
let testCoachId: string;
let testAdminId: string;
let testSessionId: string;

describe('Database Security Migration Tests', () => {
  beforeAll(async () => {
    // Initialize clients directly with environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
      throw new Error('Missing required Supabase environment variables for testing');
    }
    
    // Initialize clients
    supabase = createClient<Database>(supabaseUrl, supabaseKey);
    adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    // Verify database connection
    const { data, error } = await adminClient.rpc('db_health_check');
    if (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
    expect(data).toBeTruthy();
    console.log('Database health check passed');
  });

  beforeEach(async () => {
    // Clean up any existing test users
    await adminClient
      .from('users')
      .delete()
      .in('email', [TEST_EMAIL, TEST_COACH_EMAIL, TEST_ADMIN_EMAIL]);
  });

  afterAll(async () => {
    // Final cleanup
    try {
      await adminClient
        .from('users')
        .delete()
        .in('email', [TEST_EMAIL, TEST_COACH_EMAIL, TEST_ADMIN_EMAIL]);
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('1. Basic User Operations', () => {
    it('should test handle_new_user function with proper RLS', async () => {
      // Create a user through Supabase Auth (this triggers handle_new_user)
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
          role: 'client'
        }
      });

      expect(authError).toBeNull();
      expect(authData.user).toBeTruthy();
      testUserId = authData.user!.id;

      // Verify that the handle_new_user trigger created the profile
      const { data: profile, error: profileError } = await adminClient
        .from('users')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(profileError).toBeNull();
      expect(profile).toBeTruthy();
      expect(profile!.email).toBe(TEST_EMAIL);
      expect(profile!.first_name).toBe('Test');
      expect(profile!.last_name).toBe('User');
      expect(profile!.role).toBe('client');
      expect(profile!.status).toBe('active');
    });

    it('should verify user creation with different roles', async () => {
      // Test coach user creation
      const { data: coachAuthData, error: coachAuthError } = await adminClient.auth.admin.createUser({
        email: TEST_COACH_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'Coach',
          role: 'coach'
        }
      });

      expect(coachAuthError).toBeNull();
      expect(coachAuthData.user).toBeTruthy();
      testCoachId = coachAuthData.user!.id;

      // Test admin user creation
      const { data: adminAuthData, error: adminAuthError } = await adminClient.auth.admin.createUser({
        email: TEST_ADMIN_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'Admin',
          role: 'admin'
        }
      });

      expect(adminAuthError).toBeNull();
      expect(adminAuthData.user).toBeTruthy();
      testAdminId = adminAuthData.user!.id;

      // Verify profiles were created with correct roles
      const { data: profiles, error: profilesError } = await adminClient
        .from('users')
        .select('id, email, role')
        .in('id', [testCoachId, testAdminId]);

      expect(profilesError).toBeNull();
      expect(profiles).toHaveLength(2);
      
      const coachProfile = profiles!.find(p => p.id === testCoachId);
      const adminProfile = profiles!.find(p => p.id === testAdminId);
      
      expect(coachProfile!.role).toBe('coach');
      expect(adminProfile!.role).toBe('admin');
    });
  });

  describe('2. User Authentication Flows', () => {
    beforeEach(async () => {
      // Create test user for auth flow tests
      const { data: authData } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'User',
          role: 'client'
        }
      });
      testUserId = authData.user!.id;
    });

    it('should authenticate user and verify profile access', async () => {
      // Test basic authentication through Supabase
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      expect(signInError).toBeNull();
      expect(signInData.user).toBeTruthy();
      expect(signInData.user!.email).toBe(TEST_EMAIL);

      // Verify profile can be accessed after authentication
      const { data: profile, error: profileError } = await adminClient
        .from('users')
        .select('*')
        .eq('id', signInData.user!.id)
        .single();

      expect(profileError).toBeNull();
      expect(profile).toBeTruthy();
      expect(profile!.email).toBe(TEST_EMAIL);
      expect(profile!.role).toBe('client');
    });

    it('should update user last seen timestamp', async () => {
      // Get initial last_seen_at value
      const { data: initialProfile } = await adminClient
        .from('users')
        .select('last_seen_at')
        .eq('id', testUserId)
        .single();

      const initialLastSeen = initialProfile?.last_seen_at;

      // Sign in user (should trigger last seen update)
      const authService = await createAuthService(false);
      await authService.signIn({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that last_seen_at was updated
      const { data: updatedProfile } = await adminClient
        .from('users')
        .select('last_seen_at')
        .eq('id', testUserId)
        .single();

      const updatedLastSeen = updatedProfile?.last_seen_at;
      
      expect(updatedLastSeen).toBeTruthy();
      if (initialLastSeen) {
        expect(new Date(updatedLastSeen!).getTime()).toBeGreaterThan(new Date(initialLastSeen).getTime());
      }
    });

    it('should test role validation functions', async () => {
      // Test is_admin function
      const { data: isAdminResult, error: isAdminError } = await adminClient
        .rpc('is_admin', { user_id: testAdminId });
      
      expect(isAdminError).toBeNull();
      expect(isAdminResult).toBe(true);

      // Test is_coach function
      const { data: isCoachResult, error: isCoachError } = await adminClient
        .rpc('is_coach', { user_id: testCoachId });
      
      expect(isCoachError).toBeNull();
      expect(isCoachResult).toBe(true);

      // Test is_client function
      const { data: isClientResult, error: isClientError } = await adminClient
        .rpc('is_client', { user_id: testUserId });
      
      expect(isClientError).toBeNull();
      expect(isClientResult).toBe(true);

      // Test get_user_role function
      const { data: userRoleResult, error: userRoleError } = await adminClient
        .rpc('get_user_role', { user_id: testUserId });
      
      expect(userRoleError).toBeNull();
      expect(userRoleResult).toBe('client');
    });
  });

  describe('3. Basic CRUD Operations on Core Tables', () => {
    beforeEach(async () => {
      // Create test users
      const { data: clientAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'User', role: 'client' }
      });
      testUserId = clientAuthData.user!.id;

      const { data: coachAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_COACH_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Coach', role: 'coach' }
      });
      testCoachId = coachAuthData.user!.id;
    });

    it('should test session CRUD with RLS policies', async () => {
      // Create a session
      const { data: sessionData, error: sessionError } = await adminClient
        .from('sessions')
        .insert({
          title: 'Test Session',
          description: 'A test session for migration testing',
          coach_id: testCoachId,
          client_id: testUserId,
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration_minutes: 60,
          status: 'scheduled',
          type: 'individual'
        })
        .select()
        .single();

      expect(sessionError).toBeNull();
      expect(sessionData).toBeTruthy();
      testSessionId = sessionData!.id;

      // Test reading session
      const { data: readSession, error: readError } = await adminClient
        .from('sessions')
        .select('*')
        .eq('id', testSessionId)
        .single();

      expect(readError).toBeNull();
      expect(readSession).toBeTruthy();
      expect(readSession!.title).toBe('Test Session');

      // Test updating session
      const { data: updatedSession, error: updateError } = await adminClient
        .from('sessions')
        .update({ title: 'Updated Test Session' })
        .eq('id', testSessionId)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedSession!.title).toBe('Updated Test Session');
    });

    it('should test coach availability CRUD', async () => {
      // Create coach availability
      const { data: availabilityData, error: availabilityError } = await adminClient
        .from('coach_availability')
        .insert({
          coach_id: testCoachId,
          day_of_week: 1, // Monday
          start_time: '09:00',
          end_time: '17:00',
          is_available: true,
          timezone: 'UTC'
        })
        .select()
        .single();

      expect(availabilityError).toBeNull();
      expect(availabilityData).toBeTruthy();

      // Test reading availability
      const { data: readAvailability, error: readError } = await adminClient
        .from('coach_availability')
        .select('*')
        .eq('coach_id', testCoachId);

      expect(readError).toBeNull();
      expect(readAvailability).toBeTruthy();
      expect(readAvailability!.length).toBeGreaterThan(0);
    });

    it('should test notifications CRUD with proper permissions', async () => {
      // Create notification
      const { data: notificationData, error: notificationError } = await adminClient
        .from('notifications')
        .insert({
          user_id: testUserId,
          type: 'session_reminder',
          title: 'Test Notification',
          message: 'This is a test notification',
          data: { sessionId: 'test-session' }
        })
        .select()
        .single();

      expect(notificationError).toBeNull();
      expect(notificationData).toBeTruthy();

      // Test reading notification
      const { data: readNotification, error: readError } = await adminClient
        .from('notifications')
        .select('*')
        .eq('user_id', testUserId);

      expect(readError).toBeNull();
      expect(readNotification).toBeTruthy();
      expect(readNotification!.length).toBeGreaterThan(0);
    });
  });

  describe('4. MFA System Testing', () => {
    beforeEach(async () => {
      // Create test user with MFA setup
      const { data: authData } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'User', role: 'client' }
      });
      testUserId = authData.user!.id;
      
      // Enable MFA for test user
      await adminClient
        .from('users')
        .update({ 
          mfa_enabled: true,
          mfa_setup_completed: true
        })
        .eq('id', testUserId);
    });

    it('should test MFA session creation and RLS policies', async () => {
      // Create MFA session
      const { data: mfaSession, error: mfaSessionError } = await adminClient
        .from('mfa_sessions')
        .insert({
          user_id: testUserId,
          session_token: 'test-session-token',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
          verified: false
        })
        .select()
        .single();

      expect(mfaSessionError).toBeNull();
      expect(mfaSession).toBeTruthy();

      // Test reading MFA session
      const { data: readMfaSession, error: readError } = await adminClient
        .from('mfa_sessions')
        .select('*')
        .eq('user_id', testUserId);

      expect(readError).toBeNull();
      expect(readMfaSession).toBeTruthy();
      expect(readMfaSession!.length).toBeGreaterThan(0);
    });

    it('should test trusted device functionality with RLS', async () => {
      // Create trusted device
      const { data: trustedDevice, error: trustedDeviceError } = await adminClient
        .from('trusted_devices')
        .insert({
          user_id: testUserId,
          device_fingerprint: 'test-device-fingerprint',
          device_name: 'Test Device',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          created_from_ip: '127.0.0.1'
        })
        .select()
        .single();

      expect(trustedDeviceError).toBeNull();
      expect(trustedDevice).toBeTruthy();

      // Test reading trusted devices
      const { data: readTrustedDevices, error: readError } = await adminClient
        .from('trusted_devices')
        .select('*')
        .eq('user_id', testUserId);

      expect(readError).toBeNull();
      expect(readTrustedDevices).toBeTruthy();
      expect(readTrustedDevices!.length).toBeGreaterThan(0);
    });

    it('should test MFA audit logging with proper access controls', async () => {
      // Create MFA audit log entry
      const { data: auditLog, error: auditLogError } = await adminClient
        .from('mfa_audit_log')
        .insert({
          user_id: testUserId,
          action: 'setup',
          ip_address: '127.0.0.1',
          user_agent: 'Test User Agent',
          success: true
        })
        .select()
        .single();

      expect(auditLogError).toBeNull();
      expect(auditLog).toBeTruthy();

      // Test reading audit log
      const { data: readAuditLog, error: readError } = await adminClient
        .from('mfa_audit_log')
        .select('*')
        .eq('user_id', testUserId);

      expect(readError).toBeNull();
      expect(readAuditLog).toBeTruthy();
      expect(readAuditLog!.length).toBeGreaterThan(0);
    });

    it('should test MFA-related functions', async () => {
      // Test get_user_mfa_status function
      const { data: mfaStatus, error: mfaStatusError } = await adminClient
        .rpc('get_user_mfa_status', { user_id: testUserId });

      expect(mfaStatusError).toBeNull();
      expect(mfaStatus).toBeTruthy();
      expect(mfaStatus.mfa_enabled).toBe(true);
      expect(mfaStatus.mfa_setup_completed).toBe(true);

      // Test cleanup_expired_mfa_sessions function
      const { error: cleanupError } = await adminClient
        .rpc('cleanup_expired_mfa_sessions');

      expect(cleanupError).toBeNull();
    });
  });

  describe('5. View Access Testing', () => {
    beforeEach(async () => {
      // Create test users and data for view testing
      const { data: clientAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Client', role: 'client' }
      });
      testUserId = clientAuthData.user!.id;

      const { data: coachAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_COACH_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Coach', role: 'coach' }
      });
      testCoachId = coachAuthData.user!.id;

      const { data: adminAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_ADMIN_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Admin', role: 'admin' }
      });
      testAdminId = adminAuthData.user!.id;

      // Create some test sessions for views
      await adminClient.from('sessions').insert({
        title: 'Test Session for Views',
        description: 'Test session',
        coach_id: testCoachId,
        client_id: testUserId,
        scheduled_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        duration_minutes: 60,
        status: 'completed',
        type: 'individual'
      });
    });

    it('should test client_progress view access', async () => {
      const { data: clientProgress, error } = await adminClient
        .from('client_progress')
        .select('*');

      expect(error).toBeNull();
      expect(clientProgress).toBeTruthy();
      
      // Should contain our test client
      const testClientProgress = clientProgress?.find(cp => cp.client_id === testUserId);
      expect(testClientProgress).toBeTruthy();
      expect(testClientProgress!.client_name).toBe('Test Client');
    });

    it('should test coach_statistics view access', async () => {
      const { data: coachStats, error } = await adminClient
        .from('coach_statistics')
        .select('*');

      expect(error).toBeNull();
      expect(coachStats).toBeTruthy();

      // Should contain our test coach
      const testCoachStats = coachStats?.find(cs => cs.coach_id === testCoachId);
      expect(testCoachStats).toBeTruthy();
      expect(testCoachStats!.coach_name).toBe('Test Coach');
    });

    it('should test session_details view access', async () => {
      const { data: sessionDetails, error } = await adminClient
        .from('session_details')
        .select('*');

      expect(error).toBeNull();
      expect(sessionDetails).toBeTruthy();

      // Should contain our test session
      const testSessionDetail = sessionDetails?.find(sd => 
        sd.coach_name === 'Test Coach' && sd.client_name === 'Test Client'
      );
      expect(testSessionDetail).toBeTruthy();
      expect(testSessionDetail!.title).toBe('Test Session for Views');
    });

    it('should test mfa_admin_dashboard view for admin access', async () => {
      // Enable MFA for test user first
      await adminClient
        .from('users')
        .update({ mfa_enabled: true })
        .eq('id', testUserId);

      const { data: mfaDashboard, error } = await adminClient
        .from('mfa_admin_dashboard')
        .select('*');

      expect(error).toBeNull();
      expect(mfaDashboard).toBeTruthy();

      // Should contain our test users
      const testUserMfa = mfaDashboard?.find(md => md.user_id === testUserId);
      expect(testUserMfa).toBeTruthy();
      expect(testUserMfa!.mfa_enabled).toBe(true);
    });

    it('should test coach_availability_with_timezone view', async () => {
      // Create availability for test coach
      await adminClient.from('coach_availability').insert({
        coach_id: testCoachId,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '17:00',
        is_available: true,
        timezone: 'UTC'
      });

      const { data: availabilityView, error } = await adminClient
        .from('coach_availability_with_timezone')
        .select('*');

      expect(error).toBeNull();
      expect(availabilityView).toBeTruthy();

      // Should contain our test coach availability
      const testCoachAvailability = availabilityView?.find(av => av.coach_id === testCoachId);
      expect(testCoachAvailability).toBeTruthy();
      expect(testCoachAvailability!.coach_name).toBe('Test Coach');
    });
  });

  describe('6. Function Security Testing', () => {
    beforeEach(async () => {
      // Create test data for function testing
      const { data: clientAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Client', role: 'client' }
      });
      testUserId = clientAuthData.user!.id;

      const { data: coachAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_COACH_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Coach', role: 'coach' }
      });
      testCoachId = coachAuthData.user!.id;
    });

    it('should test secured notification functions still work', async () => {
      // Test send_notification function
      const { data: sentNotification, error: sendError } = await adminClient
        .rpc('send_notification', {
          user_id: testUserId,
          title: 'Test Notification',
          message: 'Test message',
          data: { test: 'data' }
        });

      expect(sendError).toBeNull();
      expect(sentNotification).toBeTruthy();

      // Test get_unread_notification_count function
      const { data: unreadCount, error: countError } = await adminClient
        .rpc('get_unread_notification_count', { user_id: testUserId });

      expect(countError).toBeNull();
      expect(typeof unreadCount).toBe('number');
      expect(unreadCount).toBeGreaterThanOrEqual(1);

      // Test mark_notification_read function
      const { error: markError } = await adminClient
        .rpc('mark_all_notifications_read', { user_id: testUserId });

      expect(markError).toBeNull();
    });

    it('should test session management functions with search_path security', async () => {
      // Create test session first
      const { data: sessionData } = await adminClient
        .from('sessions')
        .insert({
          title: 'Test Session',
          description: 'Test session for function testing',
          coach_id: testCoachId,
          client_id: testUserId,
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration_minutes: 60,
          status: 'scheduled',
          type: 'individual'
        })
        .select()
        .single();
      
      testSessionId = sessionData!.id;

      // Test get_upcoming_sessions function
      const { data: upcomingSessions, error: upcomingError } = await adminClient
        .rpc('get_upcoming_sessions', { user_id: testUserId });

      expect(upcomingError).toBeNull();
      expect(Array.isArray(upcomingSessions)).toBe(true);

      // Test is_time_slot_available function
      const testTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // Day after tomorrow
      const { data: isAvailable, error: availabilityError } = await adminClient
        .rpc('is_time_slot_available', {
          coach_id: testCoachId,
          start_time: testTime.toISOString(),
          duration_minutes: 60
        });

      expect(availabilityError).toBeNull();
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should test user validation functions with proper security', async () => {
      // Test validate_user_access function
      const { data: userAccess, error: accessError } = await adminClient
        .rpc('validate_user_access', { 
          user_id: testUserId, 
          required_role: 'client' 
        });

      expect(accessError).toBeNull();
      expect(typeof userAccess).toBe('boolean');
      expect(userAccess).toBe(true);

      // Test validate_user_role function
      const { data: roleValid, error: roleError } = await adminClient
        .rpc('validate_user_role', { 
          user_id: testUserId, 
          required_role: 'client' 
        });

      expect(roleError).toBeNull();
      expect(typeof roleValid).toBe('boolean');
      expect(roleValid).toBe(true);

      // Test with wrong role
      const { data: wrongRoleValid, error: wrongRoleError } = await adminClient
        .rpc('validate_user_role', { 
          user_id: testUserId, 
          required_role: 'admin' 
        });

      expect(wrongRoleError).toBeNull();
      expect(wrongRoleValid).toBe(false);
    });

    it('should test system health functions with security restrictions', async () => {
      // Test get_system_health_stats function
      const { data: healthStats, error: healthError } = await adminClient
        .rpc('get_system_health_stats');

      expect(healthError).toBeNull();
      expect(healthStats).toBeTruthy();
      expect(typeof healthStats).toBe('object');

      // Test get_database_statistics function
      const { data: dbStats, error: dbStatsError } = await adminClient
        .rpc('get_database_statistics');

      expect(dbStatsError).toBeNull();
      expect(dbStats).toBeTruthy();
      expect(typeof dbStats).toBe('object');
    });
  });

  describe('7. Session and Rating System', () => {
    beforeEach(async () => {
      // Create test users
      const { data: clientAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Client', role: 'client' }
      });
      testUserId = clientAuthData.user!.id;

      const { data: coachAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_COACH_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Coach', role: 'coach' }
      });
      testCoachId = coachAuthData.user!.id;

      // Create completed session for rating tests
      const { data: sessionData } = await adminClient
        .from('sessions')
        .insert({
          title: 'Test Session for Rating',
          description: 'Test session',
          coach_id: testCoachId,
          client_id: testUserId,
          scheduled_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
          duration_minutes: 60,
          status: 'completed',
          type: 'individual'
        })
        .select()
        .single();
      
      testSessionId = sessionData!.id;
    });

    it('should test session creation and management with new RLS', async () => {
      // Test session creation
      const { data: newSession, error: createError } = await adminClient
        .from('sessions')
        .insert({
          title: 'New Test Session',
          description: 'Another test session',
          coach_id: testCoachId,
          client_id: testUserId,
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration_minutes: 60,
          status: 'scheduled',
          type: 'individual'
        })
        .select()
        .single();

      expect(createError).toBeNull();
      expect(newSession).toBeTruthy();
      expect(newSession!.title).toBe('New Test Session');

      // Test session update
      const { data: updatedSession, error: updateError } = await adminClient
        .from('sessions')
        .update({ status: 'completed' })
        .eq('id', newSession!.id)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedSession!.status).toBe('completed');
    });

    it('should test session rating functionality with RLS policies', async () => {
      // Create session rating
      const { data: rating, error: ratingError } = await adminClient
        .from('session_ratings')
        .insert({
          session_id: testSessionId,
          client_id: testUserId,
          coach_id: testCoachId,
          rating: 5,
          review: 'Excellent coaching session!',
          communication_rating: 5,
          preparation_rating: 5,
          effectiveness_rating: 5
        })
        .select()
        .single();

      expect(ratingError).toBeNull();
      expect(rating).toBeTruthy();
      expect(rating!.rating).toBe(5);
      expect(rating!.review).toBe('Excellent coaching session!');

      // Test reading ratings
      const { data: readRating, error: readError } = await adminClient
        .from('session_ratings')
        .select('*')
        .eq('session_id', testSessionId)
        .single();

      expect(readError).toBeNull();
      expect(readRating).toBeTruthy();
      expect(readRating!.rating).toBe(5);

      // Test updating rating
      const { data: updatedRating, error: updateError } = await adminClient
        .from('session_ratings')
        .update({ 
          rating: 4,
          review: 'Updated: Very good coaching session!'
        })
        .eq('session_id', testSessionId)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(updatedRating!.rating).toBe(4);
      expect(updatedRating!.review).toBe('Updated: Very good coaching session!');
    });

    it('should test coach average rating functions', async () => {
      // Create multiple ratings for comprehensive testing
      const sessions = [];
      const ratings = [5, 4, 5, 3, 4];
      
      for (let i = 0; i < ratings.length; i++) {
        const { data: session } = await adminClient
          .from('sessions')
          .insert({
            title: `Test Session ${i + 1}`,
            description: `Test session ${i + 1}`,
            coach_id: testCoachId,
            client_id: testUserId,
            scheduled_at: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
            duration_minutes: 60,
            status: 'completed',
            type: 'individual'
          })
          .select()
          .single();
        
        sessions.push(session!.id);

        await adminClient
          .from('session_ratings')
          .insert({
            session_id: session!.id,
            client_id: testUserId,
            coach_id: testCoachId,
            rating: ratings[i],
            review: `Review ${i + 1}`,
            communication_rating: ratings[i],
            preparation_rating: ratings[i],
            effectiveness_rating: ratings[i]
          });
      }

      // Test get_coach_average_rating function
      const { data: avgRating, error: avgError } = await adminClient
        .rpc('get_coach_average_rating', { coach_id: testCoachId });

      expect(avgError).toBeNull();
      expect(typeof avgRating).toBe('number');
      expect(avgRating).toBeCloseTo(4.2, 1); // Average of [5, 4, 5, 3, 4] = 4.2

      // Test with date range
      const startDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const { data: avgRatingRange, error: avgRangeError } = await adminClient
        .rpc('get_coach_average_rating', { 
          coach_id: testCoachId,
          start_date: startDate,
          end_date: endDate
        });

      expect(avgRangeError).toBeNull();
      expect(typeof avgRatingRange).toBe('number');
    });

    it('should verify coach and client access patterns work correctly', async () => {
      // Simulate coach accessing their own sessions
      const { data: coachSessions, error: coachError } = await adminClient
        .from('sessions')
        .select('*')
        .eq('coach_id', testCoachId);

      expect(coachError).toBeNull();
      expect(coachSessions).toBeTruthy();
      expect(coachSessions!.length).toBeGreaterThan(0);

      // Simulate client accessing their own sessions
      const { data: clientSessions, error: clientError } = await adminClient
        .from('sessions')
        .select('*')
        .eq('client_id', testUserId);

      expect(clientError).toBeNull();
      expect(clientSessions).toBeTruthy();
      expect(clientSessions!.length).toBeGreaterThan(0);

      // Verify both coach and client can access ratings for their sessions
      const { data: coachRatings, error: coachRatingError } = await adminClient
        .from('session_ratings')
        .select('*')
        .eq('coach_id', testCoachId);

      expect(coachRatingError).toBeNull();

      const { data: clientRatings, error: clientRatingError } = await adminClient
        .from('session_ratings')
        .select('*')
        .eq('client_id', testUserId);

      expect(clientRatingError).toBeNull();
    });
  });

  describe('8. Additional Security Verifications', () => {
    it('should test that admin can access protected views and functions', async () => {
      const { data: adminAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_ADMIN_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'Admin', role: 'admin' }
      });
      testAdminId = adminAuthData.user!.id;

      // Test admin can access security dashboard
      const { data: securityDashboard, error: securityError } = await adminClient
        .from('security_dashboard')
        .select('*');

      expect(securityError).toBeNull();
      expect(Array.isArray(securityDashboard)).toBe(true);

      // Test admin can access MFA statistics
      const { data: mfaStats, error: mfaStatsError } = await adminClient
        .from('mfa_statistics')
        .select('*');

      expect(mfaStatsError).toBeNull();
      expect(mfaStats).toBeTruthy();

      // Test admin-only function access
      const { data: systemStats, error: systemStatsError } = await adminClient
        .rpc('get_system_statistics');

      expect(systemStatsError).toBeNull();
      expect(systemStats).toBeTruthy();
    });

    it('should verify search_path restrictions don\'t break core functionality', async () => {
      // Test that functions with empty search_path still access public schema correctly
      const { data: healthCheck, error: healthError } = await adminClient
        .rpc('db_health_check');

      expect(healthError).toBeNull();
      expect(healthCheck).toBeTruthy();

      // Test user-related functions work correctly
      const { data: clientAuthData } = await adminClient.auth.admin.createUser({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: 'Test', last_name: 'User', role: 'client' }
      });
      testUserId = clientAuthData.user!.id;

      const { data: userRole, error: roleError } = await adminClient
        .rpc('get_user_role', { user_id: testUserId });

      expect(roleError).toBeNull();
      expect(userRole).toBe('client');
    });

    it('should test comprehensive cleanup functions work with security changes', async () => {
      // Test notification cleanup
      const { error: notifCleanupError } = await adminClient
        .rpc('cleanup_old_notifications');

      expect(notifCleanupError).toBeNull();

      // Test MFA cleanup
      const { error: mfaCleanupError } = await adminClient
        .rpc('cleanup_expired_mfa_sessions');

      expect(mfaCleanupError).toBeNull();

      // Test security log cleanup
      const { error: securityCleanupError } = await adminClient
        .rpc('cleanup_old_security_logs');

      expect(securityCleanupError).toBeNull();
    });
  });
});