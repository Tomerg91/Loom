# Sprint 06 Plan - Production Readiness & Critical Fixes

**Sprint Period:** Week of November 6, 2025 (2-week sprint)
**Status:** 🟢 PLANNING
**Priority:** P0 - Critical Path to Production
**Current Project Completion:** 90%

---

## Executive Summary

Sprint 06 focuses on addressing critical blockers and high-priority features needed for production launch. Building on recent authentication improvements (token-based auth, cookie propagation fixes from sprints 04-05), this sprint targets the remaining 10% needed for production deployment.

### Sprint Goals

1. **Fix Critical Blockers** - Resolve TypeScript build errors and production readiness issues
2. **Complete Authentication Polish** - Verify and test recent auth fixes
3. **Feature Completion** - Finish Practice Journal integration and Resources Library
4. **Production Preparation** - Code cleanup, performance optimization, and deployment prep

---

## Sprint Backlog

### Priority P0 - Critical Blockers (Week 1)

#### Story 1: TypeScript Build Errors Resolution
**Points:** 8
**Owner:** Dev Team
**Status:** 🔴 BLOCKER

**Description:**
Fix 50+ TypeScript compilation errors preventing production builds.

**Acceptance Criteria:**
- [ ] `npm run build` succeeds without errors
- [ ] Zero TypeScript errors in CI/CD pipeline
- [ ] All imports resolve correctly
- [ ] Type safety maintained throughout codebase

**Tasks:**
1. Fix `createAuthService` Promise type issues
   - Make function synchronous OR update all call sites to await
   - Update 20+ API route files
2. Regenerate Supabase types
   - Run `npm run supabase:types`
   - Update imports throughout codebase
3. Fix Next.js 15 async params handling
   - Update page components to handle Promise params
   - Verify locale routing works correctly
4. Address remaining type errors
   - Review and fix prop type mismatches
   - Fix any React 19 compatibility issues

**Files to Update:**
```
src/lib/auth/auth.ts
src/app/api/auth/*/route.ts (15+ files)
src/app/[locale]/*/page.tsx
```

**Dependencies:**
- None (critical path)

**Risk:** HIGH - May uncover additional issues
**Mitigation:** Start immediately, allocate buffer time

---

#### Story 2: Authentication Flow Verification
**Points:** 5
**Owner:** Dev Team
**Status:** 🟡 IN PROGRESS

**Description:**
Verify and test recent authentication fixes from sprints 04-05, including token-based auth and cookie propagation.

**Acceptance Criteria:**
- [ ] Sign-in flow works without redirect loops
- [ ] Token-based auth correctly handles all API routes
- [ ] Cookie propagation works across all endpoints
- [ ] Locale routing doesn't create double prefixes
- [ ] MFA flow works end-to-end

**Tasks:**
1. End-to-end auth testing
   - Test sign-in with email/password
   - Test sign-up flow
   - Test MFA enrollment and verification
   - Test password reset
2. Verify cookie propagation
   - Test all API routes receive correct auth context
   - Verify authenticated client helper works
   - Test Edge Runtime compatibility
3. Locale routing validation
   - Test language switching
   - Verify no double-locale prefixes
   - Test RTL layout (Hebrew)

**Test Scenarios:**
```
✓ User signs in → Dashboard loads correctly
✓ User signs up → Email verification → Profile creation
✓ User enables MFA → Signs out → Signs in with MFA
✓ User resets password → Receives email → Updates password
✓ Language switches → Layout updates → Auth persists
```

**Dependencies:**
- Story 1 (TypeScript fixes)

**Risk:** MEDIUM - Recent refactoring may have edge cases
**Mitigation:** Comprehensive test coverage

---

#### Story 3: Console Logs & Debug Code Removal
**Points:** 3
**Owner:** Dev Team
**Status:** 🟡 HIGH

**Description:**
Remove 227 console.log statements and debug code from production codebase.

**Acceptance Criteria:**
- [ ] No console.log statements in production build
- [ ] Proper logging service implemented
- [ ] Sentry error tracking configured
- [ ] Debug logs only in development mode

