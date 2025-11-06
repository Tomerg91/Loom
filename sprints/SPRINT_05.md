# Sprint 5: Enhanced User Experience - Onboarding, Email, and Calendar

**Sprint Duration:** 2 weeks (10 working days)
**Sprint Dates:** [Start Date] to [End Date]
**Phase:** Phase 3 - Secondary Features (Sprint 1 of 3)
**Sprint Goal:** Improve user acquisition and retention with polished onboarding, professional email communications, and calendar integration

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

Sprint 5 begins Phase 3: Secondary Features. With the complete MVP delivered in Phase 2 (Sprints 1-4), we now focus on enhancing the user experience to improve acquisition, retention, and professional polish. These features make the platform more usable and attractive but aren't blocking for beta launch.

### What We're Building

**Enhanced Onboarding:**
1. Guided multi-step client onboarding flow
2. Comprehensive coach onboarding with verification workflow
3. Progress tracking and skip functionality
4. Completion rewards and badges

**Email System:**
1. Professional email infrastructure with SendGrid/AWS SES
2. Beautiful email templates for all key events
3. Email notification preferences integration
4. Delivery tracking and retry logic

**Calendar Integration:**
1. iCal feed export for session subscriptions
2. Google Calendar OAuth integration (if time permits)
3. Session sync to external calendars

### Why This Sprint Matters

**Onboarding Impact:**
- Reduces time-to-value for new users
- Increases activation rates
- Provides guided platform tour
- Sets expectations clearly
- Collects important user data

**Email System Impact:**
- Professional brand impression
- Better user engagement
- Reliable communication channel
- Marketing and retention tool
- Transactional email compliance

**Calendar Integration Impact:**
- Reduces no-shows with calendar reminders
- Integrates platform into users' existing workflows
- Professional appearance
- Better time management

Together, these features significantly improve the first impression and ongoing experience.

### Dependencies from Phase 2

This sprint builds on:
- Authentication system (for onboarding)
- Session system (for calendar sync)
- Notification preferences (for email preferences)
- User profiles (for onboarding data)

---

## Sprint Goals

### Primary Goals

1. **Client Onboarding**: New clients complete guided 6-step onboarding flow
2. **Coach Onboarding**: New coaches complete comprehensive 9-step onboarding with verification
3. **Email Infrastructure**: Professional email system sending beautiful templates
4. **Email Notifications**: All key events trigger email notifications
5. **iCal Export**: Users can subscribe to sessions in their calendar apps

### Secondary Goals

1. Google Calendar OAuth integration
2. Onboarding analytics and optimization
3. Email open rate tracking

### Sprint Success Criteria

- [ ] Client onboarding completion rate > 70%
- [ ] Coach onboarding completion rate > 60%
- [ ] All email templates are beautiful and mobile-responsive
- [ ] Email delivery rate > 98%
- [ ] iCal feed works in major calendar apps
- [ ] All sprint tasks meet Definition of Done

---

## Team Capacity

### Assumptions

- Team size: 2-3 developers
- Sprint length: 10 working days
- Available hours per developer: 6 productive hours/day
- Total capacity: 120-180 hours
- Phase 2 velocity: 28-32 points (established baseline)

### Capacity Allocation

- **Development**: 70% (84-126 hours)
- **Testing**: 15% (18-27 hours)
- **Code Review**: 10% (12-18 hours)
- **Documentation**: 5% (6-9 hours)

### Task Estimates

Total story points: 29 points
Target velocity: 28-30 points/sprint (consistent with Phase 2)

---

## Sprint Backlog

### High Priority (Must Complete - Critical Path)

#### Week 1 Focus: Enhanced Onboarding

**Task 3.1.1: Implement Client Onboarding Flow**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Frontend Developer]
- Status: Not Started
- Priority: HIGH (improves activation)

**Task 3.1.2: Implement Coach Onboarding Flow**
- Story Points: 8
- Estimated Hours: 16-20
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: HIGH (quality control)

#### Week 2 Focus: Email System and Calendar

