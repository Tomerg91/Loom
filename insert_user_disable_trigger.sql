-- Disable the problematic trigger temporarily
ALTER TABLE public.users DISABLE TRIGGER ALL;

-- Insert the user profile
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
  'coach',
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

-- Re-enable triggers
ALTER TABLE public.users ENABLE TRIGGER ALL;

-- Verify the insert
SELECT id, email, first_name, last_name, role, status FROM public.users WHERE email = 'tomerg91@gmail.com';
