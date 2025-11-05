# Sprint 1: Foundation and Critical Infrastructure

**Sprint Duration:** 2 weeks (10 working days)
**Sprint Dates:** [Start Date] to [End Date]
**Phase:** Phase 1 - Foundation and Critical Infrastructure
**Sprint Goal:** Establish solid technical foundations by fixing critical infrastructure issues, improving test reliability, and completing essential TODOs

---

## Table of Contents

1. [Sprint Overview](#sprint-overview)
2. [Sprint Goals](#sprint-goals)
3. [Team Capacity](#team-capacity)
4. [Sprint Backlog](#sprint-backlog)
5. [Task Breakdown by Week](#task-breakdown-by-week)
6. [Daily Schedule](#daily-schedule)
7. [Sprint Ceremonies](#sprint-ceremonies)
8. [Success Metrics](#success-metrics)
9. [Risk Management](#risk-management)
10. [Definition of Done](#definition-of-done)

---

## Sprint Overview

### Context

This is the first sprint of the Loom coaching platform development, focusing on Phase 1: Foundation and Critical Infrastructure. Before building new features, we must ensure our infrastructure is solid, our tests are reliable, and critical technical debt is addressed.

### What We're Building

1. Production-ready error monitoring and handling
2. Reliable test infrastructure
3. Real database health monitoring
4. File organization system with folders
5. Essential database improvements and TODOs

### Why This Sprint Matters

Without solid foundations:
- Production bugs will be hard to diagnose
- Tests will be unreliable, slowing development
- Technical debt will compound
- Future features will be built on shaky ground

This sprint sets us up for rapid, confident development in future sprints.

---

## Sprint Goals

### Primary Goals

1. **Error Visibility**: Implement Sentry integration so all production errors are tracked and actionable
2. **Test Reliability**: Fix all skipped tests so CI/CD is trustworthy
3. **Database Health**: Implement real health monitoring to catch issues early
4. **File Organization**: Complete folder system for better file management

### Secondary Goals

1. Complete 4-5 critical TODOs from codebase
2. Improve developer experience with better error handling
3. Document all changes for future reference

### Sprint Success Criteria

- [ ] Zero skipped tests in test suite
- [ ] Sentry capturing errors in development environment
- [ ] Database health dashboard shows real metrics
- [ ] Files can be organized in folders
- [ ] All sprint tasks meet Definition of Done

---

## Team Capacity

### Assumptions

- Team size: 2-3 developers
- Sprint length: 10 working days
- Available hours per developer: 6 productive hours/day
- Total capacity: 120-180 hours

### Capacity Allocation

- **Development**: 70% (84-126 hours)
- **Testing**: 15% (18-27 hours)
- **Code Review**: 10% (12-18 hours)
- **Documentation**: 5% (6-9 hours)

### Task Estimates

Total story points: 26 points
Average velocity target: 26 points/sprint

---

## Sprint Backlog

### High Priority (Must Complete)

#### Week 1 Focus: Error Handling and Testing

**Task 1.1.1: Integrate Sentry Error Tracking**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Not Started

**Task 1.1.2: Implement Error Boundaries**
- Story Points: 2
- Estimated Hours: 4-6
- Owner: [Frontend Developer]
- Status: Not Started
- Dependencies: Task 1.1.1

**Task 1.2.1: Fix Supabase Realtime Mock Setup**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Not Started

**Task 1.2.2: Fix FileList Polyfill for Tests**
- Story Points: 2
- Estimated Hours: 3-4
- Owner: [Frontend Developer]
- Status: Not Started

#### Week 2 Focus: Database and TODOs

**Task 1.3.1: Implement Database Health Monitoring**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Backend Developer]
- Status: Not Started

**Task 1.3.2: Implement Folder Schema for Files**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Full Stack Developer]
- Status: Not Started

**Task 1.4.1: Implement Coach-Specific Rate Lookup**
- Story Points: 2
- Estimated Hours: 4-5
- Owner: [Backend Developer]
- Status: Not Started

**Task 1.4.3: Add Pagination to Resource Lists**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Full Stack Developer]
- Status: Not Started

### Medium Priority (Nice to Have)

**Task 1.4.7: Implement CSV Export for Analytics**
- Story Points: 2
- Estimated Hours: 4-5
- Owner: [Backend Developer]
- Status: Backlog

**Task 1.4.5: Track Resource Share Analytics**
- Story Points: 2
- Estimated Hours: 4-5
- Owner: [Backend Developer]
- Status: Backlog

### Deferred to Future Sprint

**Task 1.4.2: Implement Session Feedback/Rating System**
- Reason: Depends on session booking system (Phase 2)
- Target Sprint: Sprint 2

**Task 1.4.4: Implement Resource Share Notifications**
- Reason: Depends on notification system (Phase 2)
- Target Sprint: Sprint 3

**Task 1.4.6: Implement Engagement Time Tracking**
- Reason: Lower priority, can be added later
- Target Sprint: Sprint 4

---

## Task Breakdown by Week

### Week 1: Error Handling and Testing (Days 1-5)

**Day 1: Sprint Kickoff and Setup**

Morning:
- Sprint planning meeting (2 hours)
- Environment setup and dependencies
- Create Sentry account and get DSN

Afternoon:
- Start Task 1.1.1: Sentry Integration
  - Install Sentry SDK
  - Configure Sentry for Next.js
- Start Task 1.2.1: Realtime Mock Setup
  - Analyze current test failures
  - Design mock architecture

**Day 2: Error Monitoring Implementation**

Morning:
- Continue Task 1.1.1: Sentry Integration
  - Initialize Sentry client and server config
  - Update error logging function
  - Add breadcrumbs

Afternoon:
- Complete Task 1.1.1: Sentry Integration
  - Configure error sampling
  - Test error capture
  - Verify sourcemaps
- Code review: Task 1.1.1

**Day 3: Error Boundaries and Realtime Mocks**

Morning:
- Start Task 1.1.2: Error Boundaries
  - Create ErrorBoundary component
  - Integrate with Sentry
  - Update PageWrapper

Afternoon:
- Continue Task 1.2.1: Realtime Mock Setup
  - Create Supabase mock with channel support
  - Mock channel methods
  - Update test setup

**Day 4: Complete Testing Infrastructure**

Morning:
- Complete Task 1.1.2: Error Boundaries
  - Add reset functionality
  - Create fallback UI
  - Test error scenarios
- Code review: Task 1.1.2

Afternoon:
- Complete Task 1.2.1: Realtime Mock Setup
  - Re-enable skipped tests
  - Verify all tests pass
  - Document mock usage
- Start Task 1.2.2: FileList Polyfill
  - Create FileList polyfill

**Day 5: Complete Week 1 and Mid-Sprint Review**

Morning:
- Complete Task 1.2.2: FileList Polyfill
  - Add to test setup
  - Re-enable file upload tests
  - Verify all tests pass
- Code review: Tasks 1.2.1 and 1.2.2

Afternoon:
- Mid-sprint review and adjustment
- Merge all Week 1 PRs
- Deploy to staging
- Retrospective discussion
- Plan Week 2 details

**Week 1 Deliverables:**
- [ ] Sentry integration complete and capturing errors
- [ ] Error boundaries protecting all routes
- [ ] All realtime tests passing
- [ ] All file upload tests passing
- [ ] Zero skipped tests in test suite

---

### Week 2: Database and Core TODOs (Days 6-10)

**Day 6: Database Health Monitoring**

Morning:
- Start Task 1.3.1: Database Health Monitoring
  - Create migration for health functions
  - Implement table health check
  - Add index usage statistics

Afternoon:
- Continue Task 1.3.1: Database Health Monitoring
  - Implement slow query detection
  - Add connection pool monitoring
  - Create RLS policy validation

**Day 7: Complete Health Monitoring and Start Folders**

Morning:
- Complete Task 1.3.1: Database Health Monitoring
  - Update getSystemHealth() function
  - Test health checks
  - Verify performance impact
- Code review: Task 1.3.1

Afternoon:
- Start Task 1.3.2: Folder Schema
  - Create folders table migration
  - Add folder_id to file_uploads
  - Create RLS policies

**Day 8: Complete Folder Implementation**

Morning:
- Continue Task 1.3.2: Folder Schema
  - Implement createFolder() method
  - Implement getFolderContents() method
  - Implement moveToFolder() method

Afternoon:
- Complete Task 1.3.2: Folder Schema
  - Add folder tree query
  - Update API endpoints
  - Test folder operations
- Code review: Task 1.3.2

**Day 9: Coach Rates and Pagination**

Morning:
- Start Task 1.4.1: Coach-Specific Rate Lookup
  - Create migration for coach rates
  - Update getSessionRate() function
  - Add rate caching

Afternoon:
- Complete Task 1.4.1: Coach-Specific Rate Lookup
  - Test rate lookup
  - Test caching
- Start Task 1.4.3: Pagination
  - Add count query to resources
  - Implement cursor-based pagination

**Day 10: Sprint Completion and Review**

Morning:
- Complete Task 1.4.3: Pagination
  - Update API endpoints
  - Update UI components
  - Test pagination
- Code reviews: Tasks 1.4.1 and 1.4.3
- Stretch: Start Task 1.4.7 (CSV Export) if time permits

Afternoon:
- Final testing and bug fixes
- Merge all PRs
- Deploy to staging
- Sprint review meeting (demonstrate completed work)
- Sprint retrospective
- Sprint 2 planning preparation

**Week 2 Deliverables:**
- [ ] Database health dashboard shows real metrics
- [ ] Folder system complete and functional
- [ ] Coach rates stored and retrieved from database
- [ ] Resource pagination working
- [ ] All code merged and deployed to staging

---

## Daily Schedule

### Daily Standup (15 minutes, 9:00 AM)

Format:
1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or help needed?

Guidelines:
- Keep it under 15 minutes
- Focus on progress toward sprint goal
- Raise blockers immediately
- Take detailed discussions offline

### Core Working Hours

- 9:00 AM - 12:00 PM: Deep work (no meetings)
- 12:00 PM - 1:00 PM: Lunch break
- 1:00 PM - 3:00 PM: Deep work or collaboration
- 3:00 PM - 5:00 PM: Code review, testing, documentation

### Pairing Sessions (Optional)

- Tuesday 2:00-4:00 PM: Complex tasks pairing
- Thursday 2:00-4:00 PM: Knowledge sharing pairing

### Code Review

- Reviews should happen within 4 hours of PR creation
- At least one approval required
- Author cannot approve own PR
- All tests must pass before merge

---

## Sprint Ceremonies

### Sprint Planning (Day 1, 2 hours)

**Attendees:** Entire team

**Agenda:**
1. Review sprint goal and objectives (15 min)
2. Walkthrough of each task (45 min)
   - Clarify requirements
   - Identify dependencies
   - Estimate story points
   - Assign owners
3. Capacity check and commitment (15 min)
4. Set up tracking board (15 min)
5. Questions and concerns (30 min)

**Outputs:**
- Sprint backlog finalized
- Tasks assigned to team members
- Story points confirmed
- Tracking board ready

---

### Daily Standup (Daily, 15 minutes)

**Time:** 9:00 AM

**Format:**
- Quick round-robin updates
- Blocker identification
- Brief synchronization

**Rules:**
- Stand if in person
- No problem-solving (take offline)
- Be on time

---

### Mid-Sprint Review (Day 5, 1 hour)

**Attendees:** Entire team

**Agenda:**
1. Review progress (20 min)
   - What's completed
   - What's in progress
   - What's blocked
2. Demo completed work (20 min)
3. Adjust plan if needed (10 min)
4. Mini retrospective (10 min)

**Outputs:**
- Adjusted plan for Week 2
- Risk mitigation strategies
- Team morale check

---

### Sprint Review (Day 10, 1 hour)

**Attendees:** Team + stakeholders

**Agenda:**
1. Demo all completed work (30 min)
   - Show Sentry error tracking
   - Show passing test suite
   - Show health monitoring dashboard
   - Show folder organization
   - Show other completed features
2. Review sprint metrics (15 min)
3. Stakeholder feedback (15 min)

**Outputs:**
- Acceptance of completed work
- Feedback for future sprints

---

### Sprint Retrospective (Day 10, 1 hour)

**Attendees:** Team only

**Agenda:**
1. What went well? (15 min)
2. What could be improved? (15 min)
3. Action items for next sprint (20 min)
4. Appreciation round (10 min)

**Format:**
- Use "Start, Stop, Continue" framework
- Everyone contributes
- Focus on process, not people
- Create actionable improvements

**Outputs:**
- 3-5 action items for next sprint
- Updated team agreements

---

## Success Metrics

### Velocity Metrics

**Target Velocity:** 26 story points

**Tracking:**
- Burn-down chart updated daily
- Story points completed vs remaining
- Velocity compared to estimate

### Quality Metrics

**Test Coverage:**
- Target: Maintain or improve current coverage
- No decrease in coverage percentage
- Zero skipped tests

**Code Quality:**
- All PRs reviewed by at least one team member
- No critical security vulnerabilities
- Linting passes on all code

**Production Readiness:**
- Sentry capturing errors
- Health monitoring functional
- All features tested in staging

### Team Metrics

**Code Review Time:**
- Target: < 4 hours from PR creation to review
- Target: < 8 hours from review to merge

**PR Size:**
- Target: < 400 lines of code per PR
- Encourages smaller, reviewable changes

**Deployment Frequency:**
- Target: Daily deployments to staging
- Final deployment to staging on Day 10

---

## Risk Management

### Identified Risks

#### Risk 1: Sentry Setup Complexity

**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Follow official Next.js integration guide
- Allocate extra time on Day 1 for setup
- Have backup: use console.error if Sentry fails

**Contingency:**
- If blocked > 4 hours, continue without Sentry
- Create follow-up task for next sprint

---

#### Risk 2: Mock Implementation Challenges

**Probability:** Medium
**Impact:** High (blocks test reliability)

**Mitigation:**
- Study existing Supabase mock patterns
- Reference community examples
- Pair program if stuck

**Contingency:**
- Consider simpler mock approach
- Escalate to tech lead after 1 day
- Worst case: skip complex realtime tests

---

#### Risk 3: Database Migration Issues

**Probability:** Low
**Impact:** High

**Mitigation:**
- Test migrations in local environment first
- Review migration with team before applying
- Take database backup before migration

**Contingency:**
- Have rollback scripts ready
- Prepare to work without new schema
- Can complete in next sprint if critical

---

#### Risk 4: Scope Creep

**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Strict adherence to sprint backlog
- Any new tasks go to backlog
- Mid-sprint review to realign

**Contingency:**
- Drop medium priority tasks first
- Focus on sprint goal over all tasks

---

#### Risk 5: Team Member Unavailability

**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Document all work daily
- Knowledge sharing during standups
- Pair programming for critical tasks

**Contingency:**
- Redistribute tasks
- Reduce sprint scope if needed

---

## Definition of Done

A task is considered "done" when:

### Code Quality
- [ ] Code is written and follows style guide
- [ ] No linting errors or warnings
- [ ] TypeScript types are correct (no `any`)
- [ ] Code is self-documenting with clear naming

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing (if applicable)
- [ ] Manual testing completed
- [ ] Test coverage maintained or improved

### Code Review
- [ ] Pull request created with description
- [ ] At least one approval from team member
- [ ] All review comments addressed
- [ ] No merge conflicts

### Documentation
- [ ] Code comments added for complex logic
- [ ] README updated if needed
- [ ] API documentation updated (if applicable)
- [ ] Task checklist completed in STATE.md

### Integration
- [ ] Merged to main branch
- [ ] Deployed to staging environment
- [ ] Smoke tests pass in staging
- [ ] No errors in Sentry (once implemented)

### Acceptance Criteria
- [ ] All task acceptance criteria met
- [ ] Stakeholder/product owner approved
- [ ] Demo-ready

---

## Sprint Tracking

### Tracking Board Columns

1. **Backlog** - Not started
2. **In Progress** - Active work
3. **Code Review** - PR submitted
4. **Testing** - QA in progress
5. **Done** - Meets Definition of Done

### Daily Updates

**Each team member updates:**
- Move cards on board
- Update hours remaining
- Add comments on progress/blockers
- Link PRs to tasks

### Metrics Dashboard

Track daily:
- Story points completed
- Story points remaining
- Burn-down chart
- PR review time
- Test pass rate
- Deployment status

---

## Tools and Resources

### Development Tools

- **IDE:** VSCode with recommended extensions
- **Testing:** Vitest, Playwright
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry (to be implemented)

### Communication

- **Daily Standup:** Zoom/Google Meet
- **Async Chat:** Slack #loom-dev channel
- **Documentation:** Notion or Confluence
- **Task Tracking:** GitHub Projects or Jira

### Reference Documents

- [STATE.md](./STATE.md) - Complete task specifications
- [MAIN_PAGES_TASKS.md](./MAIN_PAGES_TASKS.md) - Full task list
- [README.md](./README.md) - Project overview
- [docs/FEATURES.md](./docs/FEATURES.md) - Feature documentation

---

## Sprint Checklist

### Before Sprint Starts

- [ ] Sprint planning meeting scheduled
- [ ] All team members available
- [ ] Environment setup instructions ready
- [ ] Sentry account created
- [ ] Tracking board set up

### During Sprint

- [ ] Daily standups happening
- [ ] Burn-down chart updated daily
- [ ] PRs reviewed within 4 hours
- [ ] Blockers escalated immediately
- [ ] Mid-sprint review completed

### End of Sprint

- [ ] All tasks meet Definition of Done
- [ ] Sprint review completed
- [ ] Sprint retrospective completed
- [ ] Metrics collected and analyzed
- [ ] Next sprint planned

---

## Team Agreements

### Working Agreements

1. **Communication**
   - Respond to urgent messages within 2 hours
   - Update status before end of day
   - Raise blockers immediately

2. **Code Quality**
   - Follow existing code style
   - Write tests for all new code
   - Keep PRs small and focused

3. **Collaboration**
   - Help team members when asked
   - Share knowledge proactively
   - Be respectful in code reviews

4. **Time Management**
   - Be on time for meetings
   - Focus time: 9 AM - 12 PM
   - No meetings during focus time

### Code Review Guidelines

**As Author:**
- Keep PRs under 400 lines
- Write clear PR descriptions
- Link to task/issue
- Respond to feedback within 1 day

**As Reviewer:**
- Review within 4 hours
- Be constructive and specific
- Ask questions if unclear
- Approve when satisfied

---

## Emergency Contacts

**Technical Issues:**
- Tech Lead: [Name/Contact]
- DevOps: [Name/Contact]

**Database Issues:**
- DBA/Backend Lead: [Name/Contact]

**Supabase Support:**
- [Support contact/channel]

**General Questions:**
- Team Slack: #loom-dev
- Product Owner: [Name/Contact]

---

## Sprint Closure

At the end of the sprint, complete:

1. [ ] Update all task statuses in STATE.md
2. [ ] Mark checkboxes for completed acceptance criteria
3. [ ] Document lessons learned
4. [ ] Archive sprint artifacts
5. [ ] Prepare Sprint 2 backlog
6. [ ] Update project documentation
7. [ ] Celebrate sprint completion

---

**Sprint Success:** All primary goals achieved, solid foundation established for Phase 2

**Next Sprint Preview:** Sprint 2 will focus on session booking system - the first critical MVP feature