**Tasks:**
1. Create logging service
   ```typescript
   // src/lib/logger.ts
   export const logger = {
     debug: (msg: string, data?: any) => {
       if (process.env.NODE_ENV === 'development') {
         console.log(msg, data);
       }
     },
     error: (msg: string, error?: any) => {
       console.error(msg, error);
       if (process.env.NODE_ENV === 'production') {
         Sentry.captureException(error);
       }
     },
     info: (msg: string, data?: any) => {
       console.info(msg, data);
     },
     warn: (msg: string, data?: any) => {
       console.warn(msg, data);
     }
   };
   ```

2. Replace console.log throughout codebase
   ```bash
   # Find all console.log statements
   grep -r "console\.log" src/ --include="*.ts" --include="*.tsx"

   # Replace with logger.debug
   # Use global find/replace in IDE
   ```

3. Configure Sentry
   - Set up Sentry DSN in environment variables
   - Initialize Sentry in app initialization
   - Test error reporting

**Files to Update:**
```
src/lib/logger.ts (create)
src/app/**/*.{ts,tsx} (227 files)
src/components/**/*.{ts,tsx}
src/lib/**/*.{ts,tsx}
```

**Dependencies:**
- None

**Risk:** LOW - Straightforward refactor
**Mitigation:** Use automated find/replace, review changes

---

### Priority P1 - High Priority Features (Week 1-2)

#### Story 4: Practice Journal Integration
**Points:** 5
**Owner:** Dev Team
**Status:** 🟡 HIGH

**Description:**
Complete Practice Journal integration into client dashboard with Hebrew translations.

**Acceptance Criteria:**
- [ ] Practice Journal tab visible in client dashboard
- [ ] All text translated to Hebrew
- [ ] Mobile responsive design
- [ ] Share/unshare functionality works
- [ ] Empty states display correctly

**Tasks:**
1. Add Practice Journal tab to client dashboard
   ```typescript
   // src/components/client/client-dashboard.tsx
   const tabs = [
     { key: 'overview', label: t('dashboard.overview') },
     { key: 'sessions', label: t('dashboard.sessions') },
     { key: 'practice-journal', label: t('dashboard.practiceJournal') },
     { key: 'resources', label: t('dashboard.resources') },
   ];
   ```

2. Complete Hebrew translations
   ```json
   // src/messages/he.json
   {
     "dashboard.practiceJournal": "יומן תרגול",
     "practiceJournal.title": "יומן התרגול שלי",
     "practiceJournal.addEntry": "הוסף רשומה",
     "practiceJournal.shareWithCoach": "שתף עם המאמן",
     "practiceJournal.unshare": "הסר שיתוף",
     "practiceJournal.empty": "טרם הוספת רשומות ליומן התרגול"
   }
   ```

3. Test responsive design
   - Mobile (320px - 768px)
   - Tablet (768px - 1024px)
   - Desktop (1024px+)

4. Test share functionality
   - Share entry with coach
   - Unshare entry
   - Coach can view shared entries

**Files to Update:**
```
src/components/client/client-dashboard.tsx
src/messages/he.json
src/messages/en.json
src/components/client/practice-journal.tsx
```

**Dependencies:**
- None

**Risk:** LOW - Feature already implemented, needs integration
**Mitigation:** Thorough testing of share functionality

---

#### Story 5: Resources Library - Backend Foundation
**Points:** 8
**Owner:** Dev Team
**Status:** 🟡 HIGH

**Description:**
Implement Resources Library backend - database schema, API endpoints, and RLS policies.

**Acceptance Criteria:**
- [ ] Database migration applied successfully
- [ ] All API endpoints implemented and tested
- [ ] RLS policies enforced at database level
- [ ] Storage bucket configured for resource files
- [ ] API documentation updated

**Tasks:**