**Task 3.4.1: Set Up Email Infrastructure**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Backend Developer]
- Status: Not Started
- Priority: CRITICAL (foundation for communications)

**Task 3.4.2: Implement Email Notifications**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Backend Developer]
- Status: Not Started
- Priority: CRITICAL (user engagement)
- Dependencies: Task 3.4.1

**Task 3.3.2: Implement iCal Export**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Not Started
- Priority: HIGH (reduces no-shows)

### Medium Priority (Nice to Have)

**Task 3.3.1: Implement Google Calendar Integration**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Full Stack Developer]
- Status: Backlog
- Priority: MEDIUM

**Onboarding Analytics**
- Story Points: 2
- Estimated Hours: 4-6
- Owner: [Backend Developer]
- Status: Backlog
- Priority: MEDIUM

### Deferred to Future Sprint

**Global Search (Task 3.2.1)**
- Reason: Can be standalone sprint focus
- Target: Sprint 6

**Advanced Filters (Task 3.2.2)**
- Reason: Pairs well with search
- Target: Sprint 6

---

## Task Breakdown by Week

### Week 1: Enhanced Onboarding (Days 1-5)

**Day 1: Sprint Kickoff and Client Onboarding**

Morning:
- Sprint planning meeting (2 hours)
- Review Phase 3 goals
- Email service selection (SendGrid vs AWS SES)

Afternoon:
- Start Task 3.1.1: Client Onboarding
  - Design onboarding wizard structure
  - Create onboarding state management
  - Build Step 1: Welcome and platform overview

**Day 2: Client Onboarding Steps**

Morning:
- Continue Task 3.1.1: Client Onboarding
  - Build Step 2: Profile completion form
  - Build Step 3: Coaching areas selection
  - Implement progress tracking

Afternoon:
- Continue Task 3.1.1: Client Onboarding
  - Build Step 4: Browse and follow coaches
  - Build Step 5: Optional first session booking
  - Build Step 6: Feature tour with tooltips

**Day 3: Complete Client Onboarding and Start Coach Onboarding**

Morning:
- Complete Task 3.1.1: Client Onboarding
  - Implement skip/later functionality
  - Add onboarding state persistence
  - Create completion badge/reward
  - Test complete flow
  - Code review and merge

Afternoon:
- Start Task 3.1.2: Coach Onboarding
  - Design comprehensive coach wizard
  - Create onboarding state management
  - Build Step 1: Welcome and value proposition
  - Build Step 2: Profile setup form

**Day 4: Coach Onboarding Middle Steps**

Morning:
- Continue Task 3.1.2: Coach Onboarding
  - Build Step 3: Upload certifications
  - Build Step 4: Set coaching specialties
  - Build Step 5: Configure availability (integrate with Sprint 2 availability)

Afternoon:
- Continue Task 3.1.2: Coach Onboarding
  - Build Step 6: Set rates and pricing
  - Build Step 7: Payment setup (Stripe Connect integration)
  - Test first 7 steps

**Day 5: Complete Coach Onboarding and Mid-Sprint Review**

Morning:
- Continue Task 3.1.2: Coach Onboarding
  - Build Step 8: Upload initial resources
  - Build Step 9: Review and submit for verification
  - Implement verification workflow

Afternoon:
- Complete Task 3.1.2: Coach Onboarding
  - Create admin review interface
  - Implement approval/rejection emails
  - Test complete flow
  - Code review and merge
- Mid-sprint review and demo
- Deploy Week 1 features to staging

**Week 1 Deliverables:**
- [ ] Client onboarding wizard complete
- [ ] Coach onboarding wizard complete
- [ ] Admin verification workflow functional
- [ ] Progress tracking and skip functionality work
- [ ] State persistence prevents data loss

---

### Week 2: Email System and Calendar (Days 6-10)

**Day 6: Email Infrastructure Setup**

Morning:
- Start Task 3.4.1: Email Infrastructure
  - Set up SendGrid/AWS SES account
  - Install email library
  - Create email service wrapper
  - Configure API keys

