# Supabase Scripts

This directory contains utility SQL scripts for database analysis, validation, and monitoring.

## Script Files

### `validate_resource_library_data.sql`

**Purpose**: Identifies data inconsistencies and orphaned records in the resource library tables.

**Checks** (10 total):

1. Orphaned collection items
2. Collection items with non-library resources
3. Orphaned progress records
4. Progress records for non-library resources
5. Empty collections (older than 7 days)
6. Duplicate collection items
7. Collection items with ownership mismatches
8. Progress without share records
9. Collections with invalid coach references
10. Progress with invalid client references

**Output**:

- Issue counts for each check
- Summary statistics
- Affected coach emails for notification
- Remediation recommendations

**Usage**:

```bash
npx supabase db execute -f supabase/scripts/validate_resource_library_data.sql
```

### `mfa_usage_telemetry.sql`

**Purpose**: Captures comprehensive MFA usage patterns and metrics to inform consolidation strategy.

**Metrics**:

- MFA enabled users across all sources
- Cross-source comparison and discrepancy detection
- MFA method type distribution (TOTP, SMS, etc.)
- Adoption rates by user role
- Recent MFA activity (last 30 days)
- Backup codes usage statistics
- Table row counts and growth trends

**Output**:

- Detailed telemetry report
- Discrepancy details with recommendations
- Method distribution statistics
- Adoption metrics by role

**Usage**:

```bash
npx supabase db execute -f supabase/scripts/mfa_usage_telemetry.sql > mfa_report.txt
```

## Running Scripts

### One-Time Analysis

```bash
# Run resource library validation
npx supabase db execute -f supabase/scripts/validate_resource_library_data.sql

# Generate MFA telemetry report
npx supabase db execute -f supabase/scripts/mfa_usage_telemetry.sql > reports/mfa_$(date +%Y%m%d).txt
```

### Scheduled Monitoring

#### Using pg_cron (Recommended)

```sql
-- Schedule weekly resource validation
SELECT cron.schedule(
  'validate-resource-library',
  '0 3 * * 0', -- Sunday 3 AM
  'SELECT * FROM validate_resource_library_data()'
);

-- Schedule monthly MFA report
SELECT cron.schedule(
  'mfa-telemetry',
  '0 4 1 * *', -- 1st of month, 4 AM
  'SELECT * FROM mfa_usage_telemetry()'
);
```

#### Using External Scheduler

```bash
# Add to crontab
0 3 * * 0 cd /path/to/loom-app && npx supabase db execute -f supabase/scripts/validate_resource_library_data.sql > logs/validation_$(date +\%Y\%m\%d).log 2>&1
```

## Interpreting Results

### Resource Library Validation

#### Clean Output (No Issues)

```
Check 1: Orphaned Collection Items
-----------------------------------
issue_type         | issue_count | affected_ids
-------------------+-------------+-------------
ORPHANED_ITEMS     | 0           | {}

✓ No issues found
```

#### Issues Found

```
Check 7: Collection Items with Mismatched Ownership
----------------------------------------------------
issue_type           | issue_count | affected_item_ids
---------------------+-------------+------------------
OWNERSHIP_MISMATCH   | 3           | {uuid1, uuid2, uuid3}

⚠ Action required: Review affected items
```

**Actions**:

1. Review affected records
2. Notify coaches if needed
3. Run remediation queries (provided in script output)
4. Re-run validation to confirm fixes

### MFA Telemetry

#### Healthy State

```
MFA Enabled Users - Cross-Source Comparison:
--------------------------------------------
total_users | users_table | mfa_methods | all_agree | disagree
------------+-------------+-------------+-----------+----------
150         | 150         | 150         | 150       | 0

✓ All sources in sync
```

#### Discrepancies Found

```
sources_disagree: 5

Users with MFA Source Discrepancies:
-------------------------------------
email              | users_mfa | methods_active | discrepancy_type
-------------------+-----------+----------------+---------------------------
user@example.com   | true      | false          | users.mfa_enabled=true but no active methods

⚠ Action required: Investigate and reconcile
```

**Actions**:

1. Run MFA unified source migration
2. Verify sync trigger is working
3. Check for application logic errors

## Creating New Scripts

### Template

```sql
-- ============================================================================
-- Script Name
-- ============================================================================
-- Purpose: [Brief description]
--
-- Generated: YYYY-MM-DD
-- Usage: psql -f supabase/scripts/your_script.sql
-- ============================================================================

\set ON_ERROR_STOP on

\echo ''
\echo '============================================================================'
\echo 'SCRIPT NAME'
\echo '============================================================================'
\echo ''

-- Your SQL queries here

-- Always include summary section
\echo ''
\echo '============================================================================'
\echo 'SUMMARY'
\echo '============================================================================'
```

### Best Practices

1. **Read-only**: Scripts should not modify data (use migrations for changes)
2. **Informative output**: Use `\echo` to provide context
3. **Error handling**: Set `ON_ERROR_STOP` to catch issues
4. **Documentation**: Include purpose, usage, and interpretation
5. **Formatting**: Pretty-print results for readability
6. **Performance**: Avoid full table scans on large tables

## Related Files

- Migrations: `supabase/migrations/`
- Tests: `supabase/tests/`
- Documentation: `DATABASE_REFACTORING_EXECUTION_SUMMARY.md`
- Deployment Checklist: `DEPLOYMENT_CHECKLIST.md`

## Troubleshooting

### Permission Denied

```bash
# Use service role for admin operations
npx supabase db execute -f script.sql --db-url "$SUPABASE_SERVICE_ROLE_URL"
```

### Timeout Errors

```sql
-- Add timeout at script start
SET statement_timeout = '5min';
```

### Large Result Sets

```bash
# Paginate results
npx supabase db execute -f script.sql | head -100

# Or save to file
npx supabase db execute -f script.sql > results.txt
```

## Monitoring Dashboard

Consider setting up a monitoring dashboard that runs these scripts regularly:

```typescript
// Example: Daily validation job
async function runDailyValidation() {
  const validationResult = await supabase.rpc('validate_resource_library_data');
  const mfaMetrics = await supabase.rpc('mfa_usage_telemetry');

  // Send to monitoring service
  await sendToDatadog({ validationResult, mfaMetrics });

  // Alert if issues found
  if (validationResult.issues > 0) {
    await sendSlackAlert('Resource library issues detected');
  }
}
```

## Security Notes

- Scripts have read-only access by default
- Do not include credentials in scripts
- Use environment variables for sensitive config
- Review script output before sharing publicly
- Store reports in secure location