**Day 1: Database Schema**
1. Create migration file
   ```sql
   -- supabase/migrations/[timestamp]_resources_library.sql
   CREATE TABLE resources (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     coach_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     description TEXT,
     type TEXT NOT NULL CHECK (type IN ('video', 'audio', 'pdf', 'link')),
     url TEXT NOT NULL,
     thumbnail_url TEXT,
     tags TEXT[],
     category TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   );

   CREATE TABLE resource_assignments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
     client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     assigned_by UUID NOT NULL REFERENCES auth.users(id),
     assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     viewed_at TIMESTAMPTZ,
     completed_at TIMESTAMPTZ,
     notes TEXT,
     UNIQUE(resource_id, client_id)
   );

   -- Indexes
   CREATE INDEX idx_resources_coach_id ON resources(coach_id);
   CREATE INDEX idx_resources_type ON resources(type);
   CREATE INDEX idx_resource_assignments_client_id ON resource_assignments(client_id);
   CREATE INDEX idx_resource_assignments_resource_id ON resource_assignments(resource_id);

   -- Enable RLS
   ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
   ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;

   -- RLS Policies
   CREATE POLICY "Coaches can manage their resources"
     ON resources FOR ALL TO authenticated
     USING (coach_id = auth.uid())
     WITH CHECK (coach_id = auth.uid());

   CREATE POLICY "Clients can view assigned resources"
     ON resources FOR SELECT TO authenticated
     USING (
       id IN (
         SELECT resource_id FROM resource_assignments
         WHERE client_id = auth.uid()
       )
     );

   CREATE POLICY "Coaches can manage assignments"
     ON resource_assignments FOR ALL TO authenticated
     USING (
       assigned_by = auth.uid() OR
       client_id = auth.uid()
     );
   ```

2. Create storage bucket
   ```typescript
   // Create bucket via Supabase dashboard or CLI
   // Bucket name: 'resource-files'
   // Public: false
   // File size limit: 50MB
   ```

**Day 2: API Endpoints**
1. Coach endpoints
   ```
   POST /api/coach/resources
   GET /api/coach/resources
   GET /api/coach/resources/[id]
   PUT /api/coach/resources/[id]
   DELETE /api/coach/resources/[id]
   POST /api/coach/resources/[id]/assign
   ```

2. Client endpoints
   ```
   GET /api/client/resources
   GET /api/client/resources/[id]
   PATCH /api/client/resources/[id]/viewed
   PATCH /api/client/resources/[id]/completed
   ```

**Day 3: Testing**
1. Unit tests for API endpoints
2. RLS policy tests
3. File upload tests
4. Assignment flow tests

**Files to Create:**
```
supabase/migrations/[timestamp]_resources_library.sql
src/app/api/coach/resources/route.ts
src/app/api/coach/resources/[id]/route.ts
src/app/api/coach/resources/[id]/assign/route.ts
src/app/api/client/resources/route.ts
src/app/api/client/resources/[id]/route.ts
src/app/api/client/resources/[id]/viewed/route.ts
src/app/api/client/resources/[id]/completed/route.ts
src/lib/database/resources.ts
```

**Dependencies:**
- Story 1 (TypeScript fixes)

**Risk:** MEDIUM - New feature with complex interactions
**Mitigation:** Build incrementally, test each component

---

#### Story 6: Resources Library - Frontend UI
**Points:** 8
**Owner:** Dev Team
**Status:** 🟡 HIGH

**Description:**
Implement Resources Library frontend for both coach and client interfaces.

**Acceptance Criteria:**
- [ ] Coach can create/edit/delete resources
- [ ] Coach can assign resources to clients
- [ ] Client can view assigned resources
- [ ] Client can mark resources as viewed/completed
- [ ] Grid layout with thumbnails
- [ ] Filter and search functionality
- [ ] Mobile responsive

**Tasks:**

**Day 1: Coach Interface**
1. Create resources management page
   ```typescript
   // src/app/[locale]/coach/resources/page.tsx
   // Features:
   // - Resource list with grid/list view toggle
   // - Create new resource button
   // - Edit/delete actions
   // - Assign to clients modal
   // - Filter by type/category
   // - Search by title/tags
   ```