Afternoon:
- Continue Task 3.4.1: Email Infrastructure
  - Create email template directory structure
  - Design email base template (header, footer, styling)
  - Create Welcome email template
  - Create Email verification template

**Day 7: Email Templates**

Morning:
- Continue Task 3.4.1: Email Infrastructure
  - Create Password reset template
  - Create Session confirmation template
  - Create Session reminder template
  - Create Payment receipt template

Afternoon:
- Continue Task 3.4.1: Email Infrastructure
  - Create Resource shared notification template
  - Create Weekly digest template
  - Implement template rendering system
  - Test all templates in email clients

**Day 8: Complete Email Infrastructure and Start Email Notifications**

Morning:
- Complete Task 3.4.1: Email Infrastructure
  - Add email sending queue with retry
  - Implement delivery status tracking
  - Add unsubscribe handling
  - Test email delivery
  - Code review and merge

Afternoon:
- Start Task 3.4.2: Email Notifications
  - Add email channel to notification service
  - Integrate with notification preferences (Sprint 4)
  - Implement session booked/cancelled emails
  - Implement new message email (30+ min offline)

**Day 9: Complete Email Notifications and iCal Export**

Morning:
- Continue Task 3.4.2: Email Notifications
  - Implement resource shared emails
  - Implement task assigned emails
  - Implement payment received/sent emails
  - Implement digest mode (batch emails)
  - Test email notifications

Afternoon:
- Complete Task 3.4.2: Email Notifications
  - Test preference enforcement
  - Test unsubscribe flow
  - Code review and merge
- Start Task 3.3.2: iCal Export
  - Install ical-generator library
  - Create iCal feed endpoint

**Day 10: Sprint Completion and Review**

Morning:
- Continue Task 3.3.2: iCal Export
  - Generate authentication tokens for feeds
  - Create calendar subscription UI
  - Add instructions for various calendar apps
  - Test feed in multiple calendar apps
  - Code review and merge
- Optional: Start Task 3.3.1 (Google Calendar) if ahead

Afternoon:
- Final testing and bug fixes
- Merge all PRs
- Deploy to staging
- Sprint review meeting (demonstrate onboarding and email)
- Sprint retrospective
- Sprint 6 planning preparation

**Week 2 Deliverables:**
- [ ] Email infrastructure fully operational
- [ ] All email templates beautiful and tested
- [ ] Email notifications sending for key events
- [ ] iCal feed works in calendar apps
- [ ] Email delivery tracking functional

---

## Daily Schedule

### Daily Standup (15 minutes, 9:00 AM)

Format:
1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or help needed?

Special focus areas:
- Onboarding user experience
- Email template design
- Calendar feed compatibility
- Email delivery rates

### Core Working Hours

- 9:00 AM - 12:00 PM: Deep work (no meetings)
- 12:00 PM - 1:00 PM: Lunch break
- 1:00 PM - 3:00 PM: Deep work or collaboration
- 3:00 PM - 5:00 PM: Code review, testing, documentation

### Pairing Sessions

- Tuesday 2:00-4:00 PM: Onboarding UX pairing
- Thursday 2:00-4:00 PM: Email template design pairing
- Friday 10:00-12:00 PM: End-to-end testing

### Code Review

- Reviews within 4 hours of PR creation
- Onboarding flows require 2 approvals
- Email templates require design review
- All tests must pass before merge

---

## Sprint Ceremonies

### Sprint Planning (Day 1, 2 hours)

**Attendees:** Entire team

**Agenda:**
1. Celebrate Phase 2 completion (10 min)
2. Present Phase 3 goals and Sprint 5 focus (15 min)
3. Walkthrough of each task (60 min)
   - Review onboarding user flows
   - Discuss email service selection
   - Review calendar integration options
   - Clarify verification workflow
4. Capacity check and commitment (15 min)
5. Set up tracking board (10 min)

**Outputs:**
- Sprint backlog finalized
- Tasks assigned
- Email service selected
- Onboarding wireframes reviewed

