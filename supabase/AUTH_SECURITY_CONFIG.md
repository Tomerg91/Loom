# Auth Security Configuration

This document addresses security warnings related to Supabase Auth configuration.

## Auth OTP Long Expiry Warning

**Issue**: Email OTP expiry is set to more than 1 hour, which poses a security risk.

**Current Status**: ✅ OTP expiry enforced at 15 minutes via `otp_expiry = 900`

**Recommendation**: Keep OTP expiry below 1 hour (recommended: 10-15 minutes)

### How to Fix

1. **Via Supabase Dashboard**:
   - Go to: [Project Settings → Authentication](https://supabase.com/dashboard/project/mrhszadupxbtyycvcoux/settings/auth)
   - Navigate to "Email Auth" section
   - Set "OTP expiry" to `900` seconds (15 minutes) or `600` seconds (10 minutes)
   - Save changes

2. **Via Environment Variables** (if using custom auth settings):
   ```bash
   # Add to your .env file
   SUPABASE_AUTH_EMAIL_OTP_EXPIRY=900  # 15 minutes
   ```

3. **Via Supabase CLI** (for local development):
   ```toml
   # In supabase/config.toml
   [auth.email]
   # Set OTP expiry to 15 minutes (900 seconds)
   otp_expiry = 900
   ```

### Security Benefits

- **Reduced Attack Window**: Shorter OTP validity reduces the time window for potential attacks
- **Better User Experience**: Forces users to complete authentication quickly
- **Compliance**: Follows security best practices for time-based tokens

### Recommended Settings

```toml
[auth]
site_url = "env(SUPABASE_SITE_URL)"
additional_redirect_urls = [
  "http://localhost:3000",
  "env(SUPABASE_SITE_URL)"
]

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true
otp_expiry = 900
```

> ℹ️ Define `SUPABASE_SITE_URL` in every environment (e.g. `.env.local` = `http://localhost:3000`, Vercel/Supabase dashboard = production domain) so auth callbacks always use the right host.

## Additional Auth Security Recommendations

1. **Enable Email Confirmations in Production**:
   ```toml
   [auth.email]
   enable_confirmations = true
   ```

2. **Configure Strong JWT Settings**:
   ```toml
   [auth]
   jwt_expiry = 3600  # 1 hour
   enable_refresh_token_rotation = true
   refresh_token_reuse_interval = 10
   ```

3. **Set Appropriate Site URLs**:
   ```toml
   [auth]
   site_url = "https://your-production-domain.com"
   additional_redirect_urls = [
     "https://your-production-domain.com",
     "https://staging.your-domain.com"  # Only if needed
   ]
   ```

## Implementation Priority

1. **High Priority**: Keep OTP expiry at 10–15 minutes (already applied)
2. **Medium Priority**: Ensure email confirmations stay enabled in production
3. **Low Priority**: Review and optimize other JWT settings

## Verification

After applying changes:
1. Test email OTP flow to ensure 15-minute expiry works
2. Run database linter again to confirm warning resolution
3. Monitor auth logs for any issues

## Related Documentation

- [Supabase Auth Configuration](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Production Security Checklist](https://supabase.com/docs/guides/platform/going-into-prod#security)
- [Database Security Best Practices](https://supabase.com/docs/guides/database/database-linter)
