# Sprint 3: Real-Time Messaging and Payment Completion

**Sprint Duration:** 2 weeks (10 working days)
**Sprint Dates:** [Start Date] to [End Date]
**Phase:** Phase 2 - Core MVP Features
**Sprint Goal:** Deliver production-ready real-time messaging system and complete payment infrastructure for full revenue cycle

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

Sprint 3 continues Phase 2 MVP development. With session booking complete from Sprint 2, we now need to enable coach-client communication through real-time messaging. Additionally, we'll complete the payment infrastructure by adding payment management for clients and payout system for coaches, enabling the full revenue cycle.

### What We're Building

**Messaging System (Primary Focus):**
1. Conversation management with list and creation
2. Real-time chat interface with Supabase Realtime
3. Advanced message features (typing, reactions, attachments)
4. Message notifications (email and push)

**Payment Completion (Secondary Focus):**
1. Payment methods management for clients
2. Stripe Connect integration for coach payouts
3. Earnings dashboard for coaches

### Why This Sprint Matters

**Messaging enables:**
- Coach-client communication between sessions
- File sharing for session materials
- Ongoing relationship building
- Support and check-ins

**Payment completion enables:**
- Full revenue cycle (client pays → platform processes → coach receives)
- Professional payment management
- Transparent earnings tracking
- Coach confidence in the platform

Together, these features complete the core MVP transaction: booking, payment, communication, and payout.

### Dependencies from Sprint 2

This sprint builds on:
- Session booking system (creates need for communication)
- Basic Stripe integration (extends to full payment management)
- Session data (links messages to coaching context)
- Error tracking and reliable tests (from Sprint 1)

---

## Sprint Goals

### Primary Goals

1. **Conversation Management**: Users can create and manage conversations
2. **Real-Time Chat**: Messages appear instantly with Supabase Realtime
3. **Message Features**: Typing indicators, read receipts, reactions, and file attachments work
4. **Message Notifications**: Users receive notifications for new messages
5. **Payment Management**: Clients can manage payment methods and view history

### Secondary Goals

1. Coach payout system with Stripe Connect
2. Earnings dashboard for coaches
3. Message search within conversations

### Sprint Success Criteria

- [ ] Users can send and receive messages in real-time
- [ ] Messages persist and load correctly
- [ ] Typing indicators and read receipts work
- [ ] File attachments can be shared
- [ ] Notifications sent for new messages
- [ ] Clients can manage payment methods
- [ ] Coaches can connect Stripe account for payouts
- [ ] All sprint tasks meet Definition of Done

---

## Team Capacity

### Assumptions

- Team size: 2-3 developers
- Sprint length: 10 working days
- Available hours per developer: 6 productive hours/day
- Total capacity: 120-180 hours
- Sprint 2 velocity: 30-34 points (established baseline)

### Capacity Allocation

- **Development**: 70% (84-126 hours)
- **Testing**: 15% (18-27 hours)
- **Code Review**: 10% (12-18 hours)
- **Documentation**: 5% (6-9 hours)

### Task Estimates

Total story points: 32 points
Target velocity: 30-32 points/sprint (consistent with Sprint 2)

---

## Sprint Backlog

### High Priority (Must Complete - Critical Path)

#### Week 1 Focus: Messaging Foundation

**Task 2.2.1: Implement Conversation Management**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: CRITICAL (foundation for messaging)

**Task 2.2.2: Implement Real-Time Chat Interface**
- Story Points: 8
- Estimated Hours: 16-20
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: CRITICAL (core messaging feature)
- Dependencies: Task 2.2.1, Task 1.2.1 (Realtime mocks from Sprint 1)

**Task 2.2.3: Implement Message Features**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Frontend Developer]
- Status: Not Started
- Priority: HIGH (enhances messaging UX)
- Dependencies: Task 2.2.2

#### Week 2 Focus: Notifications and Payments

**Task 2.2.4: Implement Message Notifications**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Backend Developer]
- Status: Not Started
- Priority: HIGH (user engagement)
- Dependencies: Task 2.2.2
- Note: Will implement basic notifications, full system in later sprint

**Task 2.3.3: Implement Payment Management**
- Story Points: 5
- Estimated Hours: 10-12
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: HIGH (completes client payment experience)
- Dependencies: Sprint 2 payment integration

**Task 2.3.4: Implement Coach Payout System**
- Story Points: 8
- Estimated Hours: 16-20
- Owner: [Full Stack Developer]
- Status: Not Started
- Priority: HIGH (completes revenue cycle)
- Dependencies: Sprint 2 payment integration

