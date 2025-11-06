# Sprint 2: Session Booking System - Core MVP Feature

**Sprint Duration:** 2 weeks (10 working days)
**Sprint Dates:** [Start Date] to [End Date]
**Phase:** Phase 2 - Core MVP Features
**Sprint Goal:** Deliver a complete, production-ready session booking system enabling clients to discover coaches and book sessions with payments

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

Sprint 2 marks the beginning of Phase 2: Core MVP Features. With our solid foundation from Sprint 1 (error monitoring, reliable tests, database health), we can now focus on delivering critical user-facing features. This sprint delivers the session booking system - the core value proposition of the platform.

### What We're Building

1. Coach availability management with recurring patterns
2. Coach discovery and selection interface
3. Complete session booking workflow with slot reservation
4. Session list and detail views with reschedule/cancel
5. Basic Stripe integration for session payments

### Why This Sprint Matters

The session booking system is the heart of the coaching platform. Without it:
- Clients cannot book coaching sessions
- Coaches cannot manage their availability
- No revenue can be generated
- Platform has no core value proposition

This sprint delivers the minimum viable booking experience needed to launch.

### Dependencies from Sprint 1

This sprint builds on:
- Error tracking (Sentry) for production debugging
- Reliable test suite for confidence in changes
- Database health monitoring for performance
- Folder system for organizing session materials

---

## Sprint Goals

### Primary Goals

1. **Coach Availability**: Coaches can set and manage their availability with recurring patterns
2. **Coach Discovery**: Clients can browse, search, and select coaches
3. **Session Booking**: Clients can book sessions with available coaches through a guided workflow
4. **Session Management**: Users can view, reschedule, and cancel sessions
5. **Payment Integration**: Basic Stripe setup for session payments (if time permits)

### Secondary Goals

1. Session reminder system (email/push notifications)
2. Calendar integration (iCal export)
3. Session rating/feedback UI (deferred from Sprint 1)

### Sprint Success Criteria

- [ ] Coaches can set weekly recurring availability
- [ ] Clients can browse all coaches in directory
- [ ] Complete booking flow works end-to-end
- [ ] Sessions appear in session list
- [ ] Users can cancel sessions (with policy)
- [ ] Stripe test payment completes successfully
- [ ] All sprint tasks meet Definition of Done

---

## Team Capacity

### Assumptions

- Team size: 2-3 developers
- Sprint length: 10 working days
- Available hours per developer: 6 productive hours/day
- Total capacity: 120-180 hours
- Sprint 1 velocity: 26 points (baseline established)

### Capacity Allocation

- **Development**: 70% (84-126 hours)
- **Testing**: 15% (18-27 hours)
- **Code Review**: 10% (12-18 hours)
- **Documentation**: 5% (6-9 hours)

### Task Estimates

Total story points: 34 points (ambitious but achievable)
Target velocity: 30-34 points/sprint

---

## Sprint Backlog

### High Priority (Must Complete - Critical Path)

#### Week 1 Focus: Availability and Coach Discovery

**Task 2.1.1: Implement Coach Availability Management**
- Story Points: 8
- Estimated Hours: 16-20
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: CRITICAL (blocks booking)

**Task 2.1.2: Implement Coach Discovery Interface**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Frontend Developer]
- Status: Not Started
- Priority: CRITICAL (blocks booking)
- Dependencies: Task 2.1.1 (needs availability data)

**Task 1.4.2: Implement Session Feedback/Rating System**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Not Started (deferred from Sprint 1)
- Priority: HIGH (needed for coach ratings)

#### Week 2 Focus: Booking Flow and Session Management

**Task 2.1.3: Implement Session Booking Flow**
- Story Points: 8
- Estimated Hours: 16-20
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: CRITICAL (core feature)
- Dependencies: Tasks 2.1.1, 2.1.2

**Task 2.1.4: Implement Session List and Detail Views**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Frontend Developer]
- Status: Not Started
- Priority: CRITICAL (needed to manage bookings)
- Dependencies: Task 2.1.3

**Task 2.3.1: Set Up Stripe Integration**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Not Started
- Priority: HIGH (needed for payments)

**Task 2.3.2: Implement Session Payment Flow**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: HIGH (monetization)
- Dependencies: Tasks 2.1.3, 2.3.1

### Medium Priority (Nice to Have)

**Session Reminders**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Backlog
- Priority: MEDIUM

