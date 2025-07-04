-- Seed data for development and testing

-- Insert sample users (these will be created when users register, but we can add some test data)
-- Note: In production, users are created through Supabase Auth, this is just for testing

-- First, let's create some test auth users (this would normally be done through Supabase Auth)
-- For local development, we'll insert directly into auth.users (not recommended for production)

-- Insert sample coaches
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
) VALUES 
  (
    '01234567-0123-0123-0123-012345678901',
    'coach1@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"first_name": "Sarah", "last_name": "Cohen"}',
    '{"role": "coach"}'
  ),
  (
    '01234567-0123-0123-0123-012345678902',
    'coach2@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"first_name": "David", "last_name": "Levi"}',
    '{"role": "coach"}'
  );

-- Insert sample clients
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
) VALUES 
  (
    '01234567-0123-0123-0123-012345678903',
    'client1@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"first_name": "Rachel", "last_name": "Goldberg"}',
    '{"role": "client"}'
  ),
  (
    '01234567-0123-0123-0123-012345678904',
    'client2@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"first_name": "Michael", "last_name": "Ben-David"}',
    '{"role": "client"}'
  ),
  (
    '01234567-0123-0123-0123-012345678905',
    'client3@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"first_name": "Maya", "last_name": "Rosen"}',
    '{"role": "client"}'
  );

-- Insert admin user
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
) VALUES 
  (
    '01234567-0123-0123-0123-012345678900',
    'admin@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"first_name": "Admin", "last_name": "User"}',
    '{"role": "admin"}'
  );

-- Now insert corresponding public.users records
INSERT INTO public.users (id, email, role, first_name, last_name, language, status) VALUES
  ('01234567-0123-0123-0123-012345678900', 'admin@example.com', 'admin', 'Admin', 'User', 'en', 'active'),
  ('01234567-0123-0123-0123-012345678901', 'coach1@example.com', 'coach', 'Sarah', 'Cohen', 'he', 'active'),
  ('01234567-0123-0123-0123-012345678902', 'coach2@example.com', 'coach', 'David', 'Levi', 'en', 'active'),
  ('01234567-0123-0123-0123-012345678903', 'client1@example.com', 'client', 'Rachel', 'Goldberg', 'he', 'active'),
  ('01234567-0123-0123-0123-012345678904', 'client2@example.com', 'client', 'Michael', 'Ben-David', 'he', 'active'),
  ('01234567-0123-0123-0123-012345678905', 'client3@example.com', 'client', 'Maya', 'Rosen', 'en', 'active');

-- Insert coach availability
INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, is_available, timezone) VALUES
  -- Sarah Cohen (Sunday to Thursday, 9 AM to 6 PM Israel time)
  ('01234567-0123-0123-0123-012345678901', 0, '09:00', '18:00', true, 'Asia/Jerusalem'),
  ('01234567-0123-0123-0123-012345678901', 1, '09:00', '18:00', true, 'Asia/Jerusalem'),
  ('01234567-0123-0123-0123-012345678901', 2, '09:00', '18:00', true, 'Asia/Jerusalem'),
  ('01234567-0123-0123-0123-012345678901', 3, '09:00', '18:00', true, 'Asia/Jerusalem'),
  ('01234567-0123-0123-0123-012345678901', 4, '09:00', '18:00', true, 'Asia/Jerusalem'),
  
  -- David Levi (Monday to Friday, 8 AM to 5 PM)
  ('01234567-0123-0123-0123-012345678902', 1, '08:00', '17:00', true, 'UTC'),
  ('01234567-0123-0123-0123-012345678902', 2, '08:00', '17:00', true, 'UTC'),
  ('01234567-0123-0123-0123-012345678902', 3, '08:00', '17:00', true, 'UTC'),
  ('01234567-0123-0123-0123-012345678902', 4, '08:00', '17:00', true, 'UTC'),
  ('01234567-0123-0123-0123-012345678902', 5, '08:00', '17:00', true, 'UTC');

