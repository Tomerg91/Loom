-- Create missing user profile for tomerg91@gmail.com
INSERT INTO public.users (
  id,
  email,
  first_name,
  last_name,
  role,
  language,
  status,
  created_at,
  updated_at
)
VALUES (
  '170f88e4-8909-4f84-8ba4-9f4260d0663f',
  'tomerg91@gmail.com',
  'Tomer',
  'Galansky',
  'coach'::user_role,
  'he',
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = NOW();
