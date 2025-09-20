-- File Storage System Setup
-- This migration creates the necessary storage buckets and policies for file management

-- Create storage buckets for different file types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']), -- 5MB limit for avatars
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf']), -- 50MB limit for documents
  ('session-files', 'session-files', false, 104857600, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/wav', 'video/mp4', 'video/webm']), -- 100MB limit for session files
  ('uploads', 'uploads', false, 20971520, NULL) -- 20MB general upload limit, all mime types allowed
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping enabling RLS on storage.objects due to insufficient privileges';
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipping enabling RLS on storage.objects because table does not exist';
  END;
END
$$;

-- Storage policies for avatars bucket (public)
CREATE POLICY "Avatar uploads are publicly viewable" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for documents bucket (private, coach-client sharing)
CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Coaches can view documents shared by their clients" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sessions s
      JOIN users u ON u.id = auth.uid()
      WHERE s.coach_id = u.id
      AND s.client_id = (storage.foldername(name))[1]::uuid
      AND u.role = 'coach'
    )
  );

CREATE POLICY "Clients can view documents shared by their coaches" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sessions s
      JOIN users u ON u.id = auth.uid()
      WHERE s.client_id = u.id
      AND s.coach_id = (storage.foldername(name))[1]::uuid
      AND u.role = 'client'
    )
  );

CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own documents" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for session-files bucket (shared within sessions)
CREATE POLICY "Session participants can view session files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'session-files'
    AND auth.role() = 'authenticated'
    AND (
      -- User uploaded the file
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- User is a participant in sessions where files are shared
      EXISTS (
        SELECT 1 FROM sessions s
        WHERE (s.coach_id = auth.uid() OR s.client_id = auth.uid())
        AND s.id::text = (storage.foldername(name))[2]
      )
    )
  );

CREATE POLICY "Session participants can upload session files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'session-files'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sessions s
      WHERE (s.coach_id = auth.uid() OR s.client_id = auth.uid())
      AND s.id::text = (storage.foldername(name))[2]
    )
  );

CREATE POLICY "Users can update their own session files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'session-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own session files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'session-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for general uploads bucket
CREATE POLICY "Users can view their own uploads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Coaches can view uploads from their clients" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sessions s
      JOIN users u ON u.id = auth.uid()
      WHERE s.coach_id = u.id
      AND s.client_id = (storage.foldername(name))[1]::uuid
      AND u.role = 'coach'
    )
  );

CREATE POLICY "Clients can view uploads from their coaches" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sessions s
      JOIN users u ON u.id = auth.uid()
      WHERE s.client_id = u.id
      AND s.coach_id = (storage.foldername(name))[1]::uuid
      AND u.role = 'client'
    )
  );

CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own uploads" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own uploads" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admin policies for all buckets
CREATE POLICY "Admins can manage all files" ON storage.objects
  FOR ALL USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );
