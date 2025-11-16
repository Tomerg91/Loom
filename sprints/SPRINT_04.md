# Sprint 4: Progress Tracking, Reflections, and Coach Notes - Completing Phase 2

**Sprint Duration:** 2 weeks (10 working days)
**Sprint Dates:** [Start Date] to [End Date]
**Phase:** Phase 2 - Core MVP Features (Final Sprint)
**Sprint Goal:** Complete the coaching experience with progress tracking, client reflections, coach notes, and comprehensive notification system

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

Sprint 4 is the final sprint of Phase 2, completing the core MVP features. With booking (Sprint 2), messaging (Sprint 3), and payments (Sprint 2+3) complete, we now focus on the coaching relationship itself: tracking progress, journaling reflections, maintaining coach notes, and ensuring users stay engaged through comprehensive notifications.

### What We're Building

**Progress Tracking:**
1. Goals system with milestones and progress tracking
2. Comprehensive progress dashboard with charts
3. PDF progress reports generation

**Reflections/Journal:**
1. Private reflection journal with rich text editor
2. Mood tracking and tag organization
3. Reflection analytics and insights

**Coach Notes:**
1. Private and shared notes system
2. Rich text editor with templates
3. Session integration for note-taking

**Notifications:**
1. Firebase Cloud Messaging setup
2. Notification preferences management
3. Comprehensive notification triggers for all events

### Why This Sprint Matters

These features transform the platform from a transaction system to a complete coaching experience:

**Progress Tracking:**
- Clients see tangible progress toward goals
- Coaches have data to guide coaching decisions
- Both parties stay motivated and accountable

**Reflections:**
- Clients develop self-awareness through journaling
- Mood tracking identifies patterns
- Coaches gain insights into client experience

**Coach Notes:**
- Coaches maintain context between sessions
- Professional documentation of coaching relationship
- Selective sharing builds trust

**Notifications:**
- Users stay engaged between sessions
- Reminders prevent missed appointments
- Real-time updates improve communication

Together, these complete the MVP and enable genuine coaching relationships.

### Dependencies from Sprint 3

This sprint builds on:
- Session system (for linking notes and reflections)
- Messaging system (notification infrastructure)
- User authentication (for secure notes and reflections)
- Payment system (for payment notifications)

---

## Sprint Goals

### Primary Goals

1. **Progress Tracking**: Clients and coaches can set goals and track progress over time
2. **Progress Dashboard**: Comprehensive dashboard with charts and insights
3. **Reflections**: Clients can journal with mood tracking and tag organization
4. **Coach Notes**: Coaches can take private notes and selectively share with clients
5. **Notifications**: Complete push notification system with preferences

### Secondary Goals

1. PDF progress reports generation
2. Reflection analytics and insights
3. Session integration for notes
4. Notification history center

### Sprint Success Criteria

- [ ] Users can create and track goals with progress
- [ ] Progress dashboard shows meaningful insights
- [ ] Clients can write reflections with rich text
- [ ] Coaches can take session notes
- [ ] Push notifications work on all devices
- [ ] Users can manage notification preferences
- [ ] All key events trigger appropriate notifications
- [ ] All sprint tasks meet Definition of Done

---

## Team Capacity

### Assumptions

- Team size: 2-3 developers
- Sprint length: 10 working days
- Available hours per developer: 6 productive hours/day
- Total capacity: 120-180 hours
- Sprint 3 velocity: 30-32 points (established baseline)

### Capacity Allocation

- **Development**: 70% (84-126 hours)
- **Testing**: 15% (18-27 hours)
- **Code Review**: 10% (12-18 hours)
- **Documentation**: 5% (6-9 hours)

### Task Estimates

Total story points: 30 points
Target velocity: 28-30 points/sprint (slightly reduced for quality focus)

---

## Sprint Backlog

### High Priority (Must Complete - Critical Path)

#### Week 1 Focus: Progress Tracking and Reflections

**Task 2.4.1: Implement Goals System**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: CRITICAL (foundation for progress)