### Medium Priority (Nice to Have)

**Message Search Enhancement**
- Story Points: 2
- Estimated Hours: 4-6
- Owner: [Backend Developer]
- Status: Backlog
- Priority: MEDIUM

**Message Threading/Replies**
- Story Points: 3
- Estimated Hours: 6-8
- Owner: [Frontend Developer]
- Status: Backlog
- Priority: MEDIUM

### Deferred to Future Sprint

**Task 2.6: Full Notifications System**
- Reason: Task 2.2.4 provides basic notifications for MVP
- Target Sprint: Sprint 4

**Task 2.7: Coach Notes System**
- Reason: Lower priority than communication
- Target Sprint: Sprint 4

---

## Task Breakdown by Week

### Week 1: Messaging Foundation (Days 1-5)

**Day 1: Sprint Kickoff and Conversation Schema**

Morning:
- Sprint planning meeting (2 hours)
- Review Sprint 2 retrospective action items
- Review Supabase Realtime documentation

Afternoon:
- Start Task 2.2.1: Conversation Management
  - Review existing messages API
  - Design conversation list UI
  - Create conversation endpoints

**Day 2: Conversation List and Creation**

Morning:
- Continue Task 2.2.1: Conversation Management
  - Build conversation list component
  - Display last message preview
  - Show unread count badge

Afternoon:
- Continue Task 2.2.1: Conversation Management
  - Implement conversation search
  - Add conversation creation flow
  - Add participant info display
  - Create empty state UI

**Day 3: Complete Conversations and Start Real-Time Chat**

Morning:
- Complete Task 2.2.1: Conversation Management
  - Add conversation archiving
  - Implement conversation settings
  - Test conversation features
- Code review: Task 2.2.1

Afternoon:
- Start Task 2.2.2: Real-Time Chat Interface
  - Create message thread component
  - Implement message display (chronological)
  - Add date grouping
  - Setup Supabase Realtime channel

**Day 4: Real-Time Message Delivery**

Morning:
- Continue Task 2.2.2: Real-Time Chat
  - Implement Supabase Realtime subscription
  - Handle new message events
  - Add optimistic updates
  - Implement message status indicators

Afternoon:
- Continue Task 2.2.2: Real-Time Chat
  - Create message input component
  - Add send button and keyboard shortcuts
  - Implement retry for failed sends
  - Test message delivery

**Day 5: Complete Real-Time Chat and Mid-Sprint Review**

Morning:
- Complete Task 2.2.2: Real-Time Chat
  - Implement infinite scroll for history
  - Test real-time delivery
  - Test connection loss handling
  - Test optimistic updates
- Code review: Task 2.2.2

Afternoon:
- Mid-sprint review and adjustment
- Demo messaging to stakeholders
- Start Task 2.2.3: Message Features
  - Implement typing indicators
  - Add read receipts
- Merge Week 1 PRs
- Deploy to staging

**Week 1 Deliverables:**
- [ ] Users can create conversations
- [ ] Conversation list shows all conversations
- [ ] Messages send and receive in real-time
- [ ] Message history loads correctly
- [ ] Optimistic updates provide instant feedback
- [ ] Typing indicators and read receipts work

---

### Week 2: Message Features and Payment Completion (Days 6-10)

**Day 6: Advanced Message Features**

Morning:
- Continue Task 2.2.3: Message Features
  - Implement message reactions
  - Add file attachment upload
  - Create image preview component

Afternoon:
- Continue Task 2.2.3: Message Features
  - Add file download
  - Implement message editing (5-minute window)
  - Add message deletion
  - Test all message features

**Day 7: Message Notifications and Payment Management Start**

Morning:
- Complete Task 2.2.3: Message Features
  - Test file uploads
  - Test reactions
  - Code review and merge

Afternoon:
- Start Task 2.2.4: Message Notifications
  - Create database trigger for new messages
  - Implement notification service call
  - Add email notification template
- Start Task 2.3.3: Payment Management
  - Design payment methods page
  - Create payment methods API

**Day 8: Complete Notifications and Payment Management**

Morning:
- Complete Task 2.2.4: Message Notifications
  - Send notifications if user offline
  - Test notification delivery
  - Test online/offline detection
- Code review: Task 2.2.4

Afternoon:
- Continue Task 2.3.3: Payment Management
  - Build payment methods UI
  - Implement add/remove payment method
  - Set default payment method
  - Display payment history