---

### Daily Standup (Daily, 15 minutes)

**Time:** 9:00 AM

**Focus Areas:**
- Onboarding completion rates
- Email delivery success
- Template rendering issues
- Calendar feed testing

**Escalation Triggers:**
- Email delivery failures
- Onboarding UX concerns
- Calendar compatibility issues
- Verification workflow questions

---

### Mid-Sprint Review (Day 5, 1 hour)

**Attendees:** Entire team + Product Owner

**Agenda:**
1. Demo onboarding flows (35 min)
   - Walk through client onboarding
   - Walk through coach onboarding
   - Show verification workflow
2. Review progress vs plan (15 min)
3. Adjust Week 2 plan if needed (10 min)

**Outputs:**
- UX feedback on onboarding
- Confirmation to proceed with email system
- Adjusted plan for Week 2

---

### Sprint Review (Day 10, 1.5 hours)

**Attendees:** Team + stakeholders

**Agenda:**
1. Demo complete sprint features (60 min)
   - Complete client onboarding flow
   - Complete coach onboarding and verification
   - Show all email templates
   - Demonstrate email notifications
   - Show calendar subscription
2. Review sprint metrics (15 min)
3. Gather feedback (15 min)

**Outputs:**
- Acceptance of completed work
- Feedback on email templates
- Suggestions for Sprint 6

---

### Sprint Retrospective (Day 10, 1 hour)

**Attendees:** Team only

**Agenda:**
1. What went well? (15 min)
2. What could be improved? (15 min)
3. Action items for Sprint 6 (20 min)
4. Appreciation round (10 min)

**Focus Questions:**
- How was the transition to Phase 3?
- Did onboarding UX decisions work well?
- What email challenges did we face?
- How can we optimize future sprints?

**Outputs:**
- 3-5 action items for Sprint 6
- Updated team agreements

---

## Success Metrics

### Velocity Metrics

**Target Velocity:** 28-30 story points

**Tracking:**
- Burn-down chart updated daily
- Story points completed vs remaining
- Velocity consistency across phases

**Key Milestones:**
- Day 5: 45% of points complete (onboarding)
- Day 7: 65% of points complete
- Day 10: 95-100% of points complete

### Quality Metrics

**Test Coverage:**
- Maintain 80%+ coverage
- Onboarding flows: 90%+ coverage
- Email delivery: 95%+ coverage

**User Experience:**
- Onboarding completion rate: 70%+ (client), 60%+ (coach)
- Onboarding time: < 10 minutes (client), < 20 minutes (coach)
- Email deliverability: 98%+
- Email open rate: 35%+ (industry average)

### Business Metrics

**Onboarding:**
- Client activation rate improvement: 20%+
- Coach application completion: 60%+
- Admin verification turnaround: < 24 hours

**Email:**
- Email delivery success rate: 98%+
- Email bounce rate: < 2%
- Unsubscribe rate: < 0.5%

**Calendar:**
- iCal subscription rate: 40%+ of active users
- No-show rate reduction: 15%+ (target)

---

## Risk Management

### Identified Risks

#### Risk 1: Onboarding Flow Too Long

**Probability:** Medium
**Impact:** High (affects activation)

**Mitigation:**
- Keep each step focused and short
- Allow skipping optional steps
- Save progress automatically
- Show clear progress indicators
- Test with real users

**Contingency:**
- Reduce number of steps
- Make more steps optional
- Simplify data collection
- Add "complete later" option

---

#### Risk 2: Email Deliverability Issues

**Probability:** Medium
**Impact:** High (professional reputation)

**Mitigation:**
- Use reputable email service (SendGrid/SES)
- Properly configure SPF, DKIM, DMARC
- Warm up sending domain gradually
- Monitor bounce and complaint rates
- Include unsubscribe links

**Contingency:**
- Switch email provider if needed
- Reduce email frequency
- Review email content for spam triggers
- Implement gradual rollout

---

#### Risk 3: Email Template Compatibility

