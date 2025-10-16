#!/usr/bin/env tsx
/**
 * @fileoverview Staging data seeding utility. The script provisions a small set
 * of representative coaches, clients, sessions, and tasks so the staging
 * environment mirrors the product stories exercised during launch readiness
 * reviews.
 *
 * Run via `npm run seed:staging` after exporting the production-equivalent
 * Supabase credentials (URL + service role key). The script is idempotent and
 * safe to re-run — upserts rely on stable identifiers so repeated executions
 * only refresh the staged records.
 */

import { createClient } from '@supabase/supabase-js';

import { serverEnv } from '@/env/server';
import type { Database, Json } from '@/types/supabase';

type SupabaseDatabase = Database['public'];
type UserRole = SupabaseDatabase['Enums']['user_role'];
type Language = SupabaseDatabase['Enums']['language'];
type TaskPriority = SupabaseDatabase['Enums']['task_priority'];
type TaskStatus = SupabaseDatabase['Enums']['task_status'];
type SessionStatus = SupabaseDatabase['Enums']['session_status'];

type AdminClient = ReturnType<typeof createClient<Database>>;

interface SeedUser {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  language: Language;
  phone?: string;
  timezone?: string;
}

interface SessionSeed {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionStatus;
  meetingUrl: string | null;
  coachEmail: string;
  clientEmail: string;
}

interface TaskCategorySeed {
  id: string;
  label: string;
  colorHex: string;
  coachEmail: string;
}

interface TaskSeed {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  visibilityToCoach: boolean;
  categoryId?: string;
  coachEmail: string;
  clientEmail: string;
  recurrenceRule?: Json | null;
}

interface SeedContext {
  client: AdminClient;
  userIdsByEmail: Map<string, string>;
}

const seedUsers: SeedUser[] = [
  {
    email: 'coach.staging@loom-app.com',
    password: 'CoachLaunch!2025',
    role: 'coach',
    firstName: 'Liora',
    lastName: 'Ben-David',
    language: 'en',
    phone: '+1-555-010-2001',
    timezone: 'America/New_York',
  },
  {
    email: 'client.one@loom-app.com',
    password: 'ClientLaunch!2025',
    role: 'client',
    firstName: 'Noam',
    lastName: 'Shalev',
    language: 'he',
    phone: '+972-55-123-4567',
    timezone: 'Asia/Jerusalem',
  },
  {
    email: 'client.two@loom-app.com',
    password: 'ClientLaunch!2025',
    role: 'client',
    firstName: 'Ava',
    lastName: 'Martinez',
    language: 'en',
    phone: '+44-20-7946-0958',
    timezone: 'Europe/London',
  },
];

const sessionSeeds = (now: Date): SessionSeed[] => [
  {
    id: '1f3b3ce4-566b-4a9d-b1df-3e9d8ad27c10',
    title: 'Launch Readiness Kickoff',
    description:
      'Review onboarding goals and confirm success criteria ahead of beta rollout.',
    scheduledAt: new Date(
      now.getTime() - 5 * 24 * 60 * 60 * 1000
    ).toISOString(),
    durationMinutes: 60,
    status: 'completed',
    meetingUrl: 'https://meet.example.com/launch-kickoff',
    coachEmail: 'coach.staging@loom-app.com',
    clientEmail: 'client.one@loom-app.com',
  },
  {
    id: '6a9e08e2-1901-49bd-b1ba-1a21f2d06465',
    title: 'Progress Coaching Session',
    description:
      'Deep dive into accountability rituals and adjust weekly action items.',
    scheduledAt: new Date(
      now.getTime() - 2 * 24 * 60 * 60 * 1000
    ).toISOString(),
    durationMinutes: 45,
    status: 'completed',
    meetingUrl: 'https://meet.example.com/progress-session',
    coachEmail: 'coach.staging@loom-app.com',
    clientEmail: 'client.two@loom-app.com',
  },
  {
    id: '79c6d1dc-02b5-4c74-9c40-f2c1846dd4a9',
    title: 'Weekly Planning Call',
    description:
      'Collaboratively plan the next sprint, align on blockers, and confirm KPIs.',
    scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    durationMinutes: 60,
    status: 'scheduled',
    meetingUrl: 'https://meet.example.com/weekly-planning',
    coachEmail: 'coach.staging@loom-app.com',
    clientEmail: 'client.one@loom-app.com',
  },
];