**Task 2.4.2: Implement Progress Dashboard**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Frontend Developer]
- Status: Not Started
- Priority: CRITICAL (key client feature)
- Dependencies: Task 2.4.1

**Task 2.5.1: Implement Reflection Database Schema**
- Story Points: 2
- Estimated Hours: 4-6
- Owner: [Backend Developer]
- Status: Not Started
- Priority: HIGH

**Task 2.5.2: Implement Reflection Interface**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Frontend Developer]
- Status: Not Started
- Priority: HIGH
- Dependencies: Task 2.5.1

#### Week 2 Focus: Coach Notes and Notifications

**Task 2.7.1: Implement Notes Database Schema**
- Story Points: 2
- Estimated Hours: 4-6
- Owner: [Backend Developer]
- Status: Not Started
- Priority: HIGH

**Task 2.7.2: Implement Notes Management Interface**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: HIGH
- Dependencies: Task 2.7.1

**Task 2.6.1: Implement Push Notification Infrastructure**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Backend Developer]
- Status: Not Started
- Priority: CRITICAL (enables engagement)

**Task 2.6.2: Implement Notification Preferences**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Frontend Developer]
- Status: Not Started
- Priority: HIGH
- Dependencies: Task 2.6.1

### Medium Priority (Nice to Have)

**Task 2.4.3: Implement Progress Reports**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Backlog
- Priority: MEDIUM

**Task 2.5.3: Implement Reflection Analytics**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Full Stack Developer]
- Status: Backlog
- Priority: MEDIUM

**Task 2.7.3: Integrate Notes with Sessions**
- Story Points: 2
- Estimated Hours: 4-6
- Owner: [Frontend Developer]
- Status: Backlog
- Priority: MEDIUM

**Task 2.6.3: Implement Notification Triggers**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Backlog
- Priority: MEDIUM

### Deferred to Phase 3

**Enhanced Onboarding Flows**
- Reason: MVP complete without these
- Target: Phase 3, Sprint 5

---

## Task Breakdown by Week

### Week 1: Progress Tracking and Reflections (Days 1-5)

**Day 1: Sprint Kickoff and Goals System**

Morning:
- Sprint planning meeting (2 hours)
- Review Sprint 3 retrospective action items
- Review Firebase setup requirements

Afternoon:
- Start Task 2.4.1: Goals System
  - Create goals table migration
  - Design goals schema with milestones
  - Create RLS policies for goals

**Day 2: Goals API and Reflection Schema**

Morning:
- Continue Task 2.4.1: Goals System
  - Implement goal CRUD API
  - Add goal status transitions
  - Create goals manager UI structure

Afternoon:
- Continue Task 2.4.1: Goals System
  - Build goal creation form
  - Implement progress tracking
  - Add goal visualization (progress bars)
- Start Task 2.5.1: Reflection Schema
  - Create reflections table migration
  - Add mood enum and tags support

**Day 3: Complete Goals and Progress Dashboard**

Morning:
- Complete Task 2.4.1: Goals System
  - Add goal milestones (sub-goals)
  - Test goal CRUD operations
  - Code review and merge

Afternoon:
- Start Task 2.4.2: Progress Dashboard
  - Design dashboard layout
  - Create progress overview component
  - Implement goals progress section

**Day 4: Progress Dashboard Charts**

Morning:
- Continue Task 2.4.2: Progress Dashboard
  - Add progress charts (line, bar, radar)
  - Implement session attendance tracking
  - Display task completion rate
  - Show resource engagement

Afternoon:
- Continue Task 2.4.2: Progress Dashboard
  - Add milestones timeline
  - Implement date range filtering
  - Create progress insights
  - Test dashboard with real data

**Day 5: Complete Dashboard and Start Reflections**

Morning:
- Complete Task 2.4.2: Progress Dashboard
  - Add progress sharing with coach
  - Final testing and polish
  - Code review and merge

Afternoon:
- Complete Task 2.5.1: Reflection Schema
  - Create reflection_prompts table
  - Create reflection_responses table
  - Test RLS policies
- Mid-sprint review and adjustment
- Start Task 2.5.2: Reflection Interface
  - Create reflection journal list view
  - Design reflection editor layout