**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Use email-safe HTML/CSS
- Test in major email clients (Gmail, Outlook, Apple Mail)
- Use email testing service (Litmus/Email on Acid)
- Keep layouts simple
- Inline all CSS

**Contingency:**
- Simplify template designs
- Use text-only fallbacks
- Focus on mobile-first design

---

#### Risk 4: Calendar Feed Compatibility

**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Follow iCal RFC 5545 specification
- Test with major calendar apps
- Include all required fields
- Handle timezones correctly
- Provide clear setup instructions

**Contingency:**
- Focus on most popular calendar apps
- Provide manual import option
- Add troubleshooting guide

---

#### Risk 5: Coach Verification Workflow Complexity

**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Clear verification criteria
- Simple admin review interface
- Automated checks where possible
- Clear communication with coaches
- Reasonable turnaround time SLA

**Contingency:**
- Simplify verification requirements
- Allow provisional approval
- Provide detailed feedback on rejections

---

## Definition of Done

A task is considered "done" when:

### Code Quality
- [ ] Code follows style guide
- [ ] No linting errors
- [ ] TypeScript types correct
- [ ] Email HTML is valid

### Testing
- [ ] Unit tests passing (80%+ coverage)
- [ ] Integration tests for flows
- [ ] Manual testing completed
- [ ] Email templates tested in major clients
- [ ] Calendar feed tested in apps

### User Experience
- [ ] Onboarding flows intuitive
- [ ] Email templates mobile-responsive
- [ ] Calendar instructions clear
- [ ] Loading states shown
- [ ] Error messages helpful

### Security
- [ ] Email unsubscribe works
- [ ] Calendar feeds authenticated
- [ ] No PII in email logs
- [ ] GDPR compliant

### Code Review
- [ ] PR created with description
- [ ] 2 approvals for onboarding flows
- [ ] Design review for email templates
- [ ] All comments addressed

### Documentation
- [ ] Onboarding flows documented
- [ ] Email templates catalogued
- [ ] Calendar setup instructions written
- [ ] API endpoints documented

### Integration
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Smoke tests pass
- [ ] No Sentry errors

### Acceptance Criteria
- [ ] All task acceptance criteria met
- [ ] Product owner approved
- [ ] Demo-ready

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

Dependencies:
- Task 3.4.2 blocked until 3.4.1 complete
- Email templates needed before testing
- Onboarding can proceed in parallel

### Daily Updates

**Each team member updates:**
- Move cards on board
- Update hours remaining
- Flag blockers immediately
- Note email deliverability issues
- Link PRs to tasks
- Add test results

---

## Technical Implementation Notes

### Client Onboarding State

```typescript
interface ClientOnboardingState {
  currentStep: number;
  completed: boolean;
  profile: {
    bio?: string;
    goals?: string[];
  };
  coachingAreas: string[];
  followedCoaches: string[];
  firstSessionBooked: boolean;
  tourCompleted: boolean;
}

// Persist to localStorage and database
const saveOnboardingState = async (state: ClientOnboardingState) => {
  localStorage.setItem('onboarding', JSON.stringify(state));
  await updateUserOnboarding(state);
};
```

### Coach Onboarding Verification

```typescript
interface CoachApplication {
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
  certifications: File[];
  specialties: string[];
  hourlyRate: number;
  stripeConnectId?: string;
}

// Admin review action
const reviewCoachApplication = async (
  applicationId: string,
  decision: 'approve' | 'reject',
  reason?: string
) => {
  const application = await getApplication(applicationId);

  if (decision === 'approve') {
    await approveCoach(application);
    await sendApprovalEmail(application.coachId);
  } else {
    await rejectCoach(application, reason);
    await sendRejectionEmail(application.coachId, reason);
  }
};
```

### Email Service Setup