**iCal Export**
- Story Points: 2
- Estimated Hours: 4-6
- Owner: [Backend Developer]
- Status: Backlog
- Priority: MEDIUM

### Deferred to Future Sprint

**Task 2.3.3: Implement Payment Management**
- Reason: Not blocking MVP, can be Sprint 3
- Target Sprint: Sprint 3

**Task 2.3.4: Implement Coach Payout System**
- Reason: Complex, needs more time
- Target Sprint: Sprint 3

---

## Task Breakdown by Week

### Week 1: Availability and Discovery (Days 1-5)

**Day 1: Sprint Kickoff and Availability Schema**

Morning:
- Sprint planning meeting (2 hours)
- Review Sprint 1 retrospective action items
- Environment setup (Stripe test account)

Afternoon:
- Start Task 2.1.1: Coach Availability Management
  - Design availability schema enhancements
  - Create migration for recurring patterns
  - Add buffer time fields

**Day 2: Availability Backend Implementation**

Morning:
- Continue Task 2.1.1: Coach Availability
  - Implement recurring pattern logic
  - Add session limit enforcement
  - Create availability exceptions table

Afternoon:
- Continue Task 2.1.1: Coach Availability
  - Implement API endpoints for availability CRUD
  - Add timezone handling
  - Write unit tests for availability logic

**Day 3: Availability UI and Coach Discovery Schema**

Morning:
- Continue Task 2.1.1: Coach Availability
  - Build availability manager UI
  - Add recurring pattern selector
  - Implement vacation/time-off UI
- Code review: Backend portions of 2.1.1

Afternoon:
- Complete Task 2.1.1: Coach Availability
  - Test availability scenarios
  - Test buffer time application
  - Verify timezone conversions
- Start Task 2.1.2: Coach Discovery
  - Design coach directory layout
  - Enhance coaches API with filtering

**Day 4: Coach Discovery Implementation**

Morning:
- Continue Task 2.1.2: Coach Discovery
  - Build coach directory grid/list views
  - Create coach profile cards
  - Add search functionality

Afternoon:
- Continue Task 2.1.2: Coach Discovery
  - Implement filters (specialty, rating, availability)
  - Add sorting options
  - Create coach profile modal
- Start Task 1.4.2: Session Rating System
  - Create session_ratings migration

**Day 5: Complete Discovery and Mid-Sprint Review**

Morning:
- Complete Task 2.1.2: Coach Discovery
  - Display next available slot
  - Add "Book Session" CTAs
  - Test search and filters
- Code review: Tasks 2.1.2

Afternoon:
- Continue Task 1.4.2: Session Rating
  - Implement rating API endpoint
  - Update coach rating calculation
  - Build rating UI component
- Mid-sprint review and adjustment
- Merge Week 1 PRs
- Deploy to staging

**Week 1 Deliverables:**
- [ ] Coaches can set recurring availability with buffers
- [ ] Availability exceptions and time-off work
- [ ] Coach directory displays all coaches
- [ ] Search and filters work correctly
- [ ] Next available slot shown for each coach
- [ ] Session rating schema and API ready

---

### Week 2: Booking Flow and Payment (Days 6-10)

**Day 6: Booking Wizard Foundation**

Morning:
- Complete Task 1.4.2: Session Rating
  - Test rating submission
  - Verify coach rating updates
  - Code review and merge

Afternoon:
- Start Task 2.1.3: Session Booking Flow
  - Design booking wizard steps
  - Create wizard navigation component
  - Implement Step 1: Coach selection

**Day 7: Booking Wizard Steps 2-3**

Morning:
- Continue Task 2.1.3: Booking Flow
  - Implement Step 2: Session type selection
  - Implement Step 3: Date/time picker
  - Integrate with availability API

Afternoon:
- Continue Task 2.1.3: Booking Flow
  - Display available slots in client timezone
  - Implement slot reservation logic (10-minute hold)
  - Add Step 4: Notes/agenda input

**Day 8: Complete Booking Flow and Stripe Setup**

Morning:
- Continue Task 2.1.3: Booking Flow
  - Implement Step 5: Review and confirm
  - Create session on confirmation
  - Send confirmation emails
- Test complete booking flow

Afternoon:
- Code review: Task 2.1.3 (without payment)
- Start Task 2.3.1: Stripe Integration
  - Install Stripe SDK
  - Configure Stripe keys
  - Set up webhook endpoint
  - Test webhook signature verification