**Week 1 Deliverables:**
- [ ] Goals system fully functional
- [ ] Progress dashboard displays all metrics
- [ ] Charts accurately represent progress
- [ ] Reflection database ready
- [ ] Reflection list view started

---

### Week 2: Coach Notes and Notifications (Days 6-10)

**Day 6: Reflection Editor**

Morning:
- Continue Task 2.5.2: Reflection Interface
  - Implement rich text editor
  - Add formatting toolbar
  - Implement auto-save drafts

Afternoon:
- Continue Task 2.5.2: Reflection Interface
  - Add mood selector with icons
  - Implement tag input
  - Add session linking
  - Create reflection templates

**Day 7: Complete Reflections and Start Coach Notes**

Morning:
- Complete Task 2.5.2: Reflection Interface
  - Add prompt response interface
  - Implement share toggle
  - Test reflection creation
  - Code review and merge

Afternoon:
- Start Task 2.7.1: Notes Database Schema
  - Create coach_notes table
  - Create RLS policies
  - Create note templates table
  - Test note creation and access
- Complete and merge Task 2.7.1

**Day 8: Coach Notes Interface and Firebase Setup**

Morning:
- Start Task 2.7.2: Notes Management Interface
  - Create notes list view
  - Add filtering (client, session, tags)
  - Implement search functionality

Afternoon:
- Continue Task 2.7.2: Notes Management
  - Implement rich text editor
  - Add auto-save
  - Add client and session association
  - Implement share toggle
- Start Task 2.6.1: Push Notifications
  - Set up Firebase project
  - Install Firebase SDK
  - Configure Firebase Cloud Messaging

**Day 9: Complete Notes and Notification Infrastructure**

Morning:
- Complete Task 2.7.2: Notes Management
  - Add note templates
  - Implement tags and categories
  - Test note CRUD
  - Code review and merge

Afternoon:
- Continue Task 2.6.1: Push Notifications
  - Create service worker
  - Implement token registration
  - Store FCM tokens in database
  - Test notification delivery

**Day 10: Sprint Completion and Review**

Morning:
- Complete Task 2.6.1: Push Notifications
  - Implement token refresh
  - Create Supabase Edge Function
  - Test push notifications
  - Code review and merge
- Start Task 2.6.2: Notification Preferences
  - Create preferences UI
  - Implement toggle controls

Afternoon:
- Complete Task 2.6.2: Notification Preferences
  - Add per-event preferences
  - Implement quiet hours
  - Test preferences
- Final testing and bug fixes
- Merge all PRs
- Deploy to staging
- Sprint review meeting (demonstrate all features)
- Sprint retrospective
- Phase 3 planning preparation

**Week 2 Deliverables:**
- [ ] Reflection system fully functional
- [ ] Coach notes system complete
- [ ] Push notifications infrastructure ready
- [ ] Notification preferences implemented
- [ ] All code merged and deployed

---

## Daily Schedule

### Daily Standup (15 minutes, 9:00 AM)

Format:
1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or help needed?

Special focus areas:
- Progress calculation accuracy
- Rich text editor performance
- Firebase setup challenges
- Notification delivery

### Core Working Hours

- 9:00 AM - 12:00 PM: Deep work (no meetings)
- 12:00 PM - 1:00 PM: Lunch break
- 1:00 PM - 3:00 PM: Deep work or collaboration
- 3:00 PM - 5:00 PM: Code review, testing, documentation

### Pairing Sessions

- Tuesday 2:00-4:00 PM: Rich text editor pairing
- Thursday 2:00-4:00 PM: Firebase notifications pairing
- Friday 10:00-12:00 PM: End-to-end testing

### Code Review

- Reviews within 4 hours of PR creation
- Rich text editor code requires 2 approvals
- Notification code requires 2 approvals
- All tests must pass before merge

---

## Sprint Ceremonies

### Sprint Planning (Day 1, 2 hours)

**Attendees:** Entire team