**Day 9: Complete Payment Management and Start Coach Payouts**

Morning:
- Complete Task 2.3.3: Payment Management
  - Add invoice download
  - Test payment method management
  - Code review and merge

Afternoon:
- Start Task 2.3.4: Coach Payout System
  - Set up Stripe Connect
  - Create Stripe Connect onboarding flow
  - Build earnings dashboard structure

**Day 10: Sprint Completion and Review**

Morning:
- Continue Task 2.3.4: Coach Payout System
  - Display earnings metrics
  - Show payout history
  - Test Stripe Connect flow
- Code review: Task 2.3.4
- Final testing and bug fixes

Afternoon:
- Merge all PRs
- Deploy to staging
- End-to-end testing
- Sprint review meeting (demonstrate messaging and payments)
- Sprint retrospective
- Sprint 4 planning preparation

**Week 2 Deliverables:**
- [ ] File attachments work in messages
- [ ] Message reactions and editing work
- [ ] Users receive notifications for new messages
- [ ] Clients can manage payment methods
- [ ] Payment history displays correctly
- [ ] Coaches can connect Stripe account
- [ ] Earnings dashboard shows metrics

---

## Daily Schedule

### Daily Standup (15 minutes, 9:00 AM)

Format:
1. What did I complete yesterday?
2. What will I work on today?
3. Any blockers or help needed?

Special focus areas:
- Supabase Realtime connection stability
- Message delivery reliability
- Stripe Connect onboarding experience
- Notification delivery

### Core Working Hours

- 9:00 AM - 12:00 PM: Deep work (no meetings)
- 12:00 PM - 1:00 PM: Lunch break
- 1:00 PM - 3:00 PM: Deep work or collaboration
- 3:00 PM - 5:00 PM: Code review, testing, documentation

### Pairing Sessions

- Tuesday 2:00-4:00 PM: Real-time messaging pairing
- Thursday 2:00-4:00 PM: Stripe Connect pairing
- Friday 10:00-12:00 PM: End-to-end testing

### Code Review

- Reviews within 4 hours of PR creation
- Messaging features require 2 approvals
- Payment features require 2 approvals
- All tests must pass before merge

---

## Sprint Ceremonies

### Sprint Planning (Day 1, 2 hours)

**Attendees:** Entire team

**Agenda:**
1. Review Sprint 2 outcomes (15 min)
2. Present Sprint 3 goals (15 min)
3. Walkthrough of each task (60 min)
   - Review Supabase Realtime architecture
   - Discuss message delivery patterns
   - Review Stripe Connect requirements
   - Clarify notification strategy
4. Capacity check and commitment (15 min)
5. Set up tracking board (15 min)

**Outputs:**
- Sprint backlog finalized
- Tasks assigned
- Realtime architecture reviewed
- Stripe Connect test account created

---

### Daily Standup (Daily, 15 minutes)

**Time:** 9:00 AM

**Focus Areas:**
- Real-time connection stability
- Message delivery issues
- Notification sending
- Stripe Connect testing

**Escalation Triggers:**
- Realtime connection problems > 2 hours
- Message delivery failures
- Payment integration issues
- Notification sending failures

---

### Mid-Sprint Review (Day 5, 1 hour)

**Attendees:** Entire team + Product Owner

**Agenda:**
1. Demo messaging system (30 min)
   - Show conversation creation
   - Demonstrate real-time messaging
   - Show typing indicators
2. Review progress vs plan (15 min)
3. Adjust Week 2 plan if needed (10 min)
4. Risk review (5 min)

**Outputs:**
- Confirmation messaging is on track
- UX feedback for message features
- Adjusted plan for Week 2

---

### Sprint Review (Day 10, 1.5 hours)

**Attendees:** Team + stakeholders

**Agenda:**
1. Demo complete communication flow (45 min)
   - Create conversation
   - Send messages in real-time
   - Share file attachments
   - Show reactions and typing
   - Demonstrate notifications
   - Show payment management
   - Show coach earnings dashboard
2. Review sprint metrics (15 min)
3. Discuss beta testing readiness (15 min)
4. Collect feedback (15 min)

**Outputs:**
- Acceptance of completed work
- Beta testing plan updated
- Feedback for Sprint 4

---

### Sprint Retrospective (Day 10, 1 hour)

**Attendees:** Team only