-- Insert sample sessions
INSERT INTO sessions (coach_id, client_id, title, description, scheduled_at, duration_minutes, status) VALUES
  (
    '01234567-0123-0123-0123-012345678901',
    '01234567-0123-0123-0123-012345678903',
    'Initial Consultation',
    'First meeting to understand goals and establish coaching relationship',
    NOW() + INTERVAL '2 days',
    60,
    'scheduled'
  ),
  (
    '01234567-0123-0123-0123-012345678901',
    '01234567-0123-0123-0123-012345678904',
    'Goal Setting Session',
    'Define clear objectives and create action plan',
    NOW() + INTERVAL '3 days',
    90,
    'scheduled'
  ),
  (
    '01234567-0123-0123-0123-012345678902',
    '01234567-0123-0123-0123-012345678905',
    'Progress Review',
    'Review achievements and adjust strategies',
    NOW() - INTERVAL '1 week',
    60,
    'completed'
  ),
  (
    '01234567-0123-0123-0123-012345678901',
    '01234567-0123-0123-0123-012345678903',
    'Follow-up Session',
    'Address challenges and celebrate progress',
    NOW() - INTERVAL '3 days',
    60,
    'completed'
  );

-- Insert coach notes
INSERT INTO coach_notes (coach_id, client_id, session_id, title, content, privacy_level, tags) VALUES
  (
    '01234567-0123-0123-0123-012345678901',
    '01234567-0123-0123-0123-012345678903',
    (SELECT id FROM sessions WHERE title = 'Follow-up Session' LIMIT 1),
    'Progress Update',
    'Client showed significant improvement in confidence. Discussed work-life balance strategies.',
    'private',
    ARRAY['confidence', 'work-life-balance']
  ),
  (
    '01234567-0123-0123-0123-012345678902',
    '01234567-0123-0123-0123-012345678905',
    (SELECT id FROM sessions WHERE title = 'Progress Review' LIMIT 1),
    'Goal Achievement',
    'Client successfully implemented time management techniques. Ready for advanced strategies.',
    'shared_with_client',
    ARRAY['time-management', 'goals']
  );

-- Insert reflections
INSERT INTO reflections (client_id, session_id, content, mood_rating, insights, goals_for_next_session) VALUES
  (
    '01234567-0123-0123-0123-012345678903',
    (SELECT id FROM sessions WHERE title = 'Follow-up Session' LIMIT 1),
    'This session was very helpful. I feel more confident about my approach to challenging situations.',
    8,
    'I learned that my self-doubt often comes from perfectionism. The breathing exercises are really helping.',
    'Practice the new communication techniques we discussed and prepare examples for next session.'
  ),
  (
    '01234567-0123-0123-0123-012345678905',
    (SELECT id FROM sessions WHERE title = 'Progress Review' LIMIT 1),
    'Great session! The time management strategies are working well. I feel more organized.',
    9,
    'Prioritization matrix is a game-changer. I can see which tasks truly matter.',
    'Focus on delegation skills and explore leadership development opportunities.'
  );

-- Insert sample notifications
INSERT INTO notifications (user_id, type, title, message, data) VALUES
  (
    '01234567-0123-0123-0123-012345678903',
    'session_reminder',
    'Session Reminder',
    'Your session with Sarah Cohen is tomorrow at 10:00 AM',
    '{"session_id": "' || (SELECT id FROM sessions WHERE title = 'Initial Consultation' LIMIT 1) || '"}'::jsonb
  ),
  (
    '01234567-0123-0123-0123-012345678901',
    'new_message',
    'New Reflection',
    'Rachel Goldberg added a new reflection to your last session',
    '{"client_id": "01234567-0123-0123-0123-012345678903"}'::jsonb
  ),
  (
    '01234567-0123-0123-0123-012345678904',
    'session_confirmation',
    'Session Confirmed',
    'Your goal setting session with Sarah Cohen has been confirmed',
    '{"session_id": "' || (SELECT id FROM sessions WHERE title = 'Goal Setting Session' LIMIT 1) || '"}'::jsonb
  );

-- Sample function calls to test our database functions
-- Test get_upcoming_sessions function
-- SELECT * FROM get_upcoming_sessions('01234567-0123-0123-0123-012345678901');

-- Test time slot availability
-- SELECT is_time_slot_available('01234567-0123-0123-0123-012345678901', NOW() + INTERVAL '1 day', 60);

-- Test views
-- SELECT * FROM session_details LIMIT 5;
-- SELECT * FROM coach_statistics;
-- SELECT * FROM client_progress;