**Agenda:**
1. Review Sprint 3 outcomes (15 min)
2. Present Sprint 4 goals and Phase 2 completion (15 min)
3. Walkthrough of each task (60 min)
   - Review goals tracking design
   - Discuss rich text editor options
   - Review Firebase setup
   - Clarify privacy requirements for notes
4. Capacity check and commitment (15 min)
5. Set up tracking board (15 min)

**Outputs:**
- Sprint backlog finalized
- Tasks assigned
- Firebase project created
- Rich text editor library selected

---

### Daily Standup (Daily, 15 minutes)

**Time:** 9:00 AM

**Focus Areas:**
- Progress calculation logic
- Rich text editor integration
- Firebase configuration
- Notification permissions

**Escalation Triggers:**
- Rich text editor issues > 2 hours
- Firebase setup blocked
- Progress calculation unclear
- Privacy concerns with notes/reflections

---

### Mid-Sprint Review (Day 5, 1 hour)

**Attendees:** Entire team + Product Owner

**Agenda:**
1. Demo progress tracking (30 min)
   - Show goals creation
   - Show progress dashboard with charts
   - Show reflection journal
2. Review progress vs plan (15 min)
3. Adjust Week 2 plan if needed (10 min)
4. Risk review (5 min)

**Outputs:**
- Confirmation features are on track
- UX feedback for dashboards
- Adjusted plan for Week 2

---

### Sprint Review (Day 10, 1.5 hours)

**Attendees:** Team + stakeholders

**Agenda:**
1. Demo complete coaching experience (60 min)
   - Create and track goals
   - View progress dashboard
   - Write reflections with mood tracking
   - Take coach notes
   - Show push notifications
   - Show notification preferences
2. Review Phase 2 completion (15 min)
3. Discuss beta launch readiness (15 min)

**Outputs:**
- Acceptance of completed work
- Phase 2 sign-off
- Beta launch plan

---

### Sprint Retrospective (Day 10, 1 hour)

**Attendees:** Team only

**Agenda:**
1. What went well in Phase 2? (20 min)
2. What could be improved? (20 min)
3. Action items for Phase 3 (15 min)
4. Celebrate Phase 2 completion (5 min)

**Focus Questions:**
- How has our velocity changed over Phase 2?
- What technical debt should we address in Phase 3?
- What patterns worked well that we should continue?
- What can we improve for Phase 3?

**Outputs:**
- 3-5 action items for Phase 3
- Updated team agreements
- Technical debt backlog

---

## Success Metrics

### Velocity Metrics

**Target Velocity:** 28-30 story points

**Tracking:**
- Burn-down chart updated daily
- Story points completed vs remaining
- Phase 2 velocity trend analysis

**Key Milestones:**
- Day 5: 50% of points complete
- Day 7: 70% of points complete
- Day 10: 95-100% of points complete

### Quality Metrics

**Test Coverage:**
- Maintain 80%+ coverage
- Dashboard calculations: 100% coverage
- Notification logic: 95%+ coverage

**Bug Metrics:**
- Zero critical bugs
- All bugs triaged within 24 hours
- Bug fix time < 8 hours

**Performance:**
- Dashboard load time < 2 seconds
- Rich text editor responsive
- Notification delivery < 3 seconds

### Business Metrics

**Progress Tracking:**
- Goal creation success rate: 99%+
- Dashboard load success rate: 99%+
- Chart rendering accuracy: 100%

**Reflections:**
- Reflection creation success: 99%+
- Auto-save reliability: 99.9%+
- Mood tracking completeness: 95%+

**Coach Notes:**
- Note creation success: 99%+
- Note sharing accuracy: 100%
- Auto-save reliability: 99.9%+

**Notifications:**
- Permission grant rate: 60%+ (industry standard)
- Notification delivery rate: 95%+
- Notification click rate: 20%+ (target)

---

## Risk Management

### Identified Risks

#### Risk 1: Rich Text Editor Complexity

**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Use established library (TipTap, Lexical, or Slate)
- Start with basic formatting only
- Test extensively with various inputs
- Implement proper sanitization

**Contingency:**
- Fall back to simpler textarea with markdown
- Add rich text in Phase 3 if blocked
- Use basic formatting only (bold, italic, lists)