const taskCategorySeeds: TaskCategorySeed[] = [
  {
    id: 'b3bd6d6e-8db7-4bdb-a220-8590f0c9c5da',
    label: 'Accountability',
    colorHex: '#1D7A85',
    coachEmail: 'coach.staging@loom-app.com',
  },
  {
    id: 'c7b2a3cb-3f95-4b70-b908-0d6600bc4326',
    label: 'Wellness',
    colorHex: '#F97316',
    coachEmail: 'coach.staging@loom-app.com',
  },
];

const taskSeeds = (now: Date): TaskSeed[] => [
  {
    id: '5f0f7fd7-9f36-4c02-9c76-6d7c79a22e54',
    title: 'Publish weekly accountability recap',
    description:
      'Summarize wins and blockers in Loom before the Monday sync to keep all stakeholders aligned.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    visibilityToCoach: true,
    categoryId: 'b3bd6d6e-8db7-4bdb-a220-8590f0c9c5da',
    coachEmail: 'coach.staging@loom-app.com',
    clientEmail: 'client.one@loom-app.com',
  },
  {
    id: '9c3f0c35-4a6a-4f3a-9d09-1a6df7cb30d3',
    title: 'Complete resilience micro-course',
    description:
      'Finish the 4-part resilience curriculum and log reflections for each module.',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    visibilityToCoach: true,
    categoryId: 'c7b2a3cb-3f95-4b70-b908-0d6600bc4326',
    coachEmail: 'coach.staging@loom-app.com',
    clientEmail: 'client.two@loom-app.com',
    recurrenceRule: {
      frequency: 'WEEKLY',
      interval: 1,
      startDate: now.toISOString(),
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    } as Json,
  },
];

const logSection = (title: string) => {
  console.info(`\n—— ${title} ——`);
};

const validateEnv = () => {
  if (!serverEnv.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is required to seed staging data.'
    );
  }

  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY must be set to run the staging seed.'
    );
  }
};