**Day 9: Session Management and Payment Integration**

Morning:
- Start Task 2.1.4: Session List and Detail
  - Create session list component
  - Add filters (upcoming, past, cancelled)
  - Implement session detail view
  - Add reschedule functionality

Afternoon:
- Continue Task 2.1.4: Session Management
  - Add cancel functionality with policy
  - Test reschedule and cancel flows
- Start Task 2.3.2: Session Payment Flow
  - Add payment step to booking wizard
  - Integrate Stripe Elements

**Day 10: Sprint Completion and Review**

Morning:
- Complete Task 2.3.2: Session Payment
  - Link payment to session
  - Handle payment failures
  - Test payment flow end-to-end
- Code reviews: Tasks 2.1.4, 2.3.1, 2.3.2
- Final testing and bug fixes

Afternoon:
- Merge all PRs
- Deploy to staging
- End-to-end testing in staging
- Sprint review meeting (demonstrate booking flow)
- Sprint retrospective
- Sprint 3 planning preparation

**Week 2 Deliverables:**
- [ ] Complete booking wizard functional
- [ ] Slot reservation prevents double-booking
- [ ] Sessions created successfully
- [ ] Session list shows all user sessions
- [ ] Reschedule and cancel work correctly
- [ ] Stripe integration configured
- [ ] Test payment completes successfully

---

## Daily Schedule

### Daily Standup (15 minutes, 9:00 AM)

Format:
1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or help needed?

Special focus areas:
- Integration points between tasks
- Availability data quality for booking
- Stripe test environment status

### Core Working Hours

- 9:00 AM - 12:00 PM: Deep work (no meetings)
- 12:00 PM - 1:00 PM: Lunch break
- 1:00 PM - 3:00 PM: Deep work or collaboration
- 3:00 PM - 5:00 PM: Code review, testing, documentation

### Pairing Sessions

- Tuesday 2:00-4:00 PM: Booking wizard pairing
- Thursday 2:00-4:00 PM: Payment integration pairing
- Friday 10:00-12:00 PM: End-to-end testing session

### Code Review

- Reviews should happen within 4 hours of PR creation
- Complex features (booking, payment) require 2 approvals
- All tests must pass before merge
- Manual testing checklist required for booking flow

---

## Sprint Ceremonies

### Sprint Planning (Day 1, 2 hours)

**Attendees:** Entire team

**Agenda:**
1. Review Sprint 1 outcomes and retrospective (15 min)
2. Present Sprint 2 goal and context (15 min)
3. Walkthrough of each task (60 min)
   - Clarify booking flow UX
   - Review availability schema design
   - Discuss Stripe integration approach
   - Identify dependencies and integration points
4. Capacity check and commitment (15 min)
5. Set up tracking board (15 min)

**Outputs:**
- Sprint backlog finalized
- Tasks assigned with dependencies clear
- Booking flow wireframes reviewed
- Stripe test account credentials shared

---

### Daily Standup (Daily, 15 minutes)

**Time:** 9:00 AM

**Focus Areas:**
- Integration between availability and booking
- Stripe test environment issues
- Timezone handling challenges
- Double-booking prevention

**Escalation Triggers:**
- Blocked > 2 hours on same issue
- Availability logic uncertainty
- Payment security questions

---

### Mid-Sprint Review (Day 5, 1 hour)

**Attendees:** Entire team + Product Owner

**Agenda:**
1. Demo completed work (30 min)
   - Show coach availability management
   - Show coach directory with search
   - Show session rating system
2. Review progress vs plan (15 min)
3. Adjust Week 2 plan if needed (10 min)
4. Risk review and mitigation (5 min)

**Outputs:**
- Confirmation to proceed with booking flow
- UX feedback incorporated
- Adjusted plan for Week 2

---

### Sprint Review (Day 10, 1.5 hours)

**Attendees:** Team + stakeholders + potential test users

**Agenda:**
1. Demo complete booking flow (45 min)
   - Coach sets availability
   - Client browses coaches
   - Client books session with payment
   - Client views and manages sessions
2. Review sprint metrics (15 min)
3. Discuss what's ready for beta testing (15 min)
4. Collect feedback (15 min)

**Outputs:**
- Acceptance of completed work
- Beta testing plan
- Feedback for Sprint 3

---

### Sprint Retrospective (Day 10, 1 hour)