2. Create resource form component
   ```typescript
   // src/components/coach/resource-form.tsx
   // Fields:
   // - Title (required)
   // - Description (textarea)
   // - Type (select: video/audio/pdf/link)
   // - URL or file upload
   // - Thumbnail upload
   // - Tags (multi-select)
   // - Category (select)
   ```

3. Create assign modal
   ```typescript
   // src/components/coach/resource-assign-modal.tsx
   // Features:
   // - Multi-select clients
   // - Optional notes
   // - Auto-notify option
   ```

**Day 2: Client Interface**
1. Create resources view page
   ```typescript
   // src/app/[locale]/client/resources/page.tsx
   // Features:
   // - Grid view of assigned resources
   // - Filter by type/status
   // - Search by title
   // - Progress indicators
   // - Quick actions: view, mark complete
   ```

2. Create resource detail view
   ```typescript
   // src/components/client/resource-detail.tsx
   // Features:
   // - Resource preview (video player, PDF viewer, etc.)
   // - Description and notes
   // - Progress tracking
   // - Mark as completed button
   ```

**Day 3: Polish & Testing**
1. Responsive design testing
2. Resource type handling (video, audio, PDF, links)
3. Empty states and loading skeletons
4. Error handling and validation
5. Hebrew translations

**Files to Create:**
```
src/app/[locale]/coach/resources/page.tsx
src/app/[locale]/client/resources/page.tsx
src/components/coach/resource-form.tsx
src/components/coach/resource-list.tsx
src/components/coach/resource-assign-modal.tsx
src/components/client/resource-grid.tsx
src/components/client/resource-detail.tsx
src/lib/hooks/use-resources.ts
src/messages/*/resources.json
```

**Dependencies:**
- Story 5 (Backend foundation)

**Risk:** MEDIUM - Complex UI with multiple views
**Mitigation:** Build incrementally, use existing component patterns

---

### Priority P2 - Production Readiness (Week 2)

#### Story 7: Code Cleanup & Organization
**Points:** 5
**Owner:** Dev Team
**Status:** 🟢 MEDIUM

**Description:**
Clean up project structure, remove unused files, consolidate documentation.

**Acceptance Criteria:**
- [ ] Clean project root directory
- [ ] Remove duplicate/unused files
- [ ] Consolidate documentation
- [ ] Update .gitignore for generated files
- [ ] Zero ESLint errors

**Tasks:**
1. Root directory cleanup
   ```bash
   # Move test files to /scripts or delete
   # Consolidate 75 markdown files to 10-15 essential
   # Move SQL patches to /supabase/migrations
   # Remove deprecated files
   ```

2. Remove duplicate files
   ```bash
   # Identify with: find . -name "*.ts" -exec md5sum {} + | sort
   # Remove duplicate auth-service.ts
   # Consolidate similar utilities
   ```

3. Documentation consolidation
   - Keep: README.md, CONTRIBUTING.md, CLAUDE.md
   - Keep: docs/FEATURES.md, docs/ADMIN_GUIDE.md
   - Archive: Old planning documents to docs/archive/
   - Remove: Completed/outdated plans

4. ESLint fixes
   ```bash
   npm run lint -- --fix
   # Fix remaining manual issues
   # Update import order
   ```

**Files to Review:**
```
/home/user/Loom/*.md (75 files → 10-15 essential)
/home/user/Loom/*.ts (test files)
/home/user/Loom/*.sql (migration files)
```

**Dependencies:**
- None (can run in parallel)

**Risk:** LOW - Non-breaking cleanup
**Mitigation:** Review changes before committing

---

#### Story 8: Performance Optimization
**Points:** 5
**Owner:** Dev Team
**Status:** 🟢 MEDIUM

**Description:**
Optimize database queries and add performance monitoring.

**Acceptance Criteria:**
- [ ] No N+1 database queries
- [ ] Composite indexes added
- [ ] Dashboard loads <1 second
- [ ] Bundle size analysis complete
- [ ] Core Web Vitals passing

