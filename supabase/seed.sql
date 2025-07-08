-- Seed data for development and testing

-- Note: For local development, we'll keep the seed file minimal
-- Users should be created through the app's registration system
-- This allows testing the full authentication flow

-- Uncomment the sections below once you have registered users through the app
-- and want to add sample data for testing

/*
-- Example coach availability (replace UUIDs with actual user IDs)
INSERT INTO coach_availability (coach_id, day_of_week, start_time, end_time, is_available, timezone) VALUES
  ('your-coach-uuid-here', 1, '09:00', '17:00', true, 'UTC'),
  ('your-coach-uuid-here', 2, '09:00', '17:00', true, 'UTC'),
  ('your-coach-uuid-here', 3, '09:00', '17:00', true, 'UTC'),
  ('your-coach-uuid-here', 4, '09:00', '17:00', true, 'UTC'),
  ('your-coach-uuid-here', 5, '09:00', '17:00', true, 'UTC');

-- Example sessions
INSERT INTO sessions (coach_id, client_id, title, description, scheduled_at, duration_minutes, status) VALUES
  (
    'your-coach-uuid-here',
    'your-client-uuid-here',
    'Initial Consultation',
    'First meeting to understand goals and establish coaching relationship',
    NOW() + INTERVAL '2 days',
    60,
    'scheduled'
  );
*/

-- Database is ready for use!
-- Register users through the app at http://localhost:3000