-- Test Data for Analytics System
-- This script creates sample data to test the analytics functionality

-- Insert test users (coaches and clients)
INSERT INTO users (id, email, role, first_name, last_name, status, created_at, last_seen_at) VALUES
-- Test coaches
('550e8400-e29b-41d4-a716-446655440001', 'coach1@example.com', 'coach', 'Sarah', 'Johnson', 'active', NOW() - INTERVAL '60 days', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440002', 'coach2@example.com', 'coach', 'Mike', 'Davis', 'active', NOW() - INTERVAL '45 days', NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440003', 'coach3@example.com', 'coach', 'Emily', 'Wilson', 'active', NOW() - INTERVAL '30 days', NOW() - INTERVAL '3 hours'),

-- Test clients
('550e8400-e29b-41d4-a716-446655440011', 'client1@example.com', 'client', 'John', 'Smith', 'active', NOW() - INTERVAL '50 days', NOW() - INTERVAL '1 hour'),
('550e8400-e29b-41d4-a716-446655440012', 'client2@example.com', 'client', 'Jane', 'Brown', 'active', NOW() - INTERVAL '40 days', NOW() - INTERVAL '5 hours'),
('550e8400-e29b-41d4-a716-446655440013', 'client3@example.com', 'client', 'Bob', 'Miller', 'active', NOW() - INTERVAL '35 days', NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440014', 'client4@example.com', 'client', 'Alice', 'Garcia', 'active', NOW() - INTERVAL '25 days', NOW() - INTERVAL '6 hours'),
('550e8400-e29b-41d4-a716-446655440015', 'client5@example.com', 'client', 'Tom', 'Martinez', 'active', NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 hours'),

-- Test admin
('550e8400-e29b-41d4-a716-446655440000', 'admin@example.com', 'admin', 'System', 'Admin', 'active', NOW() - INTERVAL '90 days', NOW() - INTERVAL '30 minutes')

ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at,
  last_seen_at = EXCLUDED.last_seen_at;

-- Insert test sessions across different time periods
INSERT INTO sessions (id, coach_id, client_id, title, description, scheduled_at, duration_minutes, status, created_at) VALUES
-- Recent completed sessions
('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'Goal Setting Session', 'Initial goal setting and planning', NOW() - INTERVAL '3 days', 60, 'completed', NOW() - INTERVAL '5 days'),
('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 'Progress Review', 'Monthly progress check', NOW() - INTERVAL '5 days', 45, 'completed', NOW() - INTERVAL '7 days'),
('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', 'Strategy Session', 'Business strategy discussion', NOW() - INTERVAL '2 days', 90, 'completed', NOW() - INTERVAL '4 days'),

-- Recent scheduled sessions
('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440014', 'Follow-up Session', 'Follow-up on action items', NOW() + INTERVAL '2 days', 60, 'scheduled', NOW() - INTERVAL '3 days'),
('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440015', 'Initial Consultation', 'First meeting consultation', NOW() + INTERVAL '5 days', 60, 'scheduled', NOW() - INTERVAL '2 days'),

-- Some cancelled sessions
('660e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440013', 'Cancelled Session', 'Session cancelled by client', NOW() - INTERVAL '1 day', 60, 'cancelled', NOW() - INTERVAL '3 days'),

-- Historical sessions for trend analysis
('660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'Weekly Check-in', 'Regular weekly session', NOW() - INTERVAL '10 days', 45, 'completed', NOW() - INTERVAL '12 days'),
('660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', 'Skills Assessment', 'Assess current skill level', NOW() - INTERVAL '15 days', 75, 'completed', NOW() - INTERVAL '17 days'),
('660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440014', 'Goal Achievement', 'Celebrating goal achievement', NOW() - INTERVAL '20 days', 60, 'completed', NOW() - INTERVAL '22 days'),
('660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440015', 'Problem Solving', 'Address specific challenges', NOW() - INTERVAL '25 days', 90, 'completed', NOW() - INTERVAL '27 days')

ON CONFLICT (id) DO UPDATE SET
  coach_id = EXCLUDED.coach_id,
  client_id = EXCLUDED.client_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  scheduled_at = EXCLUDED.scheduled_at,
  duration_minutes = EXCLUDED.duration_minutes,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at;

-- Insert test session ratings
INSERT INTO session_ratings (id, session_id, coach_id, client_id, rating, review, created_at) VALUES
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 5, 'Excellent session, very helpful!', NOW() - INTERVAL '2 days'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 4, 'Good insights and practical advice', NOW() - INTERVAL '4 days'),
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', 5, 'Outstanding coaching session', NOW() - INTERVAL '1 day'),
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 4, 'Very productive session', NOW() - INTERVAL '9 days'),
('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', 5, 'Perfect assessment, clear feedback', NOW() - INTERVAL '14 days'),
('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440014', 4, 'Great celebration of achievements', NOW() - INTERVAL '19 days'),
('770e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440015', 5, 'Excellent problem-solving approach', NOW() - INTERVAL '24 days')

ON CONFLICT (session_id) DO UPDATE SET
  rating = EXCLUDED.rating,
  review = EXCLUDED.review,
  created_at = EXCLUDED.created_at;

-- Configure coach profiles so dashboard revenue uses per-coach pricing
INSERT INTO coach_profiles (id, coach_id, session_rate, currency, specializations, bio, experience_years, updated_at)
VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 125.00, 'USD', ARRAY['leadership', 'executive'], 'Executive leadership coach with a focus on career transitions.', 8, NOW()),
  ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 95.00, 'USD', ARRAY['career development'], 'Career strategist helping mid-level managers grow.', 6, NOW()),
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 110.00, 'USD', ARRAY['wellness', 'resilience'], 'Holistic coach supporting wellbeing and balance.', 7, NOW())
ON CONFLICT (coach_id) DO UPDATE SET
  session_rate = EXCLUDED.session_rate,
  currency = EXCLUDED.currency,
  specializations = EXCLUDED.specializations,
  bio = EXCLUDED.bio,
  experience_years = EXCLUDED.experience_years,
  updated_at = NOW();