**Tasks:**
1. Database query optimization
   ```sql
   -- Add composite indexes
   CREATE INDEX idx_sessions_coach_status
     ON sessions(coach_id, status, scheduled_at);

   CREATE INDEX idx_sessions_client_status
     ON sessions(client_id, status, scheduled_at);

   CREATE INDEX idx_messages_conversation_created
     ON messages(conversation_id, created_at DESC);

   CREATE INDEX idx_notifications_user_read
     ON notifications(user_id, read, created_at DESC);
   ```

2. Fix N+1 queries
   - Use proper joins in session participant queries
   - Implement SQL aggregation functions
   - Add query caching where appropriate

3. Bundle optimization
   ```bash
   # Analyze bundle size
   npm run build -- --analyze

   # Implement code splitting
   # Lazy load non-critical components
   # Optimize image loading
   ```

4. Performance monitoring
   - Set up Core Web Vitals tracking
   - Add query performance logging
   - Monitor API response times

**Files to Update:**
```
supabase/migrations/[timestamp]_performance_indexes.sql
src/lib/database/*.ts
next.config.js
```

**Dependencies:**
- Story 1 (TypeScript fixes)

**Risk:** LOW - Performance improvements
**Mitigation:** Test thoroughly, measure before/after

---

#### Story 9: Security Audit
**Points:** 3
**Owner:** Dev Team
**Status:** 🟡 HIGH

**Description:**
Conduct security audit before production deployment.

**Acceptance Criteria:**
- [ ] No exposed secrets in git history
- [ ] All security TODOs addressed
- [ ] Rate limiting tested
- [ ] RLS policies validated
- [ ] CORS configured correctly
- [ ] CSP headers implemented

**Tasks:**
1. Secret scanning
   ```bash
   # Check git history for secrets
   git log --all --full-history --source -- "*"

   # Verify service role key not in git
   git log --all --full-history | grep -i "service_role"

   # Check for API keys
   git log --all --full-history | grep -i "api_key"
   ```

2. TODO audit
   ```bash
   # Find all security TODOs
   grep -r "TODO.*security" src/ docs/
   grep -r "FIXME.*security" src/ docs/
   grep -r "XXX" src/ docs/
   ```

3. RLS policy validation
   - Test as different user roles
   - Verify all tables have RLS enabled
   - Check for overly permissive policies

4. Security headers
   ```typescript
   // next.config.js
   const securityHeaders = [
     {
       key: 'X-DNS-Prefetch-Control',
       value: 'on'
     },
     {
       key: 'Strict-Transport-Security',
       value: 'max-age=63072000; includeSubDomains; preload'
     },
     {
       key: 'X-Frame-Options',
       value: 'SAMEORIGIN'
     },
     {
       key: 'X-Content-Type-Options',
       value: 'nosniff'
     },
     {
       key: 'Referrer-Policy',
       value: 'origin-when-cross-origin'
     },
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; ..."
     }
   ];
   ```

**Dependencies:**
- None (critical path)

**Risk:** HIGH - May discover critical issues
**Mitigation:** Start early, allocate time for fixes

---

#### Story 10: End-to-End Testing
**Points:** 5
**Owner:** Dev Team
**Status:** 🟢 MEDIUM

**Description:**
Comprehensive end-to-end testing of all critical user journeys.

**Acceptance Criteria:**
- [ ] All critical paths tested
- [ ] Mobile responsiveness verified
- [ ] RTL layout works (Hebrew)
- [ ] Cross-browser compatibility
- [ ] Accessibility score >90

**Test Scenarios:**

**Coach Journey:**
```
1. Sign up → Email verification → Coach onboarding
2. Set availability → Create resource → Assign to client
3. Book session with client → Complete session notes
4. View dashboard → Check analytics
5. Message client → Share file
6. Enable MFA → Sign out → Sign in with MFA
```

**Client Journey:**
```
1. Sign up → Email verification → Client profile
2. Browse coaches → Book session
3. View assigned resources → Mark complete
4. Add practice journal entry → Share with coach
5. Message coach → Receive notification
6. View dashboard → Check upcoming sessions
```

