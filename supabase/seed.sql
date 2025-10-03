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