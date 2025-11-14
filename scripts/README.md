# Scripts Directory

## Audit Issues Creation Script

### Overview
The `create-audit-issues.sh` script creates GitHub issues from the comprehensive technical audit findings.

### Prerequisites

1. **Install GitHub CLI:**
   ```bash
   # macOS
   brew install gh

   # Ubuntu/Debian
   sudo apt install gh

   # Windows
   winget install --id GitHub.cli
   ```

2. **Authenticate GitHub CLI:**
   ```bash
   gh auth login
   ```
   Follow the prompts to authenticate with your GitHub account.

3. **Verify Authentication:**
   ```bash
   gh auth status
   ```

### Usage

Run the script from the repository root:

```bash
./scripts/create-audit-issues.sh
```

### What It Creates

The script will create **34 GitHub issues** organized by priority:

#### 🚨 Critical Priority (8 issues)
1. Generate proper database schema types
2. Remove 273 console statements exposing PII
3. Fix folder API (returns 501 but UI exists)
4. Fix hardcoded online status indicators
5. Implement resource tags filter
6. Fix session booking navigation
7. Complete analytics implementations
8. Implement real system health monitoring

#### ⚠️ High Priority (10 issues)
9. Standardize rate limiting across API
10. Add error boundaries to components
11. Fix pagination total counts
12. Implement missing notifications
13. Fix unsafe date parsing
14. Fix memory leaks from subscriptions
15. Fix authentication race conditions
16. SQL injection security audit
17. Add input sanitization (XSS prevention)
18. Standardize CORS handling

#### 📋 Medium Priority (10 issues)
19. Replace 'any' types (113 files)
20. Increase test coverage to 60%
21. Enable TypeScript strict mode
22. Add React.memo to expensive components
23. Extract duplicate code
24. Add missing loading states
25. Accessibility audit and fixes
26. Implement virtual scrolling
27. Bundle size optimization
28. Environment variable validation

#### 🧹 Code Quality (5 issues)
29. Add JSDoc comments
30. Standardize naming conventions
31. Consolidate file organization
32. Extract magic numbers
33. Remove commented code

#### 📊 Summary Issue (1 issue)
34. Technical Audit Roadmap - tracks all 93 findings

### Labels Created

The script creates the following labels:

**Priority:**
- `priority: critical` - Red
- `priority: high` - Orange-Red
- `priority: medium` - Yellow
- `priority: low` - Green

**Type:**
- `type: bug` - Red
- `type: security` - Dark Red
- `type: performance` - Blue
- `type: tech-debt` - Yellow
- `type: enhancement` - Light Blue

**Area:**
- `area: database` - Light Blue
- `area: api` - Blue
- `area: ui` - Purple
- `area: auth` - Pink
- `area: testing` - Light Green

**Effort:**
- `effort: small` - < 4 hours
- `effort: medium` - 4-16 hours
- `effort: large` - > 16 hours

### Output

The script provides progress updates:

```
🏷️  Creating GitHub labels...
✅ Labels created successfully

🚨 Creating CRITICAL priority issues...
✅ Created 8 CRITICAL issues

⚠️  Creating HIGH priority issues...
✅ Created 10 HIGH priority issues

📋 Creating MEDIUM priority issues...
✅ Created 10 MEDIUM priority issues

🧹 Creating CODE QUALITY issues...
✅ Created 5 CODE QUALITY issues

📊 Creating summary/roadmap issue...
✅ GitHub Issues Creation Complete!
```

### After Running

1. **View Issues:**
   ```bash
   gh issue list
   ```

2. **View by Label:**
   ```bash
   gh issue list --label "priority: critical"
   gh issue list --label "type: security"
   gh issue list --label "area: database"
   ```

3. **Create Project Board:**
   - Go to GitHub repository
   - Create new Project (Board view)
   - Add issues to board
   - Organize by Sprint columns

4. **Assign Team Members:**
   ```bash
   gh issue edit <issue-number> --add-assignee @username
   ```

### Roadmap

**Sprint 1 (Week 1-2):** Critical issues (40-50 hours)
**Sprint 2 (Week 3-4):** High priority & security (60-80 hours)
**Sprint 3 (Week 5-6):** Medium priority (100-120 hours)
**Sprint 4 (Week 7-8):** Code quality (40-60 hours)

**Total Estimated Time:** 240-310 hours (6-8 weeks)

### References

- **Technical Issues Report:** `../TECHNICAL_ISSUES_REPORT.md`
- **Functional Audit:** `../AUDIT_REPORT.md`
- **Audit Branch:** `claude/audit-dashboard-user-exp-011CUtjLU9xjLQyMZJcEU7P3`

### Troubleshooting

**Error: gh: command not found**
- Install GitHub CLI (see Prerequisites)

**Error: authentication failed**
- Run `gh auth login` and follow prompts

**Error: permission denied**
- Ensure script is executable: `chmod +x scripts/create-audit-issues.sh`
- Ensure you have write access to the repository

**Error: label already exists**
- This is normal - script uses `--force` flag to update existing labels

### Support

For issues with the script, contact the development team or refer to the audit reports for detailed context on each issue.
