-- Patch: Fix MFA admin dashboard RLS policy error
-- The issue is trying to create RLS policy on a view instead of table

-- First, ensure the view exists
DROP VIEW IF EXISTS mfa_admin_dashboard;

-- Recreate the view properly
CREATE OR REPLACE VIEW mfa_admin_dashboard AS
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    
    -- MFA Status
    COALESCE(mfa_settings.is_enabled, false) as mfa_enabled,
    COALESCE(mfa_settings.is_enforced, false) as mfa_enforced,
    mfa_settings.backup_codes_generated,
    mfa_settings.last_backup_codes_generated_at,
    
    -- Method counts
    COUNT(DISTINCT CASE WHEN methods.status = 'active' THEN methods.id END) as active_methods,
    COUNT(DISTINCT CASE WHEN methods.method_type = 'totp' AND methods.status = 'active' THEN methods.id END) as totp_methods,
    
    -- Backup codes
    COUNT(DISTINCT CASE WHEN codes.status = 'active' AND codes.expires_at > NOW() THEN codes.id END) as available_backup_codes,
    COUNT(DISTINCT CASE WHEN codes.status = 'used' THEN codes.id END) as used_backup_codes,
    
    -- Recent activity
    COUNT(DISTINCT CASE WHEN attempts.created_at > NOW() - INTERVAL '24 hours' AND attempts.status = 'success' THEN attempts.id END) as successful_verifications_24h,
    COUNT(DISTINCT CASE WHEN attempts.created_at > NOW() - INTERVAL '24 hours' AND attempts.status = 'failed' THEN attempts.id END) as failed_verifications_24h,
    
    -- Last activity
    MAX(methods.last_used_at) as last_mfa_used,
    MAX(attempts.created_at) as last_verification_attempt
    
FROM users u
LEFT JOIN user_mfa_settings mfa_settings ON u.id = mfa_settings.user_id
LEFT JOIN user_mfa_methods methods ON u.id = methods.user_id
LEFT JOIN mfa_backup_codes codes ON u.id = codes.user_id
LEFT JOIN mfa_verification_attempts attempts ON u.id = attempts.user_id
GROUP BY 
    u.id, u.email, u.role, u.first_name, u.last_name,
    mfa_settings.is_enabled, mfa_settings.is_enforced, 
    mfa_settings.backup_codes_generated, mfa_settings.last_backup_codes_generated_at;

-- Grant permissions properly (views don't support RLS policies directly)
GRANT SELECT ON mfa_admin_dashboard TO authenticated;

-- Remove the erroneous RLS policy creation
-- Note: Views inherit RLS from their underlying tables
-- The access control should be handled at the application level or through the underlying table policies