**Testing Checklist:**
- [ ] Desktop (Chrome, Firefox, Safari, Edge)
- [ ] Mobile (iOS Safari, Chrome Android)
- [ ] Tablet (iPad, Android tablet)
- [ ] RTL layout (Hebrew language)
- [ ] Dark mode (if applicable)
- [ ] Slow network (3G simulation)
- [ ] Screen readers (accessibility)

**Tools:**
```bash
# Playwright E2E tests
npm run test:e2e

# Lighthouse audit
npx lighthouse https://localhost:3000 --view

# Accessibility audit
npx pa11y https://localhost:3000
```

**Dependencies:**
- All other stories (final validation)

**Risk:** MEDIUM - May discover integration issues
**Mitigation:** Test incrementally throughout sprint

---

## Sprint Metrics

### Velocity & Capacity
- **Total Story Points:** 55
- **Estimated Capacity:** 50-60 points (2 developers, 2 weeks)
- **Sprint Velocity:** On track

### Priority Breakdown
- **P0 (Critical):** 16 points (29%)
- **P1 (High):** 26 points (47%)
- **P2 (Medium):** 13 points (24%)

### Risk Assessment
- **High Risk:** 2 stories (TypeScript errors, Security audit)
- **Medium Risk:** 3 stories (Auth verification, Resources backend, E2E testing)
- **Low Risk:** 5 stories (rest)

---

## Definition of Done

For each story to be considered complete:

- [ ] Code implemented and reviewed
- [ ] Unit tests written and passing
- [ ] Integration tests passing (if applicable)
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Accessibility requirements met
- [ ] Mobile responsive
- [ ] Hebrew translations complete
- [ ] Code committed to feature branch
- [ ] PR created and reviewed

---

## Sprint Dependencies

### External Dependencies
- Supabase service availability
- npm package updates (if needed)
- Design assets (for Resources Library)

### Internal Dependencies
```
Story 1 (TypeScript) → BLOCKS → Story 2, 5, 8
Story 5 (Resources Backend) → BLOCKS → Story 6
Story 2 (Auth) → BLOCKS → Story 10
All stories → REQUIRED FOR → Story 10 (E2E testing)
```

---

## Daily Standup Format

**What did I do yesterday?**
- List completed tasks
- Reference story numbers

**What will I do today?**
- List planned tasks
- Identify blockers early

**Any blockers?**
- Technical issues
- Dependency delays
- Resource constraints

**Health metrics:**
- Story completion rate
- Blocker count
- Test coverage %

---

## Sprint Review Checklist

At the end of Sprint 06:

### Completed Deliverables
- [ ] TypeScript builds successfully
- [ ] Authentication flows tested and working
- [ ] Console logs removed
- [ ] Practice Journal integrated
- [ ] Resources Library backend complete
- [ ] Resources Library frontend complete
- [ ] Code cleanup finished
- [ ] Performance optimizations applied
- [ ] Security audit complete
- [ ] E2E tests passing

### Demo Preparation
- [ ] Demo environment configured
- [ ] Test data seeded
- [ ] Demo script prepared
- [ ] Stakeholders invited

### Sprint Retrospective Topics
- What went well?
- What could be improved?
- Action items for Sprint 07

---

## Sprint 07 Preview (Planning Ahead)

If Sprint 06 completes successfully, Sprint 07 will focus on:

1. **Production Deployment** (P0)
   - Environment configuration
   - Database migration to production
   - DNS and SSL setup
   - Monitoring and alerting

2. **Post-Launch Monitoring** (P1)
   - User analytics setup
   - Error tracking
   - Performance monitoring
   - User feedback collection

3. **Nice-to-Have Features** (P2)
   - AI session summaries (if time permits)
   - Calendar integration
   - Enhanced notifications

---

## Success Criteria

Sprint 06 is successful if:

