# Mock Data Replacement - Issue Tracking Guide

This guide explains how to create and track GitHub issues for replacing mock data with real data across the Loom application.

## 📋 Files Created

### 1. `MOCK_DATA_AUDIT.md`
**Complete audit report** of all mock data found in the codebase.

**Contains:**
- Detailed findings with file paths and line numbers
- Current vs. expected behavior for each instance
- Implementation strategies and API designs
- 3-phase implementation roadmap
- Database schema requirements
- Security considerations
- Testing checklist

**Use this for:** Understanding the full scope of the mock data problem

---

### 2. `GITHUB_ISSUES_TEMPLATE.md`
**Ready-to-use GitHub issue templates** with full details.

**Contains:**
- 7 complete issue descriptions
- Implementation details and code examples
- Acceptance criteria for each issue
- Effort estimates and dependencies
- Database schemas and API specifications

**Use this for:** Copy-pasting into GitHub when creating issues manually

---

### 3. `scripts/create-github-issues.sh`
**Automated script** to create all issues via GitHub CLI.

**What it does:**
- Creates 7 labels (priority: high/medium/low, mock-data, api, database, frontend)
- Creates 7 GitHub issues with proper labels and descriptions
- Runs in ~30 seconds

**Requirements:**
- GitHub CLI (`gh`) installed
- Authenticated with `gh auth login`
- Run from repository root

**Usage:**
```bash
./scripts/create-github-issues.sh
```

---

### 4. `MOCK_DATA_ISSUES.csv`
**CSV export** for importing into project management tools.

**Contains:**
- Issue number, title, priority
- Labels, effort estimates
- File locations and line numbers
- Brief descriptions

**Use this for:** Importing into Jira, Linear, Asana, or Excel/Sheets

---

## 🚀 How to Create the GitHub Issues

### Option 1: Automated (Recommended) ⚡

**If you have GitHub CLI installed:**

```bash
# Make sure you're in the repository root
cd /path/to/Loom

# Authenticate with GitHub (if not already)
gh auth login

# Run the script
./scripts/create-github-issues.sh
```

**Output:**
```
🚀 Creating GitHub labels...
✓ priority: high label already exists
✓ mock-data label already exists
...

📝 Creating GitHub issues...
Creating Issue #1: Replace mock users in session creation...
✓ Issue #1 created
...
✅ Successfully created 7 GitHub issues!
```

---

### Option 2: Manual Creation 📝

**If GitHub CLI is not available:**

1. Open `GITHUB_ISSUES_TEMPLATE.md`
2. For each issue section:
   - Copy the **Title**
   - Copy the **Body** (everything under the title)
   - Create new issue on GitHub
   - Add the specified **Labels**
   - Submit

**Steps:**
```
1. Go to: https://github.com/Tomerg91/Loom/issues/new
2. Paste title and body from template
3. Add labels (create them first if needed)
4. Click "Submit new issue"
5. Repeat for all 7 issues
```

---

### Option 3: Import CSV 📊

**If using project management tools:**

1. Open your PM tool (Jira, Linear, Asana, etc.)
2. Look for "Import from CSV" feature
3. Upload `MOCK_DATA_ISSUES.csv`
4. Map columns to your tool's fields
5. Import

**For GitHub Projects:**
- GitHub doesn't support direct CSV import for issues
- Use Option 1 (script) or Option 2 (manual) instead
- After issues are created, add them to a Project board

---

## 📊 Issues Summary

### High Priority (4 issues) 🔴
**Blocking core functionality - implement first**

| # | Title | Files | Effort |
|---|-------|-------|--------|
| 1 | Replace mock users in session creation API | `session-create-page.tsx` | 4-6h |
| 2 | Implement real session creation API | `session-create-page.tsx` | 6-8h |
| 3 | Replace mock sessions in coach page | `coach/sessions/page.tsx` | 8-10h |
| 4 | Replace mock coaches in discovery page | `coaches-page.tsx` | 10-12h |

**Total: 28-36 hours**

---

### Medium Priority (2 issues) 🟡
**Advanced features - implement after high priority**

| # | Title | Files | Effort |
|---|-------|-------|--------|
| 5 | Implement real virtual folders system | `file-management-page.tsx` | 8-10h |
| 6 | Fix system health monitoring metrics | `system-health-display.tsx` | 4-6h |

**Total: 12-16 hours**

---

### Low Priority (1 issue) ⚪
**UI enhancements - implement last**

| # | Title | Files | Effort |
|---|-------|-------|--------|
| 7 | Implement real chart components | `chart-placeholder.tsx` | 12-15h |

**Total: 12-15 hours**

---

## 📅 Recommended Implementation Order

### Sprint 1: Core Session Management (2 weeks)
**Focus: Enable coaches and clients to create and manage real sessions**

1. **Issue #1** - Session users API (4-6h)
   - Create `GET /api/users?role={role}` endpoint
   - Update session creation dropdown

2. **Issue #2** - Session creation API (6-8h)
   - Create `POST /api/sessions` endpoint
   - Save sessions to database
   - Generate meeting URLs

**Sprint Goal:** Users can create real sessions

---

### Sprint 2: Dashboard Data (2 weeks)
**Focus: Display real sessions and coaches**

