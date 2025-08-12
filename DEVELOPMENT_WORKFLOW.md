# Development Workflow Guide

This document outlines the comprehensive development workflow hooks and tools configured for the Loom Coaching Platform.

## 🚀 Quick Start

### Enhanced Development Server
```bash
# Start development server with auto-formatting and monitoring
npm run dev:watch

# Traditional development server
npm run dev
```

### Bundle Analysis
```bash
# Full bundle analysis with reports
npm run analyze

# Quick bundle size check
npm run analyze:quick

# Size regression check (CI-friendly)
npm run analyze:size-check
```

## 🔧 Git Hooks Overview

Our Git hooks are designed to catch issues early and maintain code quality throughout the development process.

### Pre-Commit Hook 🔍

**Triggered:** Before each commit
**Duration:** ~30-60 seconds
**Purpose:** Fast quality checks on staged changes

**What it does:**
- ✅ TypeScript type checking
- ✅ ESLint linting with auto-fix
- ✅ Prettier formatting
- ✅ Focused unit tests on changed files
- ✅ Security audit for package.json changes
- ✅ Supabase type generation for migration changes
- ✅ Environment variable validation
- ✅ Bundle impact analysis for large changes (5+ files)

**Configuration:** `.lintstagedrc.js`

### Pre-Push Hook 🚀

**Triggered:** Before pushing to remote
**Duration:** ~2-5 minutes
**Purpose:** Comprehensive validation before sharing code

**What it does:**
- ✅ Full TypeScript compilation
- ✅ Complete ESLint validation
- ✅ Full test suite (unit + integration)
- ✅ Security audit (high-level vulnerabilities)
- ✅ Production build verification
- ✅ Critical E2E tests (if routes changed)
- ✅ Bundle size regression check

**Smart features:**
- Skips E2E tests if no route changes detected
- Only runs if development server is available
- Provides actionable warnings for issues

### Post-Merge Hook 🔄

**Triggered:** After successful merge/pull
**Duration:** ~30-90 seconds
**Purpose:** Automatic maintenance and updates

**What it does:**
- 🔄 Dependency installation (if package files changed)
- 🔄 Supabase type generation (if migrations changed)
- 🔄 Next.js cache clearing (if config changed)
- 🔄 Security audit after dependency updates
- 🔄 Documentation change notifications
- 🔄 Environment variable update alerts

## 🛠️ Development Tools

### Enhanced Dev Server (`npm run dev:watch`)

**Features:**
- 📁 Auto-restart on configuration changes
- ✨ Auto-format files on save (with debouncing)
- 📦 Bundle size monitoring every 30 seconds
- 🎨 Colored output with clear status indicators
- 🔄 Graceful shutdown handling

**Monitored files for restart:**
- `next.config.js`
- `tailwind.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `middleware.ts`
- `package.json`
- `.env.local`
- `.env.development`

### Bundle Size Monitoring

**Full Analysis (`npm run analyze`):**
- Complete webpack bundle analysis
- Interactive reports in browser
- Chunk-by-chunk breakdown
- Performance recommendations

**Quick Check (`npm run analyze:quick`):**
- Fast estimation without building
- Development-time size awareness
- Integrated into dev server

**Regression Detection (`npm run analyze:size-check`):**
- CI/CD friendly exit codes
- 50KB or 10% increase triggers warnings
- Historical size tracking
- Automatic optimization suggestions

### Environment Validation (`npm run validate:env`)

**Security checks:**
- Detects exposed secrets in environment files
- Validates required environment variables
- Provides security recommendations

## 📊 Performance Metrics

### Bundle Size Thresholds
- **Warning:** Total bundle > 500KB
- **Critical:** JavaScript > 300KB
- **Regression:** 50KB increase or 10% growth
- **CSS Warning:** Styles > 50KB

### Test Performance
- **Unit tests:** < 10 seconds for changed files
- **Full test suite:** < 2 minutes
- **E2E tests:** < 5 minutes (critical scenarios only)

## 🔧 Configuration Files

### Core Configuration
- `.lintstagedrc.js` - Pre-commit file processing
- `.husky/_/pre-commit` - Pre-commit hook script
- `.husky/_/pre-push` - Pre-push hook script
- `.husky/_/post-merge` - Post-merge hook script

### Support Scripts
- `scripts/dev-watch.js` - Enhanced development server
- `scripts/bundle-monitor.js` - Bundle size analysis
- `scripts/validate-env.js` - Environment validation

### Monitoring Files
- `.bundle-history.json` - Bundle size history (auto-generated)

## 🚨 Troubleshooting

### Common Issues

**Hook takes too long:**
```bash
# Skip hooks for emergency commits (use sparingly)
git commit --no-verify -m "Emergency fix"
```

**Bundle analysis fails:**
```bash
# Clear Next.js cache and retry
rm -rf .next
npm run analyze
```

**Type checking errors:**
```bash
# Check specific files
npx tsc --noEmit src/path/to/file.ts
```

**Environment validation fails:**
```bash
# Check specific environment file
npm run validate:env
```

### Performance Tips

**Speed up pre-commit:**
- Stage only necessary files
- Use focused commits (single feature/fix)
- Keep changes under 5 files when possible

**Speed up pre-push:**
- Ensure development server is running for E2E tests
- Run tests locally before pushing: `npm test`
- Use `npm run build` to catch build errors early

## 📈 Workflow Benefits

### Developer Experience
- ⚡ **Faster feedback loops** - Issues caught immediately
- 🎯 **Focused testing** - Only test what changed
- 🤖 **Automatic formatting** - Consistent code style
- 📊 **Performance awareness** - Bundle size monitoring

### Code Quality
- 🐛 **Early bug detection** - Pre-commit validation
- 🔒 **Security scanning** - Dependency and environment checks
- 🧪 **Comprehensive testing** - Multi-layer test strategy
- 📝 **Type safety** - Full TypeScript validation

### Team Collaboration
- 🤝 **Consistent standards** - Automated formatting and linting
- 🚀 **Deployment confidence** - Pre-push validation
- 🔄 **Seamless updates** - Post-merge automation
- 📚 **Documentation** - Clear workflow guidelines

## 🎯 Best Practices

### For Daily Development
1. Use `npm run dev:watch` for enhanced development experience
2. Make focused commits with clear messages
3. Run `npm run analyze:quick` before large feature commits
4. Keep bundle size in mind when adding dependencies

### For Code Reviews
1. Check bundle size impact in PR descriptions
2. Verify E2E test status for UI changes
3. Review security audit results
4. Confirm build passes locally

### For Releases
1. Run full test suite: `npm run test:all`
2. Analyze bundle size: `npm run analyze`
3. Validate environment setup: `npm run validate:env`
4. Check production build: `npm run build`

---

**Need help?** Check the troubleshooting section or reach out to the development team.

**Performance issues?** Review the bundle analysis reports and consider code splitting for large components.