**Agenda:**
1. What went well? (15 min)
2. What could be improved? (15 min)
3. Action items for Sprint 4 (20 min)
4. Appreciation round (10 min)

**Focus Questions:**
- How was working with Supabase Realtime?
- Did we handle async communication well?
- What payment challenges did we face?
- How can we improve testing real-time features?

**Outputs:**
- 3-5 action items for Sprint 4
- Updated team agreements

---

## Success Metrics

### Velocity Metrics

**Target Velocity:** 30-32 story points (consistent with Sprint 2)

**Tracking:**
- Burn-down chart updated daily
- Story points completed vs remaining
- Velocity trend analysis

**Key Milestones:**
- Day 5: 45-55% of points complete (messaging foundation)
- Day 7: 65-75% of points complete
- Day 10: 90-100% of points complete

### Quality Metrics

**Test Coverage:**
- Maintain 80%+ coverage
- Real-time features: 90%+ coverage
- Payment features: 100% coverage

**Bug Metrics:**
- Zero critical bugs in messaging
- Zero security issues in payments
- All bugs documented and triaged

**Real-Time Performance:**
- Message delivery latency < 500ms
- Typing indicator latency < 300ms
- Connection reconnect < 2 seconds

### Business Metrics

**Messaging Metrics:**
- Conversation creation success rate: 99%+
- Message delivery success rate: 99.9%+
- Real-time connection uptime: 99%+
- Average message load time < 1 second

**Payment Metrics:**
- Payment method save success rate: 99%+
- Stripe Connect onboarding completion: 90%+
- Payout calculation accuracy: 100%

---

## Risk Management

### Identified Risks

#### Risk 1: Supabase Realtime Reliability

**Probability:** Medium
**Impact:** Critical (breaks messaging)

**Mitigation:**
- Test Realtime thoroughly in development
- Implement connection status indicators
- Add automatic reconnection logic
- Have fallback to polling (last resort)
- Monitor connection stability continuously

**Contingency:**
- Implement polling fallback for message updates
- Add manual refresh option
- Escalate to Supabase support if systemic issues
- Consider alternative WebSocket solution

---

#### Risk 2: Message Delivery Failures

**Probability:** Low
**Impact:** High (messages lost)

**Mitigation:**
- Use database-first approach (save before broadcasting)
- Implement optimistic updates with rollback
- Add message retry mechanism
- Show clear delivery status
- Test concurrent messaging scenarios

**Contingency:**
- Show clear failed message state
- Allow manual retry
- Queue failed messages
- Investigate delivery patterns

---

#### Risk 3: Stripe Connect Complexity

**Probability:** Medium
**Impact:** High (delays coach payouts)

**Mitigation:**
- Follow Stripe Connect documentation exactly
- Use Express Connect (simplest option)
- Test with Stripe test mode
- Implement error handling for all Connect steps

**Contingency:**
- Start with manual payouts if Connect blocked
- Simplify onboarding flow
- Defer advanced features
- Get Stripe support involved early

---

#### Risk 4: File Upload Performance

**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Use existing file upload infrastructure
- Limit file size (10MB)
- Show upload progress
- Test with various file types

**Contingency:**
- Reduce file size limit if needed
- Remove file upload if blocking
- Add in Sprint 4

---

#### Risk 5: Notification Spam

**Probability:** Medium
**Impact:** Medium (poor UX)

**Mitigation:**
- Only send notifications if user offline
- Implement notification grouping
- Add notification preferences
- Test notification scenarios

**Contingency:**
- Reduce notification frequency
- Make all notifications opt-in
- Add quiet hours

---

#### Risk 6: Real-Time Testing Challenges

**Probability:** High
**Impact:** Medium

**Mitigation:**
- Use Realtime mocks from Sprint 1
- Test with actual Supabase instance
- Manual testing with multiple devices
- Pair program on complex scenarios

**Contingency:**
- Focus on manual testing
- Create comprehensive test plan
- Test in staging environment
- Accept lower test coverage for Realtime

---

## Definition of Done

A task is considered "done" when:

### Code Quality
- [ ] Code follows style guide
- [ ] No linting errors or warnings
- [ ] TypeScript types correct (no `any`)
- [ ] WebSocket connections properly managed

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests for messaging flow
- [ ] Manual testing with 2+ users
- [ ] Tested message delivery edge cases
- [ ] Tested payment scenarios

### Security
- [ ] Messages protected by RLS
- [ ] Payment data never logged
- [ ] Stripe keys in environment only
- [ ] File upload security validated