**Attendees:** Team only

**Agenda:**
1. What went well? (15 min)
2. What could be improved? (15 min)
3. Action items for Sprint 3 (20 min)
4. Appreciation round (10 min)

**Focus Questions:**
- Did our estimates improve from Sprint 1?
- Was the booking flow design clear enough?
- How well did we handle dependencies?
- What would help us move faster in Sprint 3?

**Outputs:**
- 3-5 action items for Sprint 3
- Updated team agreements

---

## Success Metrics

### Velocity Metrics

**Target Velocity:** 30-34 story points (vs 26 in Sprint 1)

**Tracking:**
- Burn-down chart updated daily
- Story points completed vs remaining
- Velocity trend analysis

**Key Milestones:**
- Day 5: 40-50% of points complete
- Day 7: 60-70% of points complete
- Day 10: 90-100% of points complete

### Quality Metrics

**Test Coverage:**
- Maintain 80%+ coverage
- Critical paths (booking, payment) 100% covered
- No skipped tests

**Bug Metrics:**
- Zero critical bugs in staging
- All bugs documented and triaged
- Bug fix time < 4 hours for critical issues

**Code Quality:**
- All PRs reviewed by 2+ team members for payment code
- No security vulnerabilities in Stripe integration
- Linting passes on all code

### Business Metrics

**Functional Metrics:**
- Complete booking flow < 2 minutes
- Availability management < 5 minutes
- Coach discovery < 30 seconds to find relevant coach
- Payment processing < 30 seconds

**User Experience:**
- Booking wizard completion rate target: 90%
- No more than 3 clicks from coach profile to booking
- Clear error messages for all failure scenarios

---

## Risk Management

### Identified Risks

#### Risk 1: Booking Flow Complexity

**Probability:** High
**Impact:** High (core feature)

**Mitigation:**
- Create detailed wireframes before coding
- Daily check-ins on booking wizard progress
- User testing on Day 8 before finalizing
- Keep wizard steps simple and focused

**Contingency:**
- Simplify to 3-step wizard if 5-step too complex
- Remove calendar integration if blocking
- Focus on happy path, defer edge cases to Sprint 3

---

#### Risk 2: Timezone Handling Issues

**Probability:** Medium
**Impact:** High (affects bookings)

**Mitigation:**
- Use date-fns for all timezone operations
- Store all times in UTC in database
- Display times in user's timezone
- Test with multiple timezones from Day 1

**Contingency:**
- Start with single timezone (UTC) if too complex
- Add multi-timezone support in Sprint 3
- Document timezone assumptions clearly

---

#### Risk 3: Stripe Integration Challenges

**Probability:** Medium
**Impact:** High (payment required for revenue)

**Mitigation:**
- Use Stripe test mode exclusively
- Follow official Stripe Next.js guide
- Implement webhook handling early
- Test with Stripe CLI

**Contingency:**
- If blocked > 1 day, mark payment as "coming soon"
- Allow free bookings in MVP
- Complete payment in Sprint 3
- Focus on booking flow without payment first

---

#### Risk 4: Double-Booking Prevention

**Probability:** Low
**Impact:** Critical (damages trust)

**Mitigation:**
- Implement slot reservation with expiry
- Use database transactions for booking
- Add unique constraints on session times
- Extensive testing of concurrent bookings

**Contingency:**
- Add manual coach approval step if auto-booking unreliable
- Start with simpler first-come-first-served
- Add coach confirmation step

---

#### Risk 5: Availability Logic Complexity

**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Start with simple weekly recurring pattern
- Test availability calculation thoroughly
- Pair program on complex logic
- Document availability rules clearly

**Contingency:**
- Simplify to manual slot selection vs recurring
- Remove buffer times if too complex
- Remove session limits if blocking

---

#### Risk 6: Scope Creep on Booking Features

**Probability:** High
**Impact:** Medium

**Mitigation:**
- Strict MVP scope definition
- "Nice to have" features go to backlog immediately
- Focus on happy path first
- Defer edge cases to Sprint 3

**Contingency:**
- Drop session reminders if needed
- Drop calendar integration if needed
- Drop reschedule if booking takes longer
- Payment can move to Sprint 3

---

## Definition of Done

A task is considered "done" when:

