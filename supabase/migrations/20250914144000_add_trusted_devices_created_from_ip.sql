-- Add missing IP column to trusted_devices for auditability and tests
ALTER TABLE public.trusted_devices
  ADD COLUMN IF NOT EXISTS created_from_ip INET;

