# Required GitHub Secrets

This document lists all the secrets that need to be configured in your GitHub repository for the CI/CD pipeline to work correctly.

## Navigate to GitHub Secrets

1. Go to your repository on GitHub
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret** to add each secret

## Required Secrets

### 🔐 Authentication & Database

| Secret Name | Description | Example/Format | Required |
|-------------|-------------|----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin access) | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | ✅ |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI access token | Personal access token from Supabase dashboard | ✅ |
| `DATABASE_URL` | Direct database connection URL | `postgresql://user:pass@host:port/db` | ✅ |

### 🚀 Deployment (Vercel)

| Secret Name | Description | Example/Format | Required |
|-------------|-------------|----------------|----------|
| `VERCEL_TOKEN` | Vercel deployment token | From Vercel account settings | ✅ |
| `VERCEL_ORG_ID` | Vercel organization/team ID | `team_abc123` or `user_def456` | ✅ |
| `VERCEL_PROJECT_ID` | Vercel project ID | `prj_abc123def456ghi789` | ✅ |
| `PRODUCTION_URL` | Your production app URL | `https://your-app.vercel.app` | ✅ |

### 📢 Notifications

| Secret Name | Description | How to Get | Required |
|-------------|-------------|------------|----------|
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | See setup instructions below | ✅ |

### 📊 Analytics & Monitoring

| Secret Name | Description | Example/Format | Required |
|-------------|-------------|----------------|----------|
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub app token | GitHub app token for performance reports | ⚠️ Optional |

## Setting Up Slack Webhook URL

### Step 1: Create a Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Click **Create New App**
3. Choose **From scratch**
4. Enter app name: `Loom CI/CD Bot`
5. Select your workspace

### Step 2: Enable Incoming Webhooks

1. In your app settings, go to **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to **On**
3. Click **Add New Webhook to Workspace**
4. Select the channel for notifications (e.g., `#deployments`)
5. Click **Allow**

### Step 3: Copy the Webhook URL

1. Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)
2. Add it as `SLACK_WEBHOOK_URL` secret in GitHub

### Step 4: Customize Slack Channels

The workflow uses these channels:
- `#deployments` - General CI/CD notifications
- `#critical-alerts` - Critical production failures

Make sure these channels exist in your Slack workspace, or update the channel names in `.github/workflows/ci.yml`.

## How to Add Secrets

### Via GitHub Web Interface

1. Go to your repository settings
2. Navigate to **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

### Via GitHub CLI

```bash
# Install GitHub CLI first: https://cli.github.com/

# Add secrets one by one
gh secret set NEXT_PUBLIC_SUPABASE_URL --body "https://your-project.supabase.co"
gh secret set NEXT_PUBLIC_SUPABASE_ANON_KEY --body "your-anon-key"
gh secret set SUPABASE_SERVICE_ROLE_KEY --body "your-service-role-key"
gh secret set SLACK_WEBHOOK_URL --body "https://hooks.slack.com/services/..."

# Set secrets from environment variables
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN"
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID"
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID"
```

## Environment-Specific Secrets

Some secrets may differ between staging and production. You can set environment-specific secrets:

1. Go to **Settings** > **Environments**
2. Create environments: `staging` and `production`
3. Add environment-specific secrets

## Security Best Practices

### ✅ Do's

- ✅ Use environment-specific secrets when values differ
- ✅ Regularly rotate API keys and tokens
- ✅ Use least-privilege access for service accounts
- ✅ Monitor secret usage in CI/CD logs
- ✅ Use GitHub's secret scanning features

### ❌ Don'ts

- ❌ Never commit secrets to your repository
- ❌ Don't share secrets via insecure channels
- ❌ Don't use production secrets in development
- ❌ Don't log secret values in CI/CD output

## Troubleshooting

### Common Issues

1. **Invalid Supabase URL/Key**
   - Verify URL format and key validity
   - Check project settings in Supabase dashboard

2. **Vercel Deployment Fails**
   - Ensure Vercel token has correct permissions
   - Verify org ID and project ID are correct

3. **Slack Notifications Not Working**
   - Check webhook URL is valid and active
   - Verify channels exist in your workspace
   - Test webhook with curl:
     ```bash
     curl -X POST -H 'Content-type: application/json' \
       --data '{"text":"Test message"}' \
       YOUR_WEBHOOK_URL
     ```

4. **Database Migration Fails**
   - Verify `DATABASE_URL` format and credentials
   - Check Supabase CLI token permissions

### Getting Help

- Check the [GitHub Actions logs](https://github.com/your-username/loom-app/actions) for detailed error messages
- Review Supabase [documentation](https://supabase.com/docs)
- Consult Vercel [deployment guides](https://vercel.com/docs)
- Slack webhook [troubleshooting](https://api.slack.com/messaging/webhooks)

## Secret Validation

You can validate your secrets are working by:

1. Pushing a commit to trigger the CI/CD pipeline
2. Checking the Actions tab for any failures
3. Verifying Slack notifications are received
4. Confirming deployments succeed

Remember to keep this documentation updated when adding new secrets or changing requirements!