-- Test file management database schema
-- This file contains test queries to verify the database schema works correctly

-- Test 1: Insert sample file uploads
INSERT INTO file_uploads (
    user_id, 
    filename, 
    original_filename, 
    storage_path, 
    file_type, 
    file_size, 
    file_category, 
    bucket_name,
    description,
    tags
) VALUES 
-- Coach uploads
('00000000-0000-0000-0000-000000000001', 'session-plan.pdf', 'My Session Plan.pdf', 'documents/00000000-0000-0000-0000-000000000001/1691234567-abc123.pdf', 'application/pdf', 245760, 'resource', 'documents', 'Session planning document for client', ARRAY['session-plan', 'coaching']),
('00000000-0000-0000-0000-000000000001', 'workout-guide.jpg', 'Weekly Workout Guide.jpg', 'documents/00000000-0000-0000-0000-000000000001/1691234568-def456.jpg', 'image/jpeg', 1024000, 'resource', 'documents', 'Weekly exercise routine', ARRAY['workout', 'exercise', 'guide']),

-- Client uploads
('00000000-0000-0000-0000-000000000002', 'progress-photo.jpg', 'Progress Photo Week 1.jpg', 'uploads/00000000-0000-0000-0000-000000000002/1691234569-ghi789.jpg', 'image/jpeg', 512000, 'personal', 'uploads', 'Weekly progress photo', ARRAY['progress', 'photo', 'week1']),
('00000000-0000-0000-0000-000000000002', 'homework.docx', 'Reflection Homework.docx', 'documents/00000000-0000-0000-0000-000000000002/1691234570-jkl012.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 87040, 'preparation', 'documents', 'Pre-session homework', ARRAY['homework', 'reflection']);

-- Test 2: Insert file sharing relationships
INSERT INTO file_shares (
    file_id,
    shared_by,
    shared_with,
    permission_type
) SELECT 
    f.id,
    '00000000-0000-0000-0000-000000000001', -- Coach sharing
    '00000000-0000-0000-0000-000000000002', -- With client
    'download'::file_permission_type
FROM file_uploads f 
WHERE f.filename IN ('session-plan.pdf', 'workout-guide.jpg');

-- Share client's homework with coach
INSERT INTO file_shares (
    file_id,
    shared_by,
    shared_with,
    permission_type
) SELECT 
    f.id,
    '00000000-0000-0000-0000-000000000002', -- Client sharing
    '00000000-0000-0000-0000-000000000001', -- With coach
    'view'::file_permission_type
FROM file_uploads f 
WHERE f.filename = 'homework.docx';

-- Test 3: Insert session-file associations
-- First, we need a sample session (assuming it exists)
-- INSERT INTO sessions (id, coach_id, client_id, title, scheduled_at) 
-- VALUES ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Weekly Coaching Session', NOW() + INTERVAL '1 week');

INSERT INTO session_files (
    session_id,
    file_id,
    file_category,
    uploaded_by,
    is_required
) SELECT 
    '11111111-1111-1111-1111-111111111111',
    f.id,
    f.file_category,
    f.user_id,
    CASE WHEN f.filename = 'homework.docx' THEN TRUE ELSE FALSE END
FROM file_uploads f 
WHERE f.filename IN ('session-plan.pdf', 'homework.docx');

-- Test 4: Query tests to verify functionality

-- Test user storage usage function
SELECT * FROM get_user_storage_usage('00000000-0000-0000-0000-000000000001'); -- Coach
SELECT * FROM get_user_storage_usage('00000000-0000-0000-0000-000000000002'); -- Client

-- Test files shared with user function
SELECT * FROM get_files_shared_with_user('00000000-0000-0000-0000-000000000001'); -- Files shared with coach
SELECT * FROM get_files_shared_with_user('00000000-0000-0000-0000-000000000002'); -- Files shared with client

-- Test user accessible files view (would need to be run with proper auth context)
-- SELECT * FROM user_accessible_files;

-- Test queries for file management
SELECT 
    f.filename,
    f.file_type,
    f.file_size,
    f.file_category,
    f.tags,
    f.created_at
FROM file_uploads f 
WHERE f.user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY f.created_at DESC;

-- Test file sharing queries
SELECT 
    f.filename,
    u1.first_name || ' ' || u1.last_name as shared_by_name,
    u2.first_name || ' ' || u2.last_name as shared_with_name,
    fs.permission_type,
    fs.created_at
FROM file_shares fs
JOIN file_uploads f ON f.id = fs.file_id
JOIN users u1 ON u1.id = fs.shared_by
JOIN users u2 ON u2.id = fs.shared_with
ORDER BY fs.created_at DESC;

-- Test session files queries
SELECT 
    s.title as session_title,
    f.filename,
    f.file_category,
    sf.is_required,
    u.first_name || ' ' || u.last_name as uploaded_by_name
FROM session_files sf
JOIN sessions s ON s.id = sf.session_id
JOIN file_uploads f ON f.id = sf.file_id
JOIN users u ON u.id = sf.uploaded_by
ORDER BY sf.created_at DESC;

-- Test download count increment
SELECT increment_file_download_count((SELECT id FROM file_uploads WHERE filename = 'session-plan.pdf' LIMIT 1));
SELECT download_count FROM file_uploads WHERE filename = 'session-plan.pdf';

-- Test file share access tracking
SELECT track_file_share_access((SELECT id FROM file_shares LIMIT 1));
SELECT access_count, last_accessed_at FROM file_shares ORDER BY created_at LIMIT 1;

-- Test cleanup expired shares (no expired shares in our test data)
SELECT cleanup_expired_file_shares();

-- Test constraint validations
-- This should fail due to self-sharing constraint
-- INSERT INTO file_shares (file_id, shared_by, shared_with, permission_type) 
-- SELECT id, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'view'
-- FROM file_uploads LIMIT 1;

-- This should fail due to invalid bucket name
-- INSERT INTO file_uploads (user_id, filename, original_filename, storage_path, file_type, file_size, bucket_name)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'test.txt', 'test.txt', 'invalid/path', 'text/plain', 100, 'invalid-bucket');

-- Performance test queries
EXPLAIN ANALYZE SELECT * FROM file_uploads WHERE user_id = '00000000-0000-0000-0000-000000000001';
EXPLAIN ANALYZE SELECT * FROM file_shares WHERE shared_with = '00000000-0000-0000-0000-000000000002';
EXPLAIN ANALYZE SELECT * FROM session_files WHERE session_id = '11111111-1111-1111-1111-111111111111';

-- Test tag searching (GIN index)
EXPLAIN ANALYZE SELECT * FROM file_uploads WHERE tags @> ARRAY['coaching'];
EXPLAIN ANALYZE SELECT * FROM file_uploads WHERE 'workout' = ANY(tags);

-- Clean up test data
-- DELETE FROM session_files WHERE session_id = '11111111-1111-1111-1111-111111111111';
-- DELETE FROM file_shares WHERE shared_by IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
-- DELETE FROM file_uploads WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');