3. **Issue #3** - Coach sessions page (8-10h)
   - Create `GET /api/sessions?coachId={id}` endpoint
   - Create `GET /api/coach/clients` endpoint
   - Fix revenue calculations

4. **Issue #4** - Coach discovery (10-12h)
   - Create `GET /api/coaches` endpoint
   - Implement search and filtering
   - Update database schema

**Sprint Goal:** Coaches and clients see real data in dashboards

---

### Sprint 3: Advanced Features (1 week)
**Focus: File management and admin tools**

5. **Issue #5** - Virtual folders (8-10h)
   - Create `virtual_folders` table
   - Create CRUD endpoints
   - Enable user-created folders

6. **Issue #6** - System health (4-6h)
   - Fix database connection metrics
   - Add real server metrics
   - Remove mock data

**Sprint Goal:** File management and admin monitoring work with real data

---

### Sprint 4: UI Polish (1 week)
**Focus: Data visualization**

7. **Issue #7** - Chart components (12-15h)
   - Install Recharts library
   - Create 4-5 chart components
   - Add chart data API endpoints

**Sprint Goal:** Dashboards have real data visualizations

---

## 🏷️ GitHub Labels

### Create These Labels First

```bash
# Priority levels
priority: high    - High priority items blocking core functionality [red: d73a4a]
priority: medium  - Medium priority advanced features [yellow: fbca04]
priority: low     - Low priority enhancements [green: 0e8a16]

# Categories
mock-data        - Replace mock data with real data [light blue: c5def5]
api              - API endpoint work [blue: 1d76db]
database         - Database schema or query work [purple: 5319e7]
frontend         - Frontend component work [cyan: bfdadc]
enhancement      - New feature or request [default green]
```

**Quick create:**
```bash
# Run these commands or use the script
gh label create "priority: high" --color "d73a4a" --description "High priority items blocking core functionality"
gh label create "priority: medium" --color "fbca04" --description "Medium priority advanced features"
gh label create "priority: low" --color "0e8a16" --description "Low priority enhancements"
gh label create "mock-data" --color "c5def5" --description "Replace mock data with real data"
gh label create "api" --color "1d76db" --description "API endpoint work"
gh label create "database" --color "5319e7" --description "Database schema or query work"
gh label create "frontend" --color "bfdadc" --description "Frontend component work"
```

---

## 📈 Tracking Progress

### Using GitHub Projects

1. **Create a Project Board**
   ```
   Name: Mock Data Replacement
   Template: Basic kanban
   Columns: To Do, In Progress, In Review, Done
   ```

2. **Add Issues to Project**
   - Add all 7 issues to the board
   - Start in "To Do" column
   - Move to "In Progress" when starting work
   - Move to "In Review" when PR is ready
   - Move to "Done" when merged

3. **Track Progress**
   - Filter by priority: `label:"priority: high"`
   - Filter by type: `label:"api"`
   - Sort by effort: Use issue descriptions

### Using GitHub Milestones

Create milestones for each sprint:
- **Sprint 1: Core Sessions** - Issues #1, #2 (Due: 2 weeks)
- **Sprint 2: Dashboard Data** - Issues #3, #4 (Due: 4 weeks)
- **Sprint 3: Advanced** - Issues #5, #6 (Due: 5 weeks)
- **Sprint 4: UI Polish** - Issue #7 (Due: 6 weeks)

---

## ✅ Verification Checklist

After creating all issues, verify:

- [ ] 7 issues created on GitHub
- [ ] All issues have proper labels
- [ ] Priority labels match (4 high, 2 medium, 1 low)
- [ ] Issues are added to Project board (if using)
- [ ] Issues are assigned to milestones (if using)
- [ ] Team members are assigned to issues
- [ ] Effort estimates are reviewed
- [ ] Implementation order is understood

---

## 🔗 Related Resources

- **Full Audit Report:** `MOCK_DATA_AUDIT.md`
- **Issue Templates:** `GITHUB_ISSUES_TEMPLATE.md`
- **CSV Export:** `MOCK_DATA_ISSUES.csv`
- **Creation Script:** `scripts/create-github-issues.sh`

---

## 💡 Tips

1. **Start with High Priority**
   - Issues #1-4 block core functionality
   - Complete these before medium/low priority

2. **Dependencies Matter**
   - Issue #2 depends on Issue #1
   - Complete in numerical order for easiest path

3. **Test Thoroughly**
   - Each issue has acceptance criteria
   - Don't mark complete until all criteria met

4. **Database First**
   - Issues #4, #5 need schema changes
   - Plan database migrations before coding

5. **Parallel Work**
   - Issues #1 and #3 can be done in parallel
   - Issues #5 and #6 can be done in parallel
   - Assign to different developers

---

## 🆘 Troubleshooting

### Script won't run
```bash
# Make sure it's executable
chmod +x scripts/create-github-issues.sh

# Check gh is installed
gh --version

# Authenticate
gh auth login
```

### Labels already exist
- Script will skip existing labels (safe to run multiple times)
- To recreate: delete labels first on GitHub

### Duplicate issues
- Check if issues exist: `gh issue list --label mock-data`
- Script doesn't check for duplicates
- Delete and re-run if needed

---

**Questions?** See `MOCK_DATA_AUDIT.md` for full technical details.

**Ready to start?** Run `./scripts/create-github-issues.sh` or follow Option 2 above!