### Code Quality
- [ ] Code is written and follows style guide
- [ ] No linting errors or warnings
- [ ] TypeScript types are correct (no `any`)
- [ ] No hardcoded values (use environment variables)

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests for critical paths
- [ ] Manual testing checklist completed
- [ ] Tested with multiple user roles (client, coach)
- [ ] Tested edge cases (timezone, double-booking)

### Security
- [ ] Stripe keys are in environment variables
- [ ] Payment data is never logged
- [ ] RLS policies prevent unauthorized access
- [ ] Input validation on all forms

### Code Review
- [ ] Pull request created with description
- [ ] At least one approval (two for payment code)
- [ ] All review comments addressed
- [ ] No merge conflicts

### Documentation
- [ ] API endpoints documented
- [ ] Booking flow documented with screenshots
- [ ] Stripe test cards documented for team
- [ ] Timezone handling documented

### Integration
- [ ] Merged to main branch
- [ ] Deployed to staging environment
- [ ] Smoke tests pass in staging
- [ ] No Sentry errors for new features

### User Experience
- [ ] Error messages are user-friendly
- [ ] Loading states shown for async operations
- [ ] Success confirmations displayed
- [ ] Mobile responsive (test on phone)

### Acceptance Criteria
- [ ] All task acceptance criteria met
- [ ] Product owner approved
- [ ] Demo-ready with test data

---

## Sprint Tracking

### Tracking Board Columns

1. **Backlog** - Not started
2. **In Progress** - Active work
3. **Code Review** - PR submitted
4. **Testing** - QA in progress
5. **Blocked** - Waiting on dependency
6. **Done** - Meets Definition of Done

### Critical Path Tracking

Track dependencies daily:
- Task 2.1.2 blocked until 2.1.1 availability API ready
- Task 2.1.3 blocked until 2.1.1 and 2.1.2 complete
- Task 2.3.2 blocked until 2.1.3 and 2.3.1 complete

### Daily Updates

**Each team member updates:**
- Move cards on board
- Update hours remaining
- Flag blockers immediately
- Link PRs to tasks
- Add test results

### Metrics Dashboard

Track daily:
- Story points completed
- Story points remaining
- Burn-down chart
- PR review time
- Test pass rate
- Deployment status
- Sentry error count

---

## Technical Implementation Notes

### Availability Schema Design

```sql
-- Enhancement to existing availability table
ALTER TABLE availability ADD COLUMN IF NOT EXISTS recurring_pattern JSONB;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS buffer_minutes_before INT DEFAULT 0;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS buffer_minutes_after INT DEFAULT 0;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS max_sessions_per_day INT;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS max_sessions_per_week INT;

-- New table for exceptions
CREATE TABLE availability_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  exception_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT
);
```

### Booking Flow State Management

Use Zustand for booking wizard state:
- Current step
- Selected coach
- Selected session type
- Selected date/time
- Notes/agenda
- Payment status

Persist to localStorage to prevent data loss.

### Timezone Handling

```typescript
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz';

// Store in DB as UTC
const utcTime = new Date().toISOString();

// Display in user's timezone
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const localTime = formatInTimeZone(utcTime, userTimezone, 'PPpp');
```

### Slot Reservation Logic

```typescript
// Reserve slot for 10 minutes
const reservation = await createSlotReservation({
  coachId,
  startTime,
  expiresAt: new Date(Date.now() + 10 * 60 * 1000)
});

// Booking must complete before expiry
// Cleanup expired reservations with cron job
```

### Stripe Test Cards

Document for team:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

---

## Testing Strategy

### Unit Tests

**Availability Logic:**
- Test recurring pattern generation
- Test buffer time application
- Test session limit enforcement
- Test timezone conversions

**Booking Logic:**
- Test slot reservation
- Test double-booking prevention
- Test cancellation policy
- Test reschedule validation

**Payment Logic:**
- Test payment intent creation
- Test webhook signature validation
- Test refund processing

### Integration Tests

**Booking Flow:**
1. Coach sets availability
2. Client browses coaches
3. Client selects time slot
4. Client completes booking
5. Session appears in both calendars

**Payment Flow:**
1. Create booking with payment
2. Process test payment
3. Verify webhook received
4. Verify session created
5. Verify payment recorded

### Manual Testing Checklist

**Day 5 (Availability & Discovery):**
- [ ] Set weekly availability
- [ ] Add buffer times
- [ ] Set session limits
- [ ] Add time-off exception
- [ ] Search coaches
- [ ] Filter by specialty
- [ ] View coach profile
- [ ] See next available slot