### Real-Time Features
- [ ] Connection status indicator works
- [ ] Automatic reconnection works
- [ ] Message delivery is reliable
- [ ] No memory leaks from subscriptions

### Code Review
- [ ] PR created with description
- [ ] 2 approvals for messaging/payment code
- [ ] All comments addressed
- [ ] No merge conflicts

### Documentation
- [ ] Real-time architecture documented
- [ ] Message delivery flow documented
- [ ] Stripe Connect setup documented
- [ ] API endpoints documented

### Integration
- [ ] Merged to main branch
- [ ] Deployed to staging
- [ ] Smoke tests pass
- [ ] No Sentry errors

### User Experience
- [ ] Loading states for async operations
- [ ] Error messages are clear
- [ ] Success confirmations shown
- [ ] Mobile responsive

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

Track dependencies daily:
- Task 2.2.2 blocked until 2.2.1 complete
- Task 2.2.3 blocked until 2.2.2 complete
- Task 2.2.4 blocked until 2.2.2 complete
- Task 2.3.4 needs 2.3.3 for context

### Daily Updates

**Each team member updates:**
- Move cards on board
- Update hours remaining
- Flag blockers immediately
- Note Realtime connection issues
- Link PRs to tasks
- Add test results

### Metrics Dashboard

Track daily:
- Story points completed
- Story points remaining
- Burn-down chart
- Message delivery success rate
- Realtime connection uptime
- PR review time
- Test pass rate
- Sentry error count

---

## Technical Implementation Notes

### Supabase Realtime Setup

```typescript
// Subscribe to conversation channel
const channel = supabase.channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Handle new message
    addMessage(payload.new);
  })
  .subscribe();

// Cleanup on unmount
return () => {
  supabase.removeChannel(channel);
};
```

### Message Status Indicators

```typescript
type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface Message {
  id: string;
  content: string;
  status: MessageStatus;
  createdAt: string;
  senderId: string;
}
```

### Typing Indicators

```typescript
// Send typing event
channel.send({
  type: 'broadcast',
  event: 'typing',
  payload: { userId, isTyping: true }
});

// Debounce typing end
useEffect(() => {
  const timeout = setTimeout(() => {
    channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping: false }
    });
  }, 3000);
  return () => clearTimeout(timeout);
}, [message]);
```

### Optimistic Updates

```typescript
// Add message optimistically
const tempId = `temp-${Date.now()}`;
const optimisticMessage = {
  id: tempId,
  content,
  status: 'sending',
  senderId: currentUserId,
  createdAt: new Date().toISOString()
};

setMessages(prev => [...prev, optimisticMessage]);

try {
  // Send to server
  const { data } = await createMessage(content);

  // Replace temp message with real one
  setMessages(prev =>
    prev.map(m => m.id === tempId ? data : m)
  );
} catch (error) {
  // Mark as failed
  setMessages(prev =>
    prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m)
  );
}
```

### Stripe Connect Integration

```typescript
// Create connected account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US',
  email: coach.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true }
  }
});

// Create account link for onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${baseUrl}/coach/earnings/refresh`,
  return_url: `${baseUrl}/coach/earnings/complete`,
  type: 'account_onboarding'
});
```

### Notification Logic

```typescript
// Send notification only if user offline
const isOnline = await checkUserOnlineStatus(recipientId);

