-- Seed data for development/testing
-- This creates a test coach with sessions and clients

-- NOTE: This script is for development only and should NOT be run in production
-- Run this with: psql $DATABASE_URL -f supabase/seed.sql

BEGIN;

-- Insert test users (coach and clients)
-- Note: These users must first be created in Supabase Auth
-- You can create them via the Supabase dashboard or signup flow

-- Example coach user
-- UUID: 00000000-0000-0000-0000-000000000001
INSERT INTO public.users (id, email, role, first_name, last_name, phone, language, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'coach@example.com', 'coach', 'Sarah', 'Johnson', '+1234567890', 'en', 'active')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- Example client users
INSERT INTO public.users (id, email, role, first_name, last_name, phone, language, status)
VALUES
  ('00000000-0000-0000-0000-000000000002', 'client1@example.com', 'client', 'John', 'Doe', '+1234567891', 'en', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'client2@example.com', 'client', 'Jane', 'Smith', '+1234567892', 'en', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'client3@example.com', 'client', 'Mike', 'Wilson', '+1234567893', 'en', 'active')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- Insert sample sessions
INSERT INTO public.sessions (coach_id, client_id, title, description, scheduled_at, duration_minutes, status, meeting_url)
VALUES
  -- Completed sessions
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Initial Consultation', 'First meeting to understand goals', NOW() - INTERVAL '7 days', 60, 'completed', 'https://meet.example.com/session1'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Progress Check-in', 'Review progress and adjust plan', NOW() - INTERVAL '5 days', 45, 'completed', 'https://meet.example.com/session2'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Follow-up Session', 'Continue working on goals', NOW() - INTERVAL '3 days', 60, 'completed', 'https://meet.example.com/session3'),

  -- Upcoming scheduled sessions
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Weekly Check-in', 'Regular weekly session', NOW() + INTERVAL '2 hours', 60, 'scheduled', 'https://meet.example.com/session4'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Goal Setting', 'Set new quarterly goals', NOW() + INTERVAL '1 day', 60, 'scheduled', 'https://meet.example.com/session5'),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'Initial Consultation', 'First meeting with new client', NOW() + INTERVAL '2 days', 60, 'scheduled', 'https://meet.example.com/session6')
ON CONFLICT (id) DO NOTHING;

-- Insert sample reflections for completed sessions
INSERT INTO public.reflections (client_id, session_id, content, mood_rating, insights, goals_for_next_session)
SELECT
  s.client_id,
  s.id,
  'Great session today. Made significant progress on my goals.',
  8,
  'I learned new strategies for managing stress and staying focused.',
  'Continue practicing mindfulness techniques and track daily progress'
FROM public.sessions s
WHERE s.status = 'completed' AND s.coach_id = '00000000-0000-0000-0000-000000000001'
LIMIT 2
ON CONFLICT (id) DO NOTHING;

-- Insert sample coach notes
INSERT INTO public.coach_notes (coach_id, client_id, session_id, title, content, privacy_level, tags)
SELECT
  s.coach_id,
  s.client_id,
  s.id,
  'Session Notes - ' || s.title,
  'Client showed great engagement. Key topics discussed: goals, challenges, action items. Follow-up needed on previous action items.',
  'private',
  ARRAY['progress', 'goals', 'action-items']
FROM public.sessions s
WHERE s.status = 'completed' AND s.coach_id = '00000000-0000-0000-0000-000000000001'
LIMIT 2
ON CONFLICT (id) DO NOTHING;

-- Insert sample task categories
INSERT INTO public.task_categories (id, coach_id, label, color_hex)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Accountability', '#1D7A85'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'Wellness', '#4FA3C4')
ON CONFLICT (id) DO UPDATE SET
  coach_id = EXCLUDED.coach_id,
  label = EXCLUDED.label,
  color_hex = EXCLUDED.color_hex;