---

#### Risk 2: Progress Calculation Accuracy

**Probability:** Low
**Impact:** High (affects trust)

**Mitigation:**
- Comprehensive unit tests for calculations
- Test with edge cases (no data, partial data)
- Validate calculations manually
- Clear documentation of formulas

**Contingency:**
- Simplify progress calculations if complex
- Show raw data alongside calculations
- Allow manual progress override

---

#### Risk 3: Firebase Setup and Permissions

**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Follow Firebase documentation exactly
- Test on multiple browsers
- Handle permission denial gracefully
- Provide clear user instructions

**Contingency:**
- Make notifications opt-in only
- Focus on email notifications
- Add push notifications in Phase 3
- Use alternative notification service

---

#### Risk 4: Privacy and Data Sensitivity

**Probability:** Low
**Impact:** Critical (legal/trust)

**Mitigation:**
- Default to private for notes and reflections
- Clear sharing indicators
- Comprehensive RLS policies
- Regular security audits

**Contingency:**
- Review all privacy settings
- Add privacy notices
- Legal review of privacy policies
- User consent for data sharing

---

#### Risk 5: Rich Text Editor Performance

**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Use virtualization for long documents
- Implement debouncing for auto-save
- Test with large documents
- Optimize rendering

**Contingency:**
- Limit document size
- Simplify editor features
- Add loading states
- Optimize auto-save frequency

---

## Definition of Done

A task is considered "done" when:

### Code Quality
- [ ] Code follows style guide
- [ ] No linting errors
- [ ] TypeScript types correct
- [ ] No hardcoded values

### Testing
- [ ] Unit tests passing (80%+ coverage)
- [ ] Integration tests for user flows
- [ ] Manual testing completed
- [ ] Edge cases tested
- [ ] Privacy rules verified

### Security & Privacy
- [ ] RLS policies prevent unauthorized access
- [ ] Sensitive data not logged
- [ ] Default to private for personal data
- [ ] Sharing clearly indicated

### Code Review
- [ ] PR created with description
- [ ] 2 approvals for sensitive features
- [ ] All comments addressed
- [ ] No merge conflicts

### Documentation
- [ ] Privacy settings documented
- [ ] Progress calculations documented
- [ ] Firebase setup documented
- [ ] API endpoints documented

### Integration
- [ ] Merged to main
- [ ] Deployed to staging
- [ ] Smoke tests pass
- [ ] No Sentry errors

### User Experience
- [ ] Loading states shown
- [ ] Error messages clear
- [ ] Success confirmations
- [ ] Mobile responsive
- [ ] Privacy indicators clear

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
- Task 2.4.2 blocked until 2.4.1 complete
- Task 2.5.2 blocked until 2.5.1 complete
- Task 2.7.2 blocked until 2.7.1 complete
- Task 2.6.2 blocked until 2.6.1 complete

### Daily Updates

**Each team member updates:**
- Move cards on board
- Update hours remaining
- Flag blockers immediately
- Note Firebase issues
- Link PRs to tasks
- Add test results

---

## Technical Implementation Notes

### Goals Schema

```sql
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id),
  coach_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER
);
```

### Progress Calculation

```typescript
interface ProgressMetrics {
  goalsProgress: number; // Percentage of goals completed
  sessionAttendance: number; // Completed vs scheduled
  taskCompletionRate: number; // Completed vs total
  resourceEngagement: number; // Viewed/completed resources
  overallScore: number; // Weighted average
}

function calculateOverallProgress(metrics: ProgressMetrics): number {
  const weights = {
    goals: 0.4,
    sessions: 0.3,
    tasks: 0.2,
    resources: 0.1
  };

  return (
    metrics.goalsProgress * weights.goals +
    metrics.sessionAttendance * weights.sessions +
    metrics.taskCompletionRate * weights.tasks +
    metrics.resourceEngagement * weights.resources
  );
}
```

### Reflections Schema