✅ **All P0 stories completed** (TypeScript, Auth, Console logs, Security)
✅ **80% of P1 stories completed** (Practice Journal, Resources Library)
✅ **50% of P2 stories completed** (Code cleanup, Performance, E2E tests)
✅ **Zero critical bugs** in production path
✅ **Test coverage** >70% for new code
✅ **Build time** remains <5 minutes
✅ **No security vulnerabilities** discovered

---

## Communication Plan

### Stakeholder Updates
- **Daily:** Quick status updates via Slack/email
- **Mid-sprint:** Progress review (end of week 1)
- **End of sprint:** Sprint review and demo

### Documentation Updates
- Update README.md with new features
- Update docs/FEATURES.md for Resources Library
- Update CHANGELOG.md with sprint changes
- Update API documentation

### Team Meetings
- **Daily Standup:** 15 minutes, 9:00 AM
- **Mid-Sprint Review:** 1 hour, end of week 1
- **Sprint Review:** 1 hour, end of week 2
- **Sprint Retrospective:** 45 minutes, after review

---

## Rollback Plan

If critical issues are discovered:

### TypeScript Issues
```bash
# Rollback to last working commit
git revert <commit-hash>
# Or create hotfix branch
git checkout -b hotfix/typescript-errors
```

### Database Migration Issues
```bash
# Rollback migration
npx supabase db reset
# Or manually revert
psql -f supabase/migrations/rollback_[timestamp].sql
```

### Feature Issues
- Disable feature flag
- Hide UI elements
- Redirect to alternative flow
- Communicate with users

---

## Tools & Resources

### Development Tools
- **IDE:** VS Code with ESLint, Prettier
- **Database:** Supabase Studio
- **Testing:** Vitest, Playwright, Testing Library
- **Monitoring:** Sentry, Vercel Analytics

### Documentation
- [Master Completion Plan](docs/MASTER_COMPLETION_PLAN.md)
- [Features Guide](docs/FEATURES.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)
- [API Documentation](docs/api/)

### Reference Implementations
- [Tasks Module Plan](docs/plans/2025-10-25-tasks-module-implementation-plan.md)
- [Auth Cookie Fix](docs/plans/2025-10-29-auth-cookie-fix.md)
- [RLS Error Handler](docs/plans/2025-10-20-rls-error-handler-design.md)

---

## Notes

### Technical Debt
Items not addressed in this sprint (for future sprints):
- Bundle size optimization (beyond basic analysis)
- Advanced caching strategies
- GDPR compliance features (data export, account deletion)
- AI-powered features
- Calendar integration
- Video calling integration

### Assumptions
- Supabase production environment is ready
- Design assets available for Resources Library
- Stakeholders available for review
- No major dependency version updates required

### Questions for Product Team
- [ ] Should Resources Library support collections/playlists?
- [ ] Do we need resource analytics (view counts, time spent)?
- [ ] Should coaches be able to schedule resource assignments?
- [ ] Do we need resource comments/feedback from clients?

---

**Sprint 06 Start Date:** November 6, 2025
**Sprint 06 End Date:** November 20, 2025
**Sprint Review:** November 20, 2025, 2:00 PM
**Sprint Retrospective:** November 20, 2025, 3:00 PM

---

**Created by:** Development Team
**Approved by:** Product Owner
**Last Updated:** November 6, 2025

---

## Quick Reference

### Story Priority Order
1. Story 1: TypeScript Fixes (P0) → START IMMEDIATELY
2. Story 9: Security Audit (P0) → START EARLY
3. Story 2: Auth Verification (P0)
4. Story 3: Console Logs (P1)
5. Story 4: Practice Journal (P1)
6. Story 5: Resources Backend (P1)
7. Story 6: Resources Frontend (P1)
8. Story 7: Code Cleanup (P2)
9. Story 8: Performance (P2)
10. Story 10: E2E Testing (P2) → END OF SPRINT

### Critical Path
```
TypeScript Fixes → Auth Verification → Security Audit → E2E Testing → Production Ready
```

### Team Contacts
- **Tech Lead:** [Name]
- **Product Owner:** [Name]
- **DevOps:** [Name]
- **QA:** [Name]

---

**Let's ship it! 🚀**
