import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  TestUser, 
  TestSession, 
  TestAvailability, 
  TestReflection, 
  TestNote,
  testFixtures
} from './test-data';
import { CreatedTestUser } from './user-manager';

export interface DatabaseManagerConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
  databaseUrl: string;
}

/**
 * Manages test database operations
 * Handles seeding, cleanup, and test data management
 */
export class TestDatabaseManager {
  private supabase: SupabaseClient;
  private config: DatabaseManagerConfig;

  constructor(config: DatabaseManagerConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Connect to the database
   */
  async connect(): Promise<void> {
    try {
      // Test Supabase connection
      const { data, error } = await this.supabase.from('users').select('count').limit(1);
      if (error) {
        throw new Error(`Supabase connection failed: ${error.message}`);
      }

      console.log('✅ Database connection established');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Disconnect from the database
   */
  async disconnect(): Promise<void> {
    // No cleanup needed for Supabase client
    console.log('✅ Database disconnected');
  }

  /**
   * Clean up all test data
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up test data...');

    try {
      // Clean up in reverse dependency order to avoid foreign key constraints
      const tables = [
        'reflections',
        'coach_notes',
        'notifications',
        'coach_availability',
        'sessions',
        'users', // Note: This will be handled by auth cleanup
      ];

      for (const table of tables) {
        try {
          if (table === 'users') {
            // Delete test users (identified by test email patterns)
            const { error } = await this.supabase
              .from(table)
              .delete()
              .like('email', '%@example.com');
            
            if (error && !error.message.includes('No rows')) {
              console.warn(`Warning cleaning ${table}:`, error.message);
            }
          } else {
            // For other tables, delete all data (since this is a test environment)
            const { error } = await this.supabase
              .from(table)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible ID
            
            if (error && !error.message.includes('No rows')) {
              console.warn(`Warning cleaning ${table}:`, error.message);
            }
          }
        } catch (error) {
          console.warn(`Warning cleaning ${table}:`, error);
        }
      }

      console.log('✅ Database cleanup completed');
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Seed the database with test data
   */
  async seedDatabase(): Promise<void> {
    console.log('🌱 Seeding test database...');

    try {
      // Seed in dependency order
      await this.resetSequences();
      console.log('✅ Database sequences reset');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Create test fixtures after users are created
   */
  async createTestFixtures(fixtures: typeof testFixtures, createdUsers: CreatedTestUser[]): Promise<void> {
    console.log('📊 Creating test fixtures...');

    try {
      // Create a map of email to user ID for easy lookup
      const userMap = new Map<string, string>();
      createdUsers.forEach(user => {
        userMap.set(user.email, user.id);
      });

      // Create coach availability
      await this.createCoachAvailability(fixtures.availability, userMap);

      // Create sessions
      await this.createSessions(fixtures.sessions, userMap);

      // Create reflections
      await this.createReflections(fixtures.reflections, userMap);

      // Create coach notes
      await this.createCoachNotes(fixtures.notes, userMap);

      console.log('✅ Test fixtures created successfully');
    } catch (error) {
      console.error('❌ Failed to create test fixtures:', error);
      throw error;
    }
  }

  /**
   * Create coach availability records
   */
  private async createCoachAvailability(availability: TestAvailability[], userMap: Map<string, string>): Promise<void> {
    const availabilityRecords = availability.map(avail => {
      const coachId = userMap.get(avail.coachEmail);
      if (!coachId) {
        throw new Error(`Coach not found: ${avail.coachEmail}`);
      }

      return {
        coach_id: coachId,
        day_of_week: avail.dayOfWeek,
        start_time: avail.startTime,
        end_time: avail.endTime,
        is_available: true,
        timezone: avail.timezone,
      };
    });

    const { error } = await this.supabase
      .from('coach_availability')
      .insert(availabilityRecords);

    if (error) {
      throw new Error(`Failed to create coach availability: ${error.message}`);
    }

    console.log(`✅ Created ${availabilityRecords.length} availability records`);
  }

  /**
   * Create test sessions
   */
  private async createSessions(sessions: TestSession[], userMap: Map<string, string>): Promise<void> {
    const sessionRecords = sessions.map(session => {
      const coachId = userMap.get(session.coachEmail);
      const clientId = userMap.get(session.clientEmail);

      if (!coachId) {
        throw new Error(`Coach not found: ${session.coachEmail}`);
      }
      if (!clientId) {
        throw new Error(`Client not found: ${session.clientEmail}`);
      }

      return {
        coach_id: coachId,
        client_id: clientId,
        title: session.title,
        description: session.description,
        scheduled_at: session.scheduledAt.toISOString(),
        duration_minutes: session.duration_minutes,
        status: session.status,
        meeting_url: `https://meet.example.com/session-${Date.now()}`,
      };
    });

    const { error } = await this.supabase
      .from('sessions')
      .insert(sessionRecords);

    if (error) {
      throw new Error(`Failed to create sessions: ${error.message}`);
    }

    console.log(`✅ Created ${sessionRecords.length} session records`);
  }

  /**
   * Create test reflections
   */
  private async createReflections(reflections: TestReflection[], userMap: Map<string, string>): Promise<void> {
    const reflectionRecords = reflections.map(reflection => {
      const clientId = userMap.get(reflection.clientEmail);
      if (!clientId) {
        throw new Error(`Client not found: ${reflection.clientEmail}`);
      }

      return {
        client_id: clientId,
        content: reflection.content,
        mood_rating: reflection.moodRating,
        insights: reflection.insights,
        goals_for_next_session: reflection.goalsForNextSession,
      };
    });

    const { error } = await this.supabase
      .from('reflections')
      .insert(reflectionRecords);

    if (error) {
      throw new Error(`Failed to create reflections: ${error.message}`);
    }

    console.log(`✅ Created ${reflectionRecords.length} reflection records`);
  }

  /**
   * Create test coach notes
   */
  private async createCoachNotes(notes: TestNote[], userMap: Map<string, string>): Promise<void> {
    const noteRecords = notes.map(note => {
      const coachId = userMap.get(note.coachEmail);
      const clientId = userMap.get(note.clientEmail);

      if (!coachId) {
        throw new Error(`Coach not found: ${note.coachEmail}`);
      }
      if (!clientId) {
        throw new Error(`Client not found: ${note.clientEmail}`);
      }

      return {
        coach_id: coachId,
        client_id: clientId,
        title: note.title,
        content: note.content,
        privacy_level: note.privacyLevel,
        tags: note.tags || [],
      };
    });

    const { error } = await this.supabase
      .from('coach_notes')
      .insert(noteRecords);

    if (error) {
      throw new Error(`Failed to create coach notes: ${error.message}`);
    }

    console.log(`✅ Created ${noteRecords.length} coach note records`);
  }

  /**
   * Reset database sequences to ensure consistent IDs
   */
  private async resetSequences(): Promise<void> {
    // For UUID-based tables, no sequences need to be reset
    console.log('Database sequences reset (UUID-based tables)');
  }

  /**
   * Verify database schema is correct
   */
  async verifySchema(): Promise<boolean> {
    try {
      const requiredTables = [
        'users',
        'sessions',
        'coach_availability',
        'coach_notes',
        'reflections',
        'notifications',
      ];

      for (const table of requiredTables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(0);

        if (error) {
          console.error(`Table ${table} not accessible:`, error);
          return false;
        }
      }

      console.log('✅ Database schema verification passed');
      return true;
    } catch (error) {
      console.error('❌ Database schema verification failed:', error);
      return false;
    }
  }

  /**
   * Get test statistics
   */
  async getTestStatistics(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};

    const tables = ['users', 'sessions', 'coach_availability', 'coach_notes', 'reflections', 'notifications'];

    for (const table of tables) {
      try {
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.warn(`Could not get count for ${table}:`, error);
          stats[table] = -1;
        } else {
          stats[table] = count || 0;
        }
      } catch (error) {
        console.warn(`Error getting stats for ${table}:`, error);
        stats[table] = -1;
      }
    }

    return stats;
  }

  /**
   * Execute custom SQL for advanced test scenarios using Supabase RPC
   */
  async executeSQL(functionName: string, params: any = {}): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc(functionName, params);
      if (error) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }
      return data;
    } catch (error) {
      console.error('SQL execution error:', error);
      throw error;
    }
  }

  /**
   * Backup test data for restoration
   */
  async backupTestData(): Promise<any> {
    const backup: any = {};
    const tables = ['users', 'sessions', 'coach_availability', 'coach_notes', 'reflections'];

    for (const table of tables) {
      const { data, error } = await this.supabase
        .from(table)
        .select('*');

      if (error) {
        console.warn(`Could not backup ${table}:`, error);
      } else {
        backup[table] = data;
      }
    }

    return backup;
  }

  /**
   * Restore test data from backup
   */
  async restoreTestData(backup: any): Promise<void> {
    // First cleanup existing data
    await this.cleanup();

    // Restore data in dependency order
    const tables = ['users', 'coach_availability', 'sessions', 'coach_notes', 'reflections'];

    for (const table of tables) {
      if (backup[table] && backup[table].length > 0) {
        const { error } = await this.supabase
          .from(table)
          .insert(backup[table]);

        if (error) {
          console.error(`Failed to restore ${table}:`, error);
        } else {
          console.log(`✅ Restored ${backup[table].length} records to ${table}`);
        }
      }
    }
  }
}