# Supabase Test Suite

This directory contains SQL test files for validating database migrations, security policies, and data integrity.

## Test Files

### `security_definer_regression.sql`

**Purpose**: Validates that all SECURITY DEFINER functions have proper `SET search_path` clauses to prevent privilege escalation attacks.

**Tests**:

- ✅ All SECURITY DEFINER functions have SET search_path
- ✅ Resource library RLS policies reference valid columns
- ✅ Resource collection items - coach access control
- ✅ Push subscriptions table exists
- ✅ Users.mfa_enabled column exists

**Usage**:

```bash
psql -f supabase/tests/security_definer_regression.sql
```

### `resource_library_rls_tests.sql`

**Purpose**: Comprehensive test suite for resource library Row Level Security policies.

**Tests** (11 total):

1. Coach can create collection
2. Coach can add files to collection
3. Coach CANNOT add other coach's files
4. Coach can view own collections
5. Coach CANNOT view other coach's collections
6. Create file share
7. Client can view shared resource
8. Client CANNOT view non-shared resource
9. Client can track own progress
10. Coach can view client progress
11. Coach CANNOT view other coach's progress

**Usage**:

```bash
psql -f supabase/tests/resource_library_rls_tests.sql
```

## Running Tests

### Local Development

```bash
# Start local Supabase
npx supabase start

# Run specific test
npx supabase db execute -f supabase/tests/security_definer_regression.sql

# Run all tests
for test in supabase/tests/*.sql; do
  echo "Running $test..."
  npx supabase db execute -f "$test"
done
```

### CI/CD Integration

Tests are automatically run by GitHub Actions on pull requests that modify migration files.

See `.github/workflows/validate-security-definer.yml`

## Expected Output

### Successful Test Run

```
============================================================================
TEST RESULTS SUMMARY
============================================================================

test_name                                    | status | message
---------------------------------------------+--------+------------------
SECURITY DEFINER search_path check           | PASS   | All functions ok
Resource library RLS column references       | PASS   | Valid columns
...

Total Tests: 5
Passed: 5
Failed: 0

All tests passed!
```

### Failed Test Run

```
WARNING:  Vulnerable function: log_file_download(uuid, uuid, ...)

Total Tests: 5
Passed: 4
Failed: 1

ERROR:  Test suite failed: 1 test(s) failed
```

## Adding New Tests

1. Create a new `.sql` file in this directory
2. Follow the pattern from existing tests:
   - Create temp table for results
   - Use DO blocks for test logic
   - Insert results with PASS/FAIL status
   - Display summary at end
3. Add the test to CI workflow if needed
4. Update this README

## Test Best Practices

- **Isolation**: Tests should not affect each other
- **Cleanup**: Always rollback changes (use transactions)
- **Clear naming**: Test names should describe what is being tested
- **Error messages**: Provide helpful error messages for failures
- **Documentation**: Comment complex test logic

## Related Files

- Migrations: `supabase/migrations/`
- Scripts: `supabase/scripts/`
- CI Workflow: `.github/workflows/validate-security-definer.yml`
- Documentation: `DATABASE_REFACTORING_EXECUTION_SUMMARY.md`