```typescript
// Using SendGrid
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const emailService = {
  async send(to: string, template: string, data: any) {
    const html = await renderTemplate(template, data);

    const msg = {
      to,
      from: process.env.FROM_EMAIL,
      subject: getSubject(template, data),
      html,
      text: htmlToText(html),
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    try {
      await sgMail.send(msg);
      await logEmailSent(to, template);
    } catch (error) {
      await logEmailFailed(to, template, error);
      throw error;
    }
  },

  async sendWithRetry(to: string, template: string, data: any, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.send(to, template, data);
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await delay(Math.pow(2, i) * 1000); // Exponential backoff
      }
    }
  }
};
```

### Email Template Structure

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* Inline all CSS for email compatibility */
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background-color: #ea580c; color: white; padding: 20px; }
    .content { padding: 20px; }
    .button {
      background-color: #ea580c;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 4px;
      display: inline-block;
    }
    .footer { color: #666; font-size: 12px; padding: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Loom Coaching</h1>
    </div>
    <div class="content">
      <!-- Template-specific content -->
      {{content}}
    </div>
    <div class="footer">
      <p>© 2025 Loom Coaching. All rights reserved.</p>
      <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
```

### iCal Feed Generation

```typescript
import ical from 'ical-generator';

export async function generateSessionFeed(userId: string) {
  const sessions = await getUserSessions(userId);

  const calendar = ical({
    name: 'Loom Coaching Sessions',
    prodId: '//Loom Coaching//Sessions//EN'
  });

  sessions.forEach(session => {
    calendar.createEvent({
      start: session.startTime,
      end: session.endTime,
      summary: `Coaching Session with ${session.coachName}`,
      description: session.notes || 'Coaching session',
      location: session.meetingLink,
      url: `${process.env.APP_URL}/sessions/${session.id}`,
      organizer: {
        name: session.coachName,
        email: session.coachEmail
      },
      attendees: [{
        name: session.clientName,
        email: session.clientEmail
      }]
    });
  });

  return calendar.toString();
}

// Generate authenticated feed URL
export function generateFeedUrl(userId: string): string {
  const token = generateSecureToken(userId);
  return `${process.env.APP_URL}/api/sessions/calendar.ics?token=${token}`;
}
```

---

## Testing Strategy

### Unit Tests

**Onboarding:**
- Test state management
- Test step validation
- Test progress calculation
- Test skip functionality
- Test state persistence

**Email:**
- Test template rendering
- Test email sending
- Test retry logic
- Test unsubscribe handling
- Test delivery tracking

**Calendar:**
- Test iCal generation
- Test feed authentication
- Test timezone handling

### Integration Tests

**Onboarding Flows:**
1. Complete client onboarding
2. Skip optional steps
3. Resume interrupted onboarding
4. Complete coach onboarding
5. Admin approve/reject application

**Email Flows:**
1. Trigger event (e.g., book session)
2. Verify email sent
3. Check email content
4. Test unsubscribe
5. Verify delivery tracking

**Calendar Flow:**
1. Generate feed URL
2. Subscribe in calendar app
3. Verify sessions appear
4. Update session
5. Verify calendar updates

### Manual Testing

**Day 5 Checklist:**
- [ ] Complete client onboarding as new user
- [ ] Skip optional steps
- [ ] Complete coach onboarding
- [ ] Submit for verification
- [ ] Admin review and approve
- [ ] Admin review and reject
- [ ] Test onboarding persistence

**Day 10 Checklist:**
- [ ] Test all email templates in Gmail
- [ ] Test all email templates in Outlook
- [ ] Test all email templates on mobile
- [ ] Trigger each email notification
- [ ] Test unsubscribe flow
- [ ] Subscribe to iCal feed
- [ ] Test feed in Apple Calendar
- [ ] Test feed in Google Calendar
- [ ] Test feed in Outlook

---

## Tools and Resources

### Development Tools

- **Email Service:** SendGrid (recommended) or AWS SES
- **Email Testing:** Litmus or Email on Acid (optional)
- **iCal Library:** ical-generator
- **State Management:** Zustand (existing)
- **Form Validation:** React Hook Form + Zod

### Communication

- **Daily Standup:** Zoom/Google Meet
- **Async Chat:** Slack #loom-sprint-5
- **Documentation:** Notion or Confluence
- **Task Tracking:** GitHub Projects

### Reference Documents

- [STATE.md](../STATE.md) - Task specifications
- [SendGrid Documentation](https://docs.sendgrid.com/)
- [iCal RFC 5545](https://tools.ietf.org/html/rfc5545)
- [Email Design Best Practices](https://www.campaignmonitor.com/dev-resources/)

### Design Resources

- Onboarding flow wireframes
- Email template designs
- Calendar setup instructions

---

## Sprint Checklist

### Before Sprint Starts

- [ ] Sprint planning meeting scheduled
- [ ] Sprint 4 retrospective completed
- [ ] Email service selected (SendGrid vs SES)
- [ ] Onboarding wireframes created
- [ ] All team members available
- [ ] Tracking board set up

### During Sprint

- [ ] Daily standups happening
- [ ] Burn-down chart updated daily
- [ ] PRs reviewed within 4 hours
- [ ] Blockers escalated immediately
- [ ] Mid-sprint review completed (Day 5)
- [ ] Email templates reviewed by design

### End of Sprint

- [ ] All tasks meet Definition of Done
- [ ] All features demonstrated
- [ ] Sprint review completed
- [ ] Sprint retrospective completed
- [ ] Metrics collected
- [ ] Sprint 6 backlog prepared

---

## Team Agreements

### Working Agreements

1. **Communication**
   - Respond to urgent messages within 1 hour
   - Update task status twice daily
   - Raise UX concerns immediately

2. **Code Quality**
   - Onboarding flows require 2 approvals
   - Email templates require design review
   - All emails tested in major clients
   - Calendar feeds must follow RFC 5545

3. **Collaboration**
   - Pair on onboarding UX decisions
   - Review email templates together
   - Share email deliverability insights
   - Help with calendar compatibility testing

4. **Testing**
   - Test onboarding as real users
   - Test emails in multiple clients
   - Test calendar feeds in multiple apps
   - Document test results

---

## Emergency Contacts

**Technical Issues:**
- Tech Lead: [Name/Contact]
- DevOps: [Name/Contact]

**Email Issues:**
- SendGrid Support: [Contact]
- Email Deliverability Expert: [Name/Contact]

**Design Questions:**
- Design Lead: [Name/Contact]
- UX Researcher: [Name/Contact]

**General Questions:**
- Team Slack: #loom-sprint-5
- Product Owner: [Name/Contact]

---

## Sprint Closure

At the end of the sprint, complete:

1. [ ] Update all task statuses in STATE.md
2. [ ] Document onboarding flows with screenshots
3. [ ] Catalogue all email templates
4. [ ] Update API documentation
5. [ ] Create calendar setup guide
6. [ ] Archive sprint artifacts
7. [ ] Prepare Sprint 6 backlog
8. [ ] Celebrate Phase 3 Sprint 1 completion!

---

## Success Definition

**Sprint 5 is successful when:**

1. New users complete intuitive onboarding flows
2. Client activation rate improves significantly
3. Coach applications are reviewed within 24 hours
4. Professional emails are sent for all key events
5. Email deliverability exceeds 98%
6. Users can subscribe to sessions in their calendars
7. No-show rates begin to decrease
8. All features are production-ready

**Business Impact:**
- Better first impressions with guided onboarding
- Higher activation and conversion rates
- Professional brand image through beautiful emails
- Increased engagement through email notifications
- Reduced no-shows through calendar integration
- Quality control through coach verification

**Platform Maturity:**
After Sprint 5, the platform has:
- Complete MVP (Phase 2)
- Polished user onboarding
- Professional email communications
- Calendar integration

**Remaining Phase 3:**
- Sprint 6: Global search and advanced filters
- Sprint 7: Advanced analytics and content enhancements

**Next Sprint Preview:** Sprint 6 will focus on improving discoverability with global search, advanced filtering, and potentially Google Calendar OAuth integration if not completed in Sprint 5.