-- Seed client goals so progress widgets display meaningful data
INSERT INTO client_goals (id, client_id, coach_id, title, description, category, target_date, status, progress_percentage, priority, created_at, updated_at)
VALUES
  ('990e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 'Improve leadership presence', 'Build confidence when presenting to senior stakeholders.', 'leadership', CURRENT_DATE + INTERVAL '30 days', 'active', 55, 'high', NOW() - INTERVAL '20 days', NOW() - INTERVAL '2 days'),
  ('990e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 'Establish morning routine', 'Design a repeatable morning routine to improve focus.', 'productivity', CURRENT_DATE + INTERVAL '45 days', 'active', 40, 'medium', NOW() - INTERVAL '18 days', NOW() - INTERVAL '3 days'),
  ('990e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 'Launch pilot program', 'Deliver the first cohort of a new coaching pilot.', 'strategy', CURRENT_DATE + INTERVAL '14 days', 'active', 70, 'high', NOW() - INTERVAL '12 days', NOW() - INTERVAL '1 day'),
  ('990e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440002', 'Increase client retention', 'Implement new retention experiments for top customers.', 'business', CURRENT_DATE + INTERVAL '60 days', 'paused', 20, 'medium', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),
  ('990e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440003', 'Build wellbeing toolkit', 'Develop sustainable habits for stress management.', 'wellness', CURRENT_DATE + INTERVAL '21 days', 'active', 65, 'high', NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  target_date = EXCLUDED.target_date,
  status = EXCLUDED.status,
  progress_percentage = EXCLUDED.progress_percentage,
  priority = EXCLUDED.priority,
  updated_at = NOW();

-- Align session feedback data with ratings for richer analytics
INSERT INTO session_feedback (id, session_id, client_id, coach_id, overall_rating, communication_rating, helpfulness_rating, preparation_rating, feedback_text, would_recommend, created_at, updated_at)
VALUES
  ('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 5, 5, 5, 4, 'Felt fully supported throughout the session.', true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440001', 4, 4, 5, 4, 'Clear action plan for the next month.', true, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('aa0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440002', 5, 5, 5, 5, 'Incredibly insightful discussion.', true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
  ('aa0e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440001', 4, 4, 4, 4, 'Great accountability check-in.', true, NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),
  ('aa0e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440002', 5, 5, 4, 5, 'Focused on the right strategic priorities.', true, NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),
  ('aa0e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440003', 4, 4, 4, 4, 'Celebrated big milestone wins together.', true, NOW() - INTERVAL '19 days', NOW() - INTERVAL '19 days'),
  ('aa0e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440001', 5, 5, 5, 5, 'Left with a clear tactical plan.', true, NOW() - INTERVAL '24 days', NOW() - INTERVAL '24 days')
ON CONFLICT (session_id, client_id) DO UPDATE SET
  overall_rating = EXCLUDED.overall_rating,
  communication_rating = EXCLUDED.communication_rating,
  helpfulness_rating = EXCLUDED.helpfulness_rating,
  preparation_rating = EXCLUDED.preparation_rating,
  feedback_text = EXCLUDED.feedback_text,
  would_recommend = EXCLUDED.would_recommend,
  updated_at = NOW();

-- Verify the test data
SELECT 
  'Users Summary' as summary,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE role = 'coach') as coaches,
  COUNT(*) FILTER (WHERE role = 'client') as clients,
  COUNT(*) FILTER (WHERE role = 'admin') as admins
FROM users;

SELECT 
  'Sessions Summary' as summary,
  COUNT(*) as total_sessions,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
FROM sessions;

SELECT 
  'Ratings Summary' as summary,
  COUNT(*) as total_ratings,
  ROUND(AVG(rating), 2) as average_rating,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating
FROM session_ratings;

-- Test the analytics functions
SELECT 'Testing get_system_overview_metrics...' as test;
SELECT * FROM get_system_overview_metrics(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);

SELECT 'Testing get_enhanced_coach_performance_metrics...' as test;
SELECT * FROM get_enhanced_coach_performance_metrics(CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE);

SELECT 'Testing get_daily_user_growth...' as test;
SELECT * FROM get_daily_user_growth(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE) LIMIT 5;

SELECT 'Testing get_daily_session_metrics...' as test;
SELECT * FROM get_daily_session_metrics(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE) LIMIT 5;