const createAdminClient = (): AdminClient => {
  return createClient<Database>(
    serverEnv.NEXT_PUBLIC_SUPABASE_URL!,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

const ensureUser = async (
  context: SeedContext,
  user: SeedUser
): Promise<string> => {
  const existing = await context.client
    .from('users')
    .select('id')
    .eq('email', user.email)
    .maybeSingle();

  if (existing.data?.id) {
    console.info(`ℹ️  User already exists for ${user.email}`);
    context.userIdsByEmail.set(user.email, existing.data.id);
    return existing.data.id;
  }

  console.info(`➕ Creating auth user for ${user.email}`);
  const created = await context.client.auth.admin.createUser({
    email: user.email,
    email_confirm: true,
    password: user.password,
    user_metadata: {
      role: user.role,
      language: user.language,
    },
  });

  if (created.error || !created.data.user) {
    throw new Error(
      `Failed to create auth user for ${user.email}: ${created.error?.message}`
    );
  }

  const userId = created.data.user.id;

  const upsertPayload = {
    id: userId,
    email: user.email,
    role: user.role,
    first_name: user.firstName,
    last_name: user.lastName,
    language: user.language,
    status: 'active' as SupabaseDatabase['Enums']['user_status'],
    phone: user.phone ?? null,
    timezone: user.timezone ?? null,
  } satisfies SupabaseDatabase['Tables']['users']['Insert'];

  const upsertResult = await context.client
    .from('users')
    .upsert(upsertPayload, { onConflict: 'id' })
    .select('id')
    .single();

  if (upsertResult.error) {
    throw new Error(
      `Failed to upsert user profile for ${user.email}: ${upsertResult.error.message}`
    );
  }

  if (user.role === 'coach') {
    const coachProfilePayload = {
      coach_id: userId,
      session_rate: 150,
      currency: 'USD',
      timezone: user.timezone ?? 'UTC',
      languages: [user.language],
      specializations: ['Leadership', 'Productivity'],
      experience_years: 8,
    } satisfies SupabaseDatabase['Tables']['coach_profiles']['Insert'];

    const coachProfileResult = await context.client
      .from('coach_profiles')
      .upsert(coachProfilePayload, { onConflict: 'coach_id' });

    if (coachProfileResult.error) {
      throw new Error(
        `Failed to seed coach profile for ${user.email}: ${coachProfileResult.error.message}`
      );
    }
  }

  context.userIdsByEmail.set(user.email, userId);
  return userId;
};

const upsertTaskCategories = async (context: SeedContext) => {
  logSection('Task Categories');

  for (const category of taskCategorySeeds) {
    const coachId = context.userIdsByEmail.get(category.coachEmail);

    if (!coachId) {
      console.warn(`⚠️  Skipping category ${category.label}; coach not found.`);
      continue;
    }

    const payload = {
      id: category.id,
      coach_id: coachId,
      label: category.label,
      color_hex: category.colorHex,
    } satisfies SupabaseDatabase['Tables']['task_categories']['Insert'];

    const result = await context.client
      .from('task_categories')
      .upsert(payload, { onConflict: 'id' });

    if (result.error) {
      throw new Error(
        `Failed to upsert task category ${category.label}: ${result.error.message}`
      );
    }
  }
};

const upsertSessions = async (context: SeedContext, now: Date) => {
  logSection('Sessions');

  for (const session of sessionSeeds(now)) {
    const coachId = context.userIdsByEmail.get(session.coachEmail);
    const clientId = context.userIdsByEmail.get(session.clientEmail);

    if (!coachId || !clientId) {
      console.warn(
        `⚠️  Skipping session ${session.title}; missing coach/client.`
      );
      continue;
    }

    const payload = {
      id: session.id,
      coach_id: coachId,
      client_id: clientId,
      title: session.title,
      description: session.description,
      scheduled_at: session.scheduledAt,
      duration_minutes: session.durationMinutes,
      status: session.status,
      meeting_url: session.meetingUrl,
    } satisfies SupabaseDatabase['Tables']['sessions']['Insert'];

    const result = await context.client
      .from('sessions')
      .upsert(payload, { onConflict: 'id' });

    if (result.error) {
      throw new Error(
        `Failed to upsert session ${session.title}: ${result.error.message}`
      );
    }
  }
};

const upsertTasks = async (context: SeedContext, now: Date) => {
  logSection('Tasks');

  for (const task of taskSeeds(now)) {
    const coachId = context.userIdsByEmail.get(task.coachEmail);
    const clientId = context.userIdsByEmail.get(task.clientEmail);

    if (!coachId || !clientId) {
      console.warn(`⚠️  Skipping task ${task.title}; missing coach/client.`);
      continue;
    }

    const payload = {
      id: task.id,
      coach_id: coachId,
      client_id: clientId,
      category_id: task.categoryId ?? null,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      visibility_to_coach: task.visibilityToCoach,
      due_date: task.dueDate,
      recurrence_rule: task.recurrenceRule ?? null,
    } satisfies SupabaseDatabase['Tables']['tasks']['Insert'];

    const result = await context.client
      .from('tasks')
      .upsert(payload, { onConflict: 'id' });

    if (result.error) {
      throw new Error(
        `Failed to upsert task ${task.title}: ${result.error.message}`
      );
    }
  }
};

const seed = async () => {
  validateEnv();

  const client = createAdminClient();
  const context: SeedContext = {
    client,
    userIdsByEmail: new Map(),
  };

  logSection('Users');
  for (const user of seedUsers) {
    await ensureUser(context, user);
  }

  const now = new Date();
  await upsertTaskCategories(context);
  await upsertSessions(context, now);
  await upsertTasks(context, now);

  logSection('Summary');
  console.info(`Seeded ${context.userIdsByEmail.size} users.`);
  console.info('Task categories, sessions, and tasks refreshed successfully.');
};

seed()
  .then(() => {
    console.info('\n✅ Staging seed completed.');
  })
  .catch(error => {
    console.error('\n❌ Staging seed failed:', error);
    process.exitCode = 1;
  });