-- Insert sample tasks
INSERT INTO public.tasks (
  id,
  coach_id,
  client_id,
  category_id,
  title,
  description,
  priority,
  status,
  visibility_to_coach,
  due_date,
  recurrence_rule,
  archived_at
)
VALUES
  (
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'Complete reflection worksheet',
    'Finish the weekly reflection worksheet and share highlights before the next session.',
    'MEDIUM',
    'IN_PROGRESS',
    true,
    NOW() + INTERVAL '2 days',
    NULL,
    NULL
  ),
  (
    'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    '22222222-2222-2222-2222-222222222222',
    'Daily mindfulness practice',
    'Spend 10 minutes each morning practicing guided breathing. Mark progress every few days.',
    'HIGH',
    'PENDING',
    true,
    NOW() + INTERVAL '1 day',
    '{"frequency":"DAILY","interval":1,"startDate":"' || TO_CHAR(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS".000Z"') || '","rrule":"FREQ=DAILY"}'::jsonb,
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  visibility_to_coach = EXCLUDED.visibility_to_coach,
  due_date = EXCLUDED.due_date,
  recurrence_rule = EXCLUDED.recurrence_rule;

-- Insert sample task instances
INSERT INTO public.task_instances (
  id,
  task_id,
  scheduled_date,
  due_date,
  status,
  completion_percentage,
  completed_at
)
VALUES
  (
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaa1111',
    'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '2 days',
    'IN_PROGRESS',
    40,
    NULL
  ),
  (
    'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbb2222',
    'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    NOW(),
    NOW() + INTERVAL '1 day',
    'PENDING',
    0,
    NULL
  ),
  (
    'bbbb3333-bbbb-bbbb-bbbb-bbbbbbbb3333',
    'bbbbbbb2-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '2 days',
    'PENDING',
    0,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample progress update
INSERT INTO public.task_progress_updates (
  id,
  task_instance_id,
  author_id,
  percentage,
  note,
  is_visible_to_coach
)
VALUES
  (
    'cccc4444-cccc-cccc-cccc-cccccccc4444',
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaa1111',
    '00000000-0000-0000-0000-000000000002',
    40,
    'Completed the first section of the worksheet and drafted answers for the second.',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  percentage = EXCLUDED.percentage,
  note = EXCLUDED.note,
  is_visible_to_coach = EXCLUDED.is_visible_to_coach;

-- Insert sample attachment metadata
INSERT INTO public.task_attachments (
  id,
  task_instance_id,
  progress_update_id,
  file_url,
  file_name,
  file_size,
  mime_type,
  uploaded_by_id
)
VALUES
  (
    'dddd5555-dddd-dddd-dddd-dddddddd5555',
    'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaa1111',
    'cccc4444-cccc-cccc-cccc-cccccccc4444',
    'https://files.example.com/tasks/reflection-notes.pdf',
    'reflection-notes.pdf',
    204800,
    'application/pdf',
    '00000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO UPDATE SET
  file_url = EXCLUDED.file_url,
  file_name = EXCLUDED.file_name,
  file_size = EXCLUDED.file_size,
  mime_type = EXCLUDED.mime_type;

-- Insert sample notification job
INSERT INTO public.task_notification_jobs (
  id,
  task_instance_id,
  type,
  status,
  scheduled_at,
  sent_at,
  payload
)
VALUES
  (
    'eeee6666-eeee-eeee-eeee-eeeeeeee6666',
    'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbb2222',
    'UPCOMING_DUE',
    'SCHEDULED',
    NOW() + INTERVAL '12 hours',
    NULL,
    '{"message":"Reminder: Mindfulness practice is due tomorrow"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  scheduled_at = EXCLUDED.scheduled_at,
  payload = EXCLUDED.payload;

-- Insert sample export log
INSERT INTO public.task_export_logs (
  id,
  coach_id,
  client_id,
  generated_at,
  file_url,
  filters
)
VALUES
  (
    'ffff7777-ffff-ffff-ffff-ffffffff7777',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    NOW() - INTERVAL '1 day',
    'https://files.example.com/exports/client-task-summary.pdf',
    '{"range":{"from":"2025-01-01","to":"2025-02-01"}}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  generated_at = EXCLUDED.generated_at,
  file_url = EXCLUDED.file_url,
  filters = EXCLUDED.filters;

-- Update last_seen_at for active users
UPDATE public.users
SET last_seen_at = NOW()
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
);

COMMIT;

-- Display summary
SELECT 'Seed data created successfully!' as message;
SELECT 'Coach: ' || email || ' (ID: ' || id || ')' as coach_info
FROM public.users
WHERE id = '00000000-0000-0000-0000-000000000001';

SELECT 'Total sessions: ' || COUNT(*)::text as sessions_count
FROM public.sessions
WHERE coach_id = '00000000-0000-0000-0000-000000000001';

SELECT 'Completed sessions: ' || COUNT(*)::text as completed_count
FROM public.sessions
WHERE coach_id = '00000000-0000-0000-0000-000000000001' AND status = 'completed';

SELECT 'Upcoming sessions: ' || COUNT(*)::text as upcoming_count
FROM public.sessions
WHERE coach_id = '00000000-0000-0000-0000-000000000001' AND status = 'scheduled';