**Day 10 (Complete Flow):**
- [ ] Book session as client
- [ ] Pay with test card
- [ ] View session in list
- [ ] Reschedule session
- [ ] Cancel session
- [ ] Verify coach receives booking
- [ ] Test in different timezone
- [ ] Test concurrent bookings

---

## Tools and Resources

### Development Tools

- **Stripe:** Test mode for payments
- **Date Handling:** date-fns, date-fns-tz
- **State Management:** Zustand for booking wizard
- **UI Components:** Existing Radix UI components

### Communication

- **Daily Standup:** Zoom/Google Meet
- **Async Chat:** Slack #loom-sprint-2
- **Documentation:** Notion or Confluence
- **Task Tracking:** GitHub Projects

### Reference Documents

- [STATE.md](../STATE.md) - Task specifications
- [MAIN_PAGES_TASKS.md](../MAIN_PAGES_TASKS.md) - Full task list
- [Stripe Next.js Guide](https://stripe.com/docs/stripe-js/react)
- [date-fns Documentation](https://date-fns.org/docs)

### Design Resources

- Booking flow wireframes (to be created Day 1)
- Coach profile mockups
- Session list designs

---

## Sprint Checklist

### Before Sprint Starts

- [ ] Sprint planning meeting scheduled
- [ ] Sprint 1 retrospective completed
- [ ] Stripe test account created and shared
- [ ] Booking flow wireframes created
- [ ] All team members available
- [ ] Tracking board set up

### During Sprint

- [ ] Daily standups happening
- [ ] Burn-down chart updated daily
- [ ] PRs reviewed within 4 hours
- [ ] Blockers escalated immediately
- [ ] Mid-sprint review completed (Day 5)
- [ ] Integration testing ongoing

### End of Sprint

- [ ] All tasks meet Definition of Done
- [ ] Complete booking flow demonstrated
- [ ] Sprint review completed
- [ ] Sprint retrospective completed
- [ ] Metrics collected and analyzed
- [ ] Sprint 3 backlog prepared

---

## Team Agreements

### Working Agreements

1. **Communication**
   - Respond to urgent messages within 1 hour
   - Update task status twice daily
   - Raise blockers in standup immediately

2. **Code Quality**
   - Payment code requires 2 approvals
   - Security review for Stripe integration
   - Manual testing required for booking flow

3. **Collaboration**
   - Pair on complex logic (availability, slot reservation)
   - Share knowledge about Stripe setup
   - Help unblock teammates proactively

4. **Testing**
   - Test with multiple timezones
   - Test edge cases before marking done
   - Document test scenarios

### Integration Points

**Availability → Discovery:**
- Next available slot calculation
- Availability status display

**Discovery → Booking:**
- Coach selection pre-fill
- Pass availability data

**Booking → Payment:**
- Amount calculation
- Payment before session creation

**Booking → Sessions:**
- Create session record
- Send confirmations

---

## Emergency Contacts

**Technical Issues:**
- Tech Lead: [Name/Contact]
- DevOps: [Name/Contact]

**Stripe Issues:**
- Stripe Support: [Contact]
- Payment Lead: [Name/Contact]

**Database Issues:**
- DBA/Backend Lead: [Name/Contact]

**General Questions:**
- Team Slack: #loom-sprint-2
- Product Owner: [Name/Contact]

---

## Sprint Closure

At the end of the sprint, complete:

1. [ ] Update all task statuses in STATE.md
2. [ ] Mark acceptance criteria checkboxes
3. [ ] Document booking flow with screenshots
4. [ ] Update API documentation
5. [ ] Archive sprint artifacts
6. [ ] Prepare Sprint 3 backlog (messaging system)
7. [ ] Celebrate sprint completion - we have a working booking system!

---

## Success Definition

**Sprint 2 is successful when:**

1. A client can discover coaches and book a session
2. Payment processing works in test mode
3. Sessions appear in both client and coach calendars
4. Users can manage (view, reschedule, cancel) their sessions
5. No critical bugs in the booking flow
6. System prevents double-booking
7. Code is production-ready and deployed to staging

**Business Impact:**
- Platform can generate revenue (test mode)
- Core value proposition delivered
- Ready for beta testing with real users

**Next Sprint Preview:** Sprint 3 will focus on real-time messaging system - enabling coach-client communication