```sql
CREATE TYPE mood_type AS ENUM ('very_bad', 'bad', 'neutral', 'good', 'very_good');

CREATE TABLE reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES users(id),
  title TEXT,
  content TEXT NOT NULL,
  mood mood_type,
  tags TEXT[],
  is_shared_with_coach BOOLEAN DEFAULT false,
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reflection_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  prompt_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Rich Text Editor Setup

```typescript
// Using TipTap editor
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const editor = useEditor({
  extensions: [StarterKit],
  content: initialContent,
  onUpdate: ({ editor }) => {
    const html = editor.getHTML();
    debouncedSave(html);
  }
});

// Auto-save with debouncing
const debouncedSave = debounce(async (content: string) => {
  await saveReflection({ content });
}, 2000);
```

### Coach Notes Schema

```sql
CREATE TABLE coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  client_id UUID REFERENCES users(id),
  session_id UUID REFERENCES sessions(id),
  title TEXT,
  content TEXT NOT NULL,
  is_shared_with_client BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE note_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Firebase Cloud Messaging Setup

```typescript
// firebase-config.ts
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// Request permission and get token
export async function requestNotificationPermission() {
  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
    });

    // Save token to database
    await saveNotificationToken(token);

    return token;
  }

  return null;
}

// Listen for foreground messages
onMessage(messaging, (payload) => {
  console.log('Message received:', payload);
  // Show in-app notification
  showNotification(payload);
});
```

### Service Worker

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'YOUR_API_KEY',
  projectId: 'YOUR_PROJECT_ID',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

---

## Testing Strategy

### Unit Tests

**Goals System:**
- Test goal CRUD operations
- Test progress percentage calculation
- Test milestone completion
- Test goal status transitions

**Progress Dashboard:**
- Test progress calculations
- Test chart data formatting
- Test date range filtering
- Test empty state handling

**Reflections:**
- Test reflection CRUD
- Test mood tracking
- Test tag management
- Test sharing toggle

**Coach Notes:**
- Test note CRUD
- Test RLS policies (coach vs client access)
- Test template application
- Test session linking

**Notifications:**
- Test token registration
- Test permission handling
- Test preference storage
- Test quiet hours logic

### Integration Tests

**Progress Flow:**
1. Create goal
2. Add milestones
3. Update progress
4. View in dashboard
5. Generate report

**Reflection Flow:**
1. Create reflection
2. Add mood and tags
3. Link to session
4. Share with coach
5. Coach views shared reflection

**Notes Flow:**
1. Coach creates note during session
2. Links to client and session
3. Optionally shares with client
4. Client views shared note

**Notification Flow:**
1. Request permission
2. Set preferences
3. Trigger event (e.g., new message)
4. Receive notification
5. Click notification → navigate to content

### Manual Testing

**Day 5 Checklist:**
- [ ] Create goal with milestones
- [ ] Update goal progress
- [ ] View progress dashboard
- [ ] Check all charts render
- [ ] Create reflection
- [ ] Use rich text formatting
- [ ] Add mood and tags
- [ ] Test auto-save

**Day 10 Checklist:**
- [ ] Create coach note
- [ ] Link to session
- [ ] Share with client
- [ ] Client views note
- [ ] Request notification permission
- [ ] Set notification preferences
- [ ] Test quiet hours
- [ ] Receive test notification
- [ ] Complete end-to-end user journey

---

## Tools and Resources

### Development Tools

- **Rich Text Editor:** TipTap (recommended) or Lexical
- **Charts:** Recharts (already in project)
- **PDF Generation:** pdfkit (for reports)
- **Firebase:** Cloud Messaging for push notifications
- **Date Handling:** date-fns

### Communication

- **Daily Standup:** Zoom/Google Meet
- **Async Chat:** Slack #loom-sprint-4
- **Documentation:** Notion or Confluence
- **Task Tracking:** GitHub Projects

### Reference Documents