if (!isOnline) {
  await sendPushNotification({
    userId: recipientId,
    title: `New message from ${senderName}`,
    body: messagePreview,
    data: {
      conversationId,
      messageId
    }
  });
}
```

---

## Testing Strategy

### Unit Tests

**Conversation Management:**
- Test conversation creation
- Test conversation list filtering
- Test unread count calculation
- Test conversation archiving

**Message Features:**
- Test message creation
- Test message editing
- Test message deletion
- Test typing indicator logic

**Payment Management:**
- Test payment method CRUD
- Test default method setting
- Test payment history retrieval

### Integration Tests

**Messaging Flow:**
1. Create conversation
2. Send multiple messages
3. Verify message delivery
4. Test typing indicators
5. Test read receipts
6. Upload file
7. React to message

**Payment Flow:**
1. Add payment method
2. Set as default
3. View payment history
4. Download invoice
5. Remove payment method

**Payout Flow:**
1. Connect Stripe account
2. View earnings
3. Check payout schedule
4. View payout history

### Real-Time Testing

**Manual Testing Scenarios:**
1. Two users in same conversation
2. Send messages back and forth
3. Test typing indicators appear
4. Test read receipts update
5. Test connection loss and recovery
6. Test with poor network conditions

### Load Testing

**Message Delivery:**
- Test 100 messages in conversation
- Test 10 concurrent users
- Test rapid message sending
- Test file upload under load

---

## Tools and Resources

### Development Tools

- **Supabase Realtime:** WebSocket communication
- **Stripe Connect:** Coach payouts
- **File Upload:** Existing infrastructure
- **Notifications:** Email service (from Phase 1)

### Communication

- **Daily Standup:** Zoom/Google Meet
- **Async Chat:** Slack #loom-sprint-3
- **Documentation:** Notion or Confluence
- **Task Tracking:** GitHub Projects

### Reference Documents

- [STATE.md](../STATE.md) - Task specifications
- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Message Delivery Patterns](link-to-docs)

### Design Resources

- Messaging UI mockups
- Conversation list designs
- Earnings dashboard wireframes

---

## Sprint Checklist

### Before Sprint Starts

- [ ] Sprint planning meeting scheduled
- [ ] Sprint 2 retrospective completed
- [ ] Supabase Realtime tested in dev
- [ ] Stripe Connect test account created
- [ ] All team members available
- [ ] Tracking board set up

### During Sprint

- [ ] Daily standups happening
- [ ] Burn-down chart updated daily
- [ ] Realtime connection monitored
- [ ] PRs reviewed within 4 hours
- [ ] Blockers escalated immediately
- [ ] Mid-sprint review completed (Day 5)

### End of Sprint

- [ ] All tasks meet Definition of Done
- [ ] Messaging system demonstrated
- [ ] Payment features demonstrated
- [ ] Sprint review completed
- [ ] Sprint retrospective completed
- [ ] Metrics collected
- [ ] Sprint 4 backlog prepared

---

## Team Agreements

### Working Agreements

1. **Communication**
   - Respond to urgent messages within 1 hour
   - Update task status twice daily
   - Raise Realtime issues immediately

2. **Code Quality**
   - Messaging code requires 2 approvals
   - Payment code requires 2 approvals
   - Realtime subscriptions must cleanup

3. **Collaboration**
   - Pair on Realtime implementation
   - Share Stripe Connect knowledge
   - Help debug connection issues

4. **Testing**
   - Manual test with 2+ users
   - Test message delivery scenarios
   - Test payment flows thoroughly

### Real-Time Development

**Best Practices:**
- Always cleanup subscriptions
- Handle connection loss gracefully
- Show connection status to users
- Test with poor network conditions
- Monitor memory usage

---

## Emergency Contacts

**Technical Issues:**
- Tech Lead: [Name/Contact]
- DevOps: [Name/Contact]

**Supabase Issues:**
- Supabase Support: [Contact]
- Database Lead: [Name/Contact]

**Stripe Issues:**
- Stripe Support: [Contact]
- Payment Lead: [Name/Contact]

**General Questions:**
- Team Slack: #loom-sprint-3
- Product Owner: [Name/Contact]

---

## Sprint Closure

At the end of the sprint, complete:

1. [ ] Update all task statuses in STATE.md
2. [ ] Mark acceptance criteria checkboxes
3. [ ] Document messaging architecture
4. [ ] Document Stripe Connect setup
5. [ ] Update API documentation
6. [ ] Archive sprint artifacts
7. [ ] Prepare Sprint 4 backlog
8. [ ] Celebrate - we have real-time communication!

---

## Success Definition

**Sprint 3 is successful when:**

1. Users can message each other in real-time
2. Messages persist and load reliably
3. Advanced features (typing, reactions, files) work
4. Notifications keep users engaged
5. Clients can manage payment methods easily
6. Coaches can connect bank accounts for payouts
7. Full revenue cycle is complete
8. System is stable and production-ready

**Business Impact:**
- Coaches and clients can communicate between sessions
- File sharing enables resource distribution
- Payment management provides professional experience
- Coach payouts enable sustainable business
- Platform has complete MVP feature set

**Platform Maturity:**
After Sprint 3:
- Book sessions (Sprint 2)
- Communicate in real-time (Sprint 3)
- Pay and get paid (Sprint 2 + 3)
- Ready for beta launch with core features

**Next Sprint Preview:** Sprint 4 will focus on client progress tracking, reflections/journal system, and coach notes - completing the coaching experience beyond transactions.

