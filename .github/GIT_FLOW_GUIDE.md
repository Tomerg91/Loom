# Git Flow Workflow Guide

This repository uses the **Git Flow** branching model. This document outlines how to use it effectively.

## Branch Structure

```
main (production)
  ├── releases/v*.*.* (release branches)
  └── hotfix/* (hotfix branches)

develop (staging/integration)
  ├── feature/* (feature branches)
  ├── bugfix/* (bug fix branches)
  └── refactor/* (refactoring branches)
```

## Branch Types

### Main Branch (`main`)

- **Purpose:** Production-ready code
- **Protection:** Requires 1 approval, enforce admins
- **Merge From:** `release/` and `hotfix/` branches only
- **Tag:** Version tags (v1.0.0, v1.1.0, etc.)

### Develop Branch (`develop`)

- **Purpose:** Integration branch for features
- **Protection:** No PR required, relaxed rules
- **Merge From:** `feature/`, `bugfix/`, `refactor/` branches
- **Usage:** Source for release branches

### Feature Branches (`feature/*`)

- **Naming:** `feature/FEATURE-NAME` (e.g., `feature/user-authentication`)
- **Based On:** `develop`
- **Merge Back To:** `develop` via Pull Request
- **Typical Lifespan:** 2-7 days

### Bugfix Branches (`bugfix/*`)

- **Naming:** `bugfix/ISSUE-ID-DESCRIPTION` (e.g., `bugfix/123-signin-redirect`)
- **Based On:** `develop`
- **Merge Back To:** `develop` via Pull Request
- **Typical Lifespan:** 1-3 days

### Release Branches (`release/*`)

- **Naming:** `release/v*.*.* ` (e.g., `release/v1.2.0`)
- **Based On:** `develop`
- **Purpose:** Prepare for production release
- **Allowed Changes:** Version bumps, release notes, critical fixes
- **Merge To:** `main` (tag), and back to `develop`

### Hotfix Branches (`hotfix/*`)

- **Naming:** `hotfix/ISSUE-ID-DESCRIPTION` (e.g., `hotfix/456-payment-bug`)
- **Based On:** `main`
- **Purpose:** Critical production fixes
- **Merge To:** `main` (tag) and `develop`
- **Typical Lifespan:** 1-2 days

## Workflow Steps

### Creating a Feature

```bash
# 1. Start from develop and pull latest
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/my-feature

# 3. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 4. Push branch and create PR
git push -u origin feature/my-feature

# 5. On GitHub:
#    - Create Pull Request to develop
#    - Add labels: type:feature, priority:medium
#    - Request review
#    - Wait for approval

# 6. After approval, merge via GitHub UI
# 7. Delete feature branch
git branch -d feature/my-feature
git push origin --delete feature/my-feature
```

### Creating a Release

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create release branch
git checkout -b release/v1.2.0

# 3. Update version numbers, CHANGELOG, etc.
git add .
git commit -m "chore: bump version to 1.2.0"

# 4. Push and create PR to main
git push -u origin release/v1.2.0

# 5. After testing and approval:
#    - Merge to main with tag
#    - Merge back to develop

git checkout main
git merge --no-ff release/v1.2.0 -m "Merge release 1.2.0"
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin main --tags

git checkout develop
git merge --no-ff release/v1.2.0
git push origin develop

# 6. Delete release branch
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

### Creating a Hotfix

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create hotfix branch
git checkout -b hotfix/critical-bug-fix

# 3. Make critical fix and commit
git add .
git commit -m "fix: critical production bug"

# 4. Merge to main and tag
git checkout main
git merge --no-ff hotfix/critical-bug-fix
git tag -a v1.1.1 -m "Hotfix version 1.1.1"
git push origin main --tags

# 5. Merge back to develop
git checkout develop
git merge --no-ff hotfix/critical-bug-fix
git push origin develop

# 6. Delete hotfix branch
git branch -d hotfix/critical-bug-fix
git push origin --delete hotfix/critical-bug-fix
```

## Commit Message Convention

Follow this format for commit messages:

```
<type>: <subject>

<body>

<footer>
```

### Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Tests
- `chore:` - Build, dependencies, etc.

### Examples

```
feat: add user authentication system

Implement JWT-based authentication with refresh tokens
and email verification support.

Closes #123
```

```
fix: resolve signin redirect issue

The redirect was using hardcoded paths instead of
locale-aware paths. Now uses i18n Link component.

Fixes #456
```

## Labels

Use these labels when creating issues and PRs:

### Type Labels

- `type:feature` - New feature
- `type:bug` - Bug report/fix
- `type:hotfix` - Critical production fix
- `type:docs` - Documentation
- `type:refactor` - Code refactoring

### Priority Labels

- `priority:critical` - P0 - Must fix immediately
- `priority:high` - P1 - Important
- `priority:medium` - P2 - Normal
- `priority:low` - P3 - Nice to have

### Status Labels

- `status:ready` - Ready to work on
- `status:in-progress` - Currently being worked
- `status:review` - Awaiting review
- `status:blocked` - Blocked by dependencies

## Pull Request Guidelines

1. **Branch Naming:** Use meaningful names
   - ✅ `feature/oauth-integration`
   - ❌ `feature/stuff`, `feature/new-thing`

2. **PR Title:** Use commit message convention
   - ✅ `feat: add OAuth authentication`
   - ❌ `Update code`, `Fix things`

3. **PR Description:** Use the template
   - Describe changes clearly
   - Link related issues
   - Add testing info

4. **Review:**
   - Request reviews from team
   - Address feedback
   - Get approval before merging

5. **Merging:**
   - Use "Squash and merge" for features (keep history clean)
   - Use "Create merge commit" for releases/hotfixes (preserve branch info)
   - Delete branch after merge

## Protection Rules

### Main Branch

- ✅ Requires 1 approved review
- ✅ Enforces admin approval
- ✅ Dismisses stale reviews
- ❌ No force pushes allowed
- ❌ No deletions allowed

### Develop Branch

- ⚠️ Limited protections (integration branch)
- ✅ Dismisses stale reviews
- ❌ No force pushes allowed

## Tips & Best Practices

1. **Rebase before PR:** Keep commit history clean

   ```bash
   git rebase develop
   git push -f origin feature/my-feature
   ```

2. **Small PRs:** Easier to review and merge
   - Aim for 200-400 line changes
   - Single responsibility

3. **Keep branches updated:**

   ```bash
   git fetch origin
   git rebase origin/develop
   ```

4. **Descriptive commit messages:** Future you will thank you

5. **Test before pushing:** Don't rely on CI to find bugs

## Troubleshooting

### Merge Conflicts

```bash
# Update branch with develop
git fetch origin
git rebase origin/develop

# Fix conflicts in your editor
# Then continue rebase
git add .
git rebase --continue
git push -f origin feature/my-feature
```

### Need to switch branches

```bash
# Save work without committing
git stash

# Switch and do something else
git checkout other-branch

# Come back and restore
git checkout original-branch
git stash pop
```

### Accidentally committed to develop

```bash
# Create branch from current commit
git branch feature/my-feature

# Reset develop to before your commit
git reset --hard origin/develop

# Switch to your feature branch
git checkout feature/my-feature
```

## Questions?

- Check the [GitHub documentation](https://docs.github.com/en/get-started/using-git)
- Review [conventional commits](https://www.conventionalcommits.org/)
- Ask the team!