- [STATE.md](../STATE.md) - Task specifications
- [TipTap Documentation](https://tiptap.dev/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Recharts Documentation](https://recharts.org/)

### Design Resources

- Progress dashboard wireframes
- Reflection journal mockups
- Coach notes interface designs
- Notification preference screens

---

## Sprint Checklist

### Before Sprint Starts

- [ ] Sprint planning meeting scheduled
- [ ] Sprint 3 retrospective completed
- [ ] Firebase project created
- [ ] Rich text editor library selected (TipTap)
- [ ] All team members available
- [ ] Tracking board set up

### During Sprint

- [ ] Daily standups happening
- [ ] Burn-down chart updated daily
- [ ] PRs reviewed within 4 hours
- [ ] Blockers escalated immediately
- [ ] Mid-sprint review completed (Day 5)
- [ ] Privacy policies reviewed

### End of Sprint

- [ ] All tasks meet Definition of Done
- [ ] All features demonstrated
- [ ] Phase 2 completion verified
- [ ] Sprint review completed
- [ ] Sprint retrospective completed
- [ ] Metrics collected
- [ ] Phase 3 planning initiated

---

## Team Agreements

### Working Agreements

1. **Communication**
   - Respond to urgent messages within 1 hour
   - Update task status twice daily
   - Raise privacy concerns immediately

2. **Code Quality**
   - Rich text editor code requires 2 approvals
   - Progress calculations must have unit tests
   - Notification code requires 2 approvals
   - Privacy features require security review

3. **Collaboration**
   - Pair on rich text editor integration
   - Share Firebase setup knowledge
   - Help with calculation logic
   - Review privacy implications together

4. **Testing**
   - Test with various data volumes
   - Test privacy boundaries
   - Test notification scenarios
   - Manual test complete user journeys

### Privacy Best Practices

- Default to private for all personal data
- Clear indicators for shared content
- Explicit consent for data sharing
- Comprehensive RLS policies
- Regular security audits

---

## Emergency Contacts

**Technical Issues:**
- Tech Lead: [Name/Contact]
- DevOps: [Name/Contact]

**Firebase Issues:**
- Firebase Support: [Contact]
- Mobile Lead: [Name/Contact]

**Privacy/Security Concerns:**
- Security Lead: [Name/Contact]
- Legal: [Name/Contact]

**General Questions:**
- Team Slack: #loom-sprint-4
- Product Owner: [Name/Contact]

---

## Sprint Closure

At the end of the sprint, complete:

1. [ ] Update all task statuses in STATE.md
2. [ ] Mark Phase 2 as complete
3. [ ] Document all new features
4. [ ] Update API documentation
5. [ ] Archive sprint artifacts
6. [ ] Prepare Phase 3 Sprint 5 backlog
7. [ ] Celebrate Phase 2 completion - MVP is complete!

---

## Success Definition

**Sprint 4 is successful when:**

1. Clients can set and track goals with visual progress
2. Progress dashboard provides meaningful insights
3. Clients can journal reflections with mood tracking
4. Coaches can maintain professional notes
5. Push notifications keep users engaged
6. Notification preferences give users control
7. All features respect privacy settings
8. System is stable and production-ready

**Phase 2 Completion Means:**

The platform now has a complete MVP with:
- **Sprint 1:** Solid technical foundation
- **Sprint 2:** Session booking and basic payments
- **Sprint 3:** Real-time messaging and full payments
- **Sprint 4:** Progress tracking, reflections, notes, notifications

**Business Impact:**
- Complete coaching platform ready for beta launch
- All core features functional
- Users can book, communicate, track progress, and reflect
- Coaches can manage sessions, take notes, and receive payment
- Platform supports genuine coaching relationships

**Platform Readiness:**
- Beta testing can begin
- Early adopter onboarding possible
- Revenue generation enabled
- User engagement mechanisms in place
- Complete coaching workflow supported

**Next Phase Preview:** Phase 3 will focus on secondary features that enhance the platform: advanced onboarding, search and discovery improvements, calendar integrations, email system, and advanced analytics. These features will polish the experience and prepare for public launch.

---

## Celebration Note

Completing Sprint 4 means completing Phase 2 and delivering a full MVP! This is a major milestone - the platform can now support real coaching relationships from start to finish. Take time to celebrate this achievement before moving to Phase 3 enhancements.

