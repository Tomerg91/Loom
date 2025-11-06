# Loom App - Development State & Implementation Guide

> Sequential task guide for building the Loom coaching platform. This document tracks implementation state and provides step-by-step guidance for developers.

**Last Updated:** 2025-11-05
**Current Phase:** Phase 1 - Foundation & Critical Infrastructure

---

## Table of Contents

1. [Current State Overview](#current-state-overview)
2. [Phase 1: Foundation & Critical Infrastructure](#phase-1-foundation--critical-infrastructure)
3. [Phase 2: Core MVP Features](#phase-2-core-mvp-features)
4. [Phase 3: Secondary Features](#phase-3-secondary-features)
5. [Phase 4: Advanced Features](#phase-4-advanced-features)
6. [Phase 5: Polish & Optimization](#phase-5-polish--optimization)
7. [Development Guidelines](#development-guidelines)

---

## Current State Overview

### What Works

**Authentication & Security**
- User registration and login (email/password)
- MFA setup and verification with TOTP
- Password reset flow
- Role-based access control (client/coach/admin)
- Session management with Supabase Auth
- Email verification

**Dashboard Infrastructure**
- Client dashboard with overview data
- Coach dashboard with overview data
- TanStack Query integration for data fetching
- Server-side prefetching

**Resource Library (Complete)**
- Resource upload and management for coaches
- Collection organization with drag-and-drop
- Resource sharing (all clients / individual)
- Client resource viewing with progress tracking
- Analytics dashboard for coaches
- Row-level security policies

**Admin Tools**
- User management interface
- Analytics dashboard
- System health monitoring
- Audit logs
- MFA health monitoring

**Infrastructure**
- Next.js 15 with App Router
- Supabase for database and auth
- Tailwind CSS with custom design system
- Internationalization (i18n) support
- Testing infrastructure (Vitest, Playwright)

### What Needs Work

**Critical Gaps (Blocking MVP)**
1. Session booking workflow (incomplete)
2. Real-time messaging system (partially implemented)
3. Coach discovery/selection interface
4. Payment integration (schema exists, integration incomplete)
5. Client progress tracking dashboard
6. Reflections/journal system
7. Coach notes system

**Secondary Gaps**
1. Folder organization for files
2. Complete notifications system
3. Complete onboarding flows
4. Advanced analytics and insights
5. Calendar integrations

---

## Phase 1: Foundation & Critical Infrastructure

**Goal:** Fix critical infrastructure issues and establish solid foundations for feature development.

**Estimated Duration:** 2-3 weeks

### 1.1 Error Handling & Monitoring

#### Task 1.1.1: Integrate Sentry Error Tracking

**Status:** [ ] Not Started

**Prerequisites:** Sentry account and DSN

**Files to Modify:**
- `src/lib/utils/api-errors.ts` (line 148)
- `src/lib/config/sentry.ts` (create)
- `.env.local` (add NEXT_PUBLIC_SENTRY_DSN)

**Implementation Steps:**
1. Install Sentry SDK: `npm install @sentry/nextjs`
2. Initialize Sentry in `sentry.client.config.js` and `sentry.server.config.js`
3. Update `logError()` function in `api-errors.ts` to send to Sentry
4. Add breadcrumbs for user actions
5. Configure error sampling rates

**Testing:**
- Trigger test error and verify it appears in Sentry dashboard
- Test error grouping and stack traces
- Verify user context is included

**Acceptance Criteria:**
- [ ] All unhandled errors are logged to Sentry
- [ ] User context (ID, role) is attached to errors
- [ ] Stack traces are complete and sourcemaps work
- [ ] Error alerts are configured for critical issues

---

#### Task 1.1.2: Implement Error Boundaries

**Status:** [ ] Not Started

**Prerequisites:** Task 1.1.1

**Files to Modify:**
- `src/components/layout/page-wrapper.tsx` (line 87)
- `src/components/error/error-boundary.tsx` (create)
- `src/components/error/error-display.tsx` (enhance)

**Implementation Steps:**
1. Create reusable ErrorBoundary component with error state
2. Integrate with Sentry error reporting
3. Update PageWrapper to use ErrorBoundary
4. Add reset functionality
5. Create fallback UI for different error types

**Testing:**
- Test error boundary catches render errors
- Test reset functionality
- Test error reporting to Sentry

**Acceptance Criteria:**
- [ ] All page routes are wrapped in error boundaries
- [ ] Errors show user-friendly fallback UI
- [ ] Users can reset/retry after errors
- [ ] Errors are logged to Sentry with component context

---

### 1.2 Testing Infrastructure Fixes

#### Task 1.2.1: Fix Supabase Realtime Mock Setup

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/test/setup.ts`
- `src/test/mocks/supabase.ts` (create)
- `src/test/integration/realtime-features.test.tsx` (line 338)

**Implementation Steps:**
1. Create comprehensive Supabase mock with channel support
2. Mock `channel()` method to return mock channel object
3. Mock `on()`, `subscribe()`, `unsubscribe()` methods
4. Update test setup to use new mocks
5. Re-enable skipped realtime tests

**Testing:**
- Run `npm run test:integration` and verify realtime tests pass
- Test message subscription mocking
- Test presence and broadcast mocking

**Acceptance Criteria:**
- [ ] All realtime tests are enabled and passing
- [ ] Mock supports all realtime channel methods
- [ ] Tests can simulate realtime events
- [ ] Mock is reusable across test files

---

#### Task 1.2.2: Fix FileList Polyfill for Tests

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/test/setup.ts`
- `src/test/integration/file-management-workflow.test.tsx` (line 194)

**Implementation Steps:**
1. Add FileList polyfill to test setup
2. Create custom FileList implementation that matches browser API
3. Add File constructor polyfill if needed
4. Re-enable skipped file upload tests

**Testing:**
- Run file management tests and verify they pass
- Test file upload with multiple files
- Test drag-and-drop file handling

**Acceptance Criteria:**
- [ ] FileList is properly polyfilled in test environment
- [ ] All file upload tests are enabled and passing
- [ ] Tests accurately simulate browser file handling

---

### 1.3 Database & Schema Improvements

#### Task 1.3.1: Implement Database Health Monitoring

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/lib/database/admin-analytics.ts` (line 624)
- `supabase/migrations/YYYYMMDD_system_health_monitoring.sql` (create)

**Implementation Steps:**
1. Create database function to check table health
2. Add index usage statistics query
3. Implement slow query detection
4. Add connection pool monitoring
5. Create RLS policy validation check
6. Update `getSystemHealth()` to use real data

**Testing:**
- Test health checks return accurate data
- Test slow query detection
- Verify performance impact is minimal

**Acceptance Criteria:**
- [ ] System health returns real database metrics
- [ ] Slow queries are identified with query text
- [ ] Index usage is tracked
- [ ] Connection pool status is monitored
- [ ] RLS policies are validated

---

#### Task 1.3.2: Implement Folder Schema for Files

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `supabase/migrations/YYYYMMDD_add_folders_schema.sql` (create)
- `src/types/supabase.ts` (regenerate)
- `src/app/api/folders/route.ts` (line 27, 81)
- `src/lib/services/file-management-service.ts` (create methods)

**Implementation Steps:**
1. Create folders table with fields:
   - id (uuid, primary key)
   - owner_id (uuid, foreign key to users)
   - parent_folder_id (uuid, nullable, self-reference)
   - name (text)
   - created_at, updated_at (timestamps)
2. Add folder_id to file_uploads table (nullable)
3. Create RLS policies for folder access
4. Implement createFolder() method
5. Implement getFolderContents() method
6. Implement moveToFolder() method
7. Add folder tree query function

**Testing:**
- Test folder creation and nesting
- Test file organization in folders
- Test RLS policies prevent unauthorized access
- Test folder tree retrieval

**Acceptance Criteria:**
- [ ] Users can create folders
- [ ] Files can be organized in folders
- [ ] Folders can be nested
- [ ] RLS policies protect folder access
- [ ] API endpoints for folder CRUD are complete

---

### 1.4 Core TODOs from Codebase

#### Task 1.4.1: Implement Coach-Specific Rate Lookup

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/lib/config/analytics-constants.ts` (line 46)
- `supabase/migrations/YYYYMMDD_add_coach_rates.sql` (create)

**Implementation Steps:**
1. Add session_rate column to profiles table (or create coach_settings table)
2. Create default rate constant
3. Update getSessionRate() to query database
4. Add caching for coach rates
5. Create admin UI to manage default rates

**Testing:**
- Test rate lookup for coach with custom rate
- Test fallback to default rate
- Test caching works correctly

**Acceptance Criteria:**
- [ ] Coach rates are stored in database
- [ ] getSessionRate() returns coach-specific rates
- [ ] Falls back to default if not set
- [ ] Rates are cached for performance

---

#### Task 1.4.2: Implement Session Feedback/Rating System

**Status:** [ ] Not Started

**Prerequisites:** Session booking system (Task 2.1.1)

**Files to Modify:**
- `supabase/migrations/YYYYMMDD_add_session_ratings.sql` (create)
- `src/lib/config/analytics-constants.ts` (line 54)
- `src/app/api/sessions/[id]/rating/route.ts` (create)

**Implementation Steps:**
1. Create session_ratings table:
   - session_id (uuid, foreign key)
   - rater_id (uuid, foreign key to users)
   - rating (integer, 1-5)
   - feedback_text (text, optional)
   - created_at (timestamp)
2. Create RLS policies for rating access
3. Implement POST endpoint for submitting ratings
4. Update getDefaultCoachRating() to calculate from ratings
5. Add rating UI to session detail page

**Testing:**
- Test rating submission
- Test rating retrieval
- Test coach rating calculation
- Test RLS policies

**Acceptance Criteria:**
- [ ] Users can rate completed sessions
- [ ] Ratings are stored in database
- [ ] Coach ratings are calculated from actual data
- [ ] Rating UI is intuitive and accessible

---

#### Task 1.4.3: Add Pagination to Resource Lists

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/lib/services/resource-library-service.ts` (line 126)
- `src/app/api/coach/resources/route.ts`
- `src/components/resources/resource-library-page.tsx`

**Implementation Steps:**
1. Add count query to getResources() method
2. Implement cursor-based pagination
3. Add page, limit, and cursor parameters to API
4. Update UI to show pagination controls
5. Add infinite scroll option

**Testing:**
- Test pagination with various page sizes
- Test cursor-based navigation
- Test infinite scroll functionality

**Acceptance Criteria:**
- [ ] Resource lists return total count
- [ ] Pagination works for large datasets
- [ ] UI shows current page and total pages
- [ ] Performance is acceptable with 1000+ resources

---

#### Task 1.4.4: Implement Resource Share Notifications

**Status:** [ ] Not Started

**Prerequisites:** Notification system (Task 2.6)

**Files to Modify:**
- `src/lib/services/resource-library-service.ts` (line 299)
- `src/lib/services/notification-service.ts` (create)

**Implementation Steps:**
1. Create notification trigger when resources are shared
2. Add email notification template for resource sharing
3. Add in-app notification for resource sharing
4. Include custom message from coach in notification
5. Add notification preferences (immediate, digest, off)

**Testing:**
- Test notification sent when resource shared
- Test custom message inclusion
- Test notification preferences respected

**Acceptance Criteria:**
- [ ] Clients receive notification when resource shared
- [ ] Notification includes resource name and coach message
- [ ] Users can control notification preferences
- [ ] Notifications link directly to resource

---

#### Task 1.4.5: Track Resource Share Analytics

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/lib/services/resource-library-service.ts` (line 307)
- `supabase/migrations/YYYYMMDD_track_resource_shares.sql` (create)

**Implementation Steps:**
1. Add share_created_at and share_updated_at to resource_shares table
2. Track upserts (new vs updated shares)
3. Add share analytics to dashboard
4. Show share history per resource
5. Track share method (all clients vs individual)

**Testing:**
- Test share creation tracking
- Test share update detection
- Test analytics display

**Acceptance Criteria:**
- [ ] System distinguishes new shares from updates
- [ ] Share history is available per resource
- [ ] Analytics show share patterns over time

---

#### Task 1.4.6: Implement Engagement Time Tracking

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/lib/database/resources/analytics.ts` (line 148, 157)
- `supabase/migrations/YYYYMMDD_track_engagement_time.sql` (create)

**Implementation Steps:**
1. Add engagement_time_seconds to resource_client_progress table
2. Add download_count column
3. Implement client-side time tracking with visibility API
4. Send periodic updates to server
5. Update analytics to show engagement time
6. Calculate average engagement time per resource

**Testing:**
- Test time tracking accuracy
- Test time updates sent to server
- Test engagement time in analytics

**Acceptance Criteria:**
- [ ] Time spent on resources is tracked accurately
- [ ] Downloads are counted separately from views
- [ ] Analytics show average engagement time
- [ ] Time tracking handles tab switching correctly

---

#### Task 1.4.7: Implement CSV Export for Analytics

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/components/resources/resource-analytics-dashboard.tsx` (line 84)
- `src/app/api/coach/resources/analytics/export/route.ts` (create)

**Implementation Steps:**
1. Create CSV export endpoint
2. Format analytics data as CSV
3. Include all metrics (views, completions, engagement)
4. Add date range to export
5. Implement streaming for large datasets
6. Add download button to UI

**Testing:**
- Test CSV format is correct
- Test data accuracy
- Test export with date ranges

**Acceptance Criteria:**
- [ ] CSV export includes all analytics metrics
- [ ] File downloads correctly in browser
- [ ] Data matches dashboard display
- [ ] Export works for large datasets

---

## Phase 2: Core MVP Features

**Goal:** Implement critical user-facing features needed for MVP launch.

**Estimated Duration:** 6-8 weeks

### 2.1 Session Booking System

#### Task 2.1.1: Implement Coach Availability Management

**Status:** [ ] Not Started

**Prerequisites:** None (availability manager exists but needs enhancement)

**Files to Modify:**
- `src/components/coach/availability-manager.tsx`
- `src/app/api/coaches/[id]/availability/route.ts`
- `supabase/migrations/YYYYMMDD_enhance_availability_schema.sql` (create)

**Implementation Steps:**
1. Enhance availability schema:
   - Add recurring_pattern (weekly, biweekly)
   - Add buffer_minutes_before, buffer_minutes_after
   - Add max_sessions_per_day, max_sessions_per_week
   - Add exceptions table for one-time changes
2. Implement recurring availability patterns UI
3. Add buffer time configuration
4. Implement session limits
5. Create availability exceptions interface
6. Add vacation/time-off management
7. Implement timezone handling

**Testing:**
- Test recurring pattern creation
- Test availability exceptions
- Test buffer time application
- Test session limit enforcement
- Test timezone conversions

**Acceptance Criteria:**
- [ ] Coaches can set weekly recurring availability
- [ ] Buffer times are automatically applied
- [ ] Session limits are enforced
- [ ] Exceptions override recurring patterns
- [ ] Timezone handling is correct

---

#### Task 2.1.2: Implement Coach Discovery Interface

**Status:** [ ] Not Started

**Prerequisites:** Task 2.1.1

**Files to Modify:**
- `src/app/[locale]/(authenticated)/client/coaches/page.tsx`
- `src/components/client/coach-directory.tsx` (create)
- `src/app/api/coaches/route.ts` (enhance)

**Implementation Steps:**
1. Create coach directory component with grid/list views
2. Add coach profile cards with key info:
   - Name, avatar, bio
   - Specialties/expertise
   - Rating and review count
   - Next available slot
   - Session rate
3. Implement search by name, specialty
4. Add filters (availability, rating, rate range)
5. Add sorting (rating, price, availability)
6. Implement coach profile modal/page
7. Add "Book Session" CTA

**Testing:**
- Test coach list display
- Test search functionality
- Test filters and sorting
- Test coach profile viewing

**Acceptance Criteria:**
- [ ] Clients can browse all coaches
- [ ] Search returns relevant results
- [ ] Filters work correctly
- [ ] Coach profiles show complete information
- [ ] Next available time slot is displayed

---

#### Task 2.1.3: Implement Session Booking Flow

**Status:** [ ] Not Started

**Prerequisites:** Task 2.1.1, Task 2.1.2

**Files to Modify:**
- `src/app/[locale]/(authenticated)/client/book/page.tsx`
- `src/components/sessions/booking/booking-wizard.tsx` (create)
- `src/app/api/sessions/book/route.ts` (create)

**Implementation Steps:**
1. Create multi-step booking wizard:
   - Step 1: Select coach (or pre-selected)
   - Step 2: Select session type (initial, follow-up, etc.)
   - Step 3: Select date and time from available slots
   - Step 4: Add notes/agenda
   - Step 5: Review and confirm
2. Integrate with coach availability API
3. Display available time slots in client timezone
4. Implement slot reservation (hold for 10 minutes)
5. Create session on confirmation
6. Send confirmation emails to both parties
7. Add calendar integration options (Google, iCal)

**Testing:**
- Test complete booking flow
- Test slot reservation expiration
- Test timezone handling
- Test confirmation emails
- Test double-booking prevention

**Acceptance Criteria:**
- [ ] Clients can book sessions with any coach
- [ ] Only available slots are shown
- [ ] Slots are held during booking process
- [ ] Double-booking is prevented
- [ ] Both parties receive confirmations
- [ ] Bookings appear in calendars

---

#### Task 2.1.4: Implement Session List and Detail Views

**Status:** [ ] Not Started

**Prerequisites:** Task 2.1.3

**Files to Modify:**
- `src/app/[locale]/(authenticated)/client/sessions/page.tsx`
- `src/app/[locale]/(authenticated)/client/sessions/[id]/page.tsx`
- `src/components/sessions/session-list.tsx` (create)
- `src/components/sessions/session-detail.tsx` (create)

**Implementation Steps:**
1. Create session list component with filters:
   - Upcoming sessions
   - Past sessions
   - Cancelled sessions
2. Add session status indicators
3. Implement session detail view:
   - Session info (date, time, coach, type)
   - Join meeting link (if applicable)
   - Session notes (coach and client)
   - Action items
   - Resources shared
   - Feedback/rating section
4. Add reschedule functionality
5. Add cancel functionality with policy enforcement
6. Implement session reminders

**Testing:**
- Test session list filtering
- Test session detail display
- Test reschedule flow
- Test cancellation with policy
- Test reminder sending

**Acceptance Criteria:**
- [ ] Users can view all their sessions
- [ ] Filters work correctly
- [ ] Session details are complete
- [ ] Reschedule follows availability rules
- [ ] Cancellation policy is enforced
- [ ] Reminders are sent at configured times

---

### 2.2 Real-Time Messaging System

#### Task 2.2.1: Implement Conversation Management

**Status:** [ ] Not Started

**Prerequisites:** Task 1.2.1 (Realtime mock for testing)

**Files to Modify:**
- `src/app/[locale]/(authenticated)/messages/page.tsx`
- `src/components/messages/conversation-list.tsx` (create)
- `src/components/messages/conversation-view.tsx` (create)
- `src/app/api/messages/route.ts` (enhance)

**Implementation Steps:**
1. Create conversation list UI:
   - Show all conversations
   - Display last message preview
   - Show unread count badge
   - Sort by most recent
2. Add conversation search
3. Implement conversation creation
4. Add participant info display
5. Create empty state UI
6. Add conversation archiving
7. Implement conversation settings

**Testing:**
- Test conversation list display
- Test search functionality
- Test new conversation creation
- Test unread count accuracy

**Acceptance Criteria:**
- [ ] Users can see all conversations
- [ ] Unread counts are accurate
- [ ] Search returns relevant conversations
- [ ] New conversations can be started
- [ ] Archived conversations are hidden

---

#### Task 2.2.2: Implement Real-Time Chat Interface

**Status:** [ ] Not Started

**Prerequisites:** Task 2.2.1, Task 1.2.1

**Files to Modify:**
- `src/components/messages/message-thread.tsx` (create)
- `src/components/messages/message-input.tsx` (create)
- `src/lib/hooks/useRealtimeMessages.ts` (create)

**Implementation Steps:**
1. Create message thread component:
   - Display messages in chronological order
   - Group messages by date
   - Show sender info and timestamp
   - Implement infinite scroll for history
2. Create message input with:
   - Text input with shift+enter for new line
   - Send button
   - File attachment button
   - Emoji picker
3. Implement Supabase Realtime subscription:
   - Subscribe to conversation channel
   - Handle new message events
   - Handle typing indicators
   - Handle read receipts
4. Add optimistic updates
5. Implement retry for failed sends
6. Add message status indicators (sending, sent, delivered, read)

**Testing:**
- Test real-time message delivery
- Test message history loading
- Test optimistic updates
- Test connection loss handling
- Test message retry

**Acceptance Criteria:**
- [ ] Messages appear in real-time
- [ ] Message history loads correctly
- [ ] Optimistic updates work smoothly
- [ ] Failed messages can be retried
- [ ] Connection issues are handled gracefully

---

#### Task 2.2.3: Implement Message Features

**Status:** [ ] Not Started

**Prerequisites:** Task 2.2.2

**Files to Modify:**
- `src/components/messages/message-item.tsx` (create)
- `src/app/api/messages/[conversationId]/[messageId]/reactions/route.ts`
- `src/components/messages/message-attachments.tsx` (create)

**Implementation Steps:**
1. Implement typing indicators
2. Add read receipts
3. Implement message reactions
4. Add file/image attachments:
   - Upload progress indicator
   - Image preview
   - File download
5. Add message search within conversation
6. Implement message editing (within 5 minutes)
7. Add message deletion
8. Implement message threading/replies (optional)

**Testing:**
- Test typing indicators
- Test read receipts
- Test reactions
- Test file uploads
- Test message search

**Acceptance Criteria:**
- [ ] Typing indicators show in real-time
- [ ] Read receipts are accurate
- [ ] Reactions work on all messages
- [ ] Files can be attached and downloaded
- [ ] Message search returns accurate results

---

#### Task 2.2.4: Implement Message Notifications

**Status:** [ ] Not Started

**Prerequisites:** Task 2.2.2, Task 2.6.1

**Files to Modify:**
- `src/lib/services/notification-service.ts`
- `supabase/functions/send-message-notification/index.ts` (create)

**Implementation Steps:**
1. Create database trigger for new messages
2. Call notification service on new message
3. Send push notification if user is offline
4. Send email notification if configured
5. Include message preview in notification
6. Add notification grouping (multiple messages)
7. Implement notification preferences

**Testing:**
- Test notification sent for new messages
- Test notification preferences respected
- Test notification grouping
- Test online/offline detection

**Acceptance Criteria:**
- [ ] Users receive notifications for new messages
- [ ] Notifications include message preview
- [ ] Online users don't get redundant notifications
- [ ] Notification preferences are respected

---

### 2.3 Payment Integration

#### Task 2.3.1: Set Up Stripe Integration

**Status:** [ ] Not Started

**Prerequisites:** Stripe account

**Files to Modify:**
- `.env.local` (add Stripe keys)
- `src/lib/services/payment-service.ts` (create)
- `src/app/api/payments/webhook/route.ts` (create)

**Implementation Steps:**
1. Install Stripe SDK: `npm install stripe @stripe/stripe-js`
2. Configure Stripe keys in environment
3. Create payment service wrapper
4. Set up Stripe webhook endpoint
5. Implement webhook signature verification
6. Handle payment events (success, failure, refund)
7. Create payment intent creation endpoint

**Testing:**
- Test payment intent creation
- Test webhook signature verification
- Test payment event handling
- Test refund processing

**Acceptance Criteria:**
- [ ] Stripe SDK is configured
- [ ] Webhook endpoint is secure
- [ ] Payment events are handled correctly
- [ ] Errors are logged appropriately

---

#### Task 2.3.2: Implement Session Payment Flow

**Status:** [ ] Not Started

**Prerequisites:** Task 2.3.1, Task 2.1.3

**Files to Modify:**
- `src/components/sessions/booking/payment-step.tsx` (create)
- `src/app/api/sessions/book/route.ts`
- `src/app/api/payments/create-intent/route.ts` (create)

**Implementation Steps:**
1. Add payment step to booking wizard
2. Create Stripe payment intent for session
3. Implement Stripe Elements for card input
4. Handle payment confirmation
5. Link payment to session record
6. Handle payment failures with retry
7. Implement payment method saving (optional)
8. Add payment receipt generation

**Testing:**
- Test successful payment flow
- Test payment failure handling
- Test payment method saving
- Test receipt generation

**Acceptance Criteria:**
- [ ] Users can pay for sessions during booking
- [ ] Card details are handled securely
- [ ] Payment failures show clear messages
- [ ] Successful payments create session
- [ ] Receipts are generated and emailed

---

#### Task 2.3.3: Implement Payment Management

**Status:** [ ] Not Started

**Prerequisites:** Task 2.3.2

**Files to Modify:**
- `src/app/[locale]/(authenticated)/settings/payments/page.tsx` (create)
- `src/components/settings/payment-methods.tsx` (create)
- `src/app/api/payments/methods/route.ts` (create)

**Implementation Steps:**
1. Create payment methods management page
2. Implement add payment method
3. Implement remove payment method
4. Set default payment method
5. Display payment history
6. Show upcoming payments (if subscriptions)
7. Add invoice download
8. Implement refund requests

**Testing:**
- Test payment method CRUD
- Test payment history display
- Test invoice download

**Acceptance Criteria:**
- [ ] Users can manage payment methods
- [ ] Payment history is accurate
- [ ] Invoices can be downloaded
- [ ] Default payment method is used in bookings

---

#### Task 2.3.4: Implement Coach Payout System

**Status:** [ ] Not Started

**Prerequisites:** Task 2.3.2

**Files to Modify:**
- `src/app/[locale]/(authenticated)/coach/earnings/page.tsx` (create)
- `src/components/coach/earnings-dashboard.tsx` (create)
- `src/app/api/coach/payouts/route.ts` (create)

**Implementation Steps:**
1. Implement Stripe Connect for coaches
2. Create coach onboarding for Stripe Connect
3. Display earnings dashboard:
   - Total earnings
   - Pending payouts
   - Completed payouts
   - Platform fees
4. Implement payout schedule (weekly, monthly)
5. Add payout method management
6. Show payout history
7. Generate payout reports

**Testing:**
- Test Stripe Connect onboarding
- Test earnings calculation
- Test payout processing
- Test payout history accuracy

**Acceptance Criteria:**
- [ ] Coaches can connect Stripe account
- [ ] Earnings are calculated correctly
- [ ] Payouts are processed on schedule
- [ ] Platform fees are transparent
- [ ] Payout history is accurate

---

### 2.4 Client Progress Tracking

#### Task 2.4.1: Implement Goals System

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `supabase/migrations/YYYYMMDD_add_goals_schema.sql` (create)
- `src/app/api/client/goals/route.ts` (create)
- `src/components/client/goals-manager.tsx` (create)

**Implementation Steps:**
1. Create goals table:
   - client_id (uuid)
   - coach_id (uuid)
   - title (text)
   - description (text)
   - target_date (date)
   - status (enum: not_started, in_progress, completed, abandoned)
   - progress_percentage (integer)
   - created_at, updated_at
2. Create RLS policies for goals
3. Implement goal CRUD API
4. Create goals manager UI:
   - Create/edit goals
   - Set target dates
   - Update progress
   - Mark complete
5. Add goal visualization (progress bars, charts)
6. Implement goal milestones (sub-goals)

**Testing:**
- Test goal creation by client and coach
- Test progress updates
- Test RLS policies
- Test goal completion

**Acceptance Criteria:**
- [ ] Clients and coaches can create goals
- [ ] Progress can be tracked over time
- [ ] Goals have clear completion criteria
- [ ] Goal history is maintained

---

#### Task 2.4.2: Implement Progress Dashboard

**Status:** [ ] Not Started

**Prerequisites:** Task 2.4.1, Task 2.1.4

**Files to Modify:**
- `src/app/[locale]/(authenticated)/client/progress/page.tsx`
- `src/components/client/progress-dashboard.tsx` (create)
- `src/app/api/client/progress/route.ts` (create)

**Implementation Steps:**
1. Create progress overview dashboard:
   - Goals progress
   - Session attendance (completed vs scheduled)
   - Task completion rate
   - Resource engagement
   - Overall progress score
2. Add progress charts:
   - Line chart: progress over time
   - Bar chart: goals by status
   - Radar chart: progress in different areas
3. Implement milestones timeline
4. Add progress insights and recommendations
5. Create progress comparison (month-over-month)
6. Add progress sharing with coach

**Testing:**
- Test progress calculation accuracy
- Test charts render correctly
- Test date range filtering

**Acceptance Criteria:**
- [ ] Dashboard shows comprehensive progress view
- [ ] Charts accurately represent data
- [ ] Progress score is meaningful
- [ ] Users can filter by date range
- [ ] Progress can be shared with coach

---

#### Task 2.4.3: Implement Progress Reports

**Status:** [ ] Not Started

**Prerequisites:** Task 2.4.2

**Files to Modify:**
- `src/app/api/client/progress/report/route.ts` (create)
- `src/lib/services/report-generator.ts` (create)

**Implementation Steps:**
1. Install PDF generation library: `npm install pdfkit`
2. Create progress report template
3. Include in report:
   - Date range
   - Goals summary
   - Session attendance
   - Task completion
   - Resource engagement
   - Key achievements
   - Areas for improvement
   - Coach notes (if shared)
4. Implement report generation API
5. Add download button to progress page
6. Add scheduled report generation (monthly)

**Testing:**
- Test report generation
- Test PDF formatting
- Test data accuracy in reports

**Acceptance Criteria:**
- [ ] Reports are generated as PDF
- [ ] Reports include all key metrics
- [ ] Reports are well-formatted
- [ ] Reports can be downloaded or emailed

---

### 2.5 Reflections/Journal System

#### Task 2.5.1: Implement Reflection Database Schema

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `supabase/migrations/YYYYMMDD_practice_journal_enhancements.sql` (create)
- `src/app/api/client/reflections/route.ts` (enhance)

**Implementation Steps:**
1. Enhance practice_journals table (if exists) or create reflections table:
   - client_id (uuid)
   - title (text)
   - content (text, rich text)
   - mood (enum: very_bad, bad, neutral, good, very_good)
   - tags (text[])
   - is_shared_with_coach (boolean)
   - session_id (uuid, optional)
   - created_at, updated_at
2. Create RLS policies for reflections
3. Create reflection_prompts table for coach-provided prompts
4. Add reflection_responses table to link reflections to prompts

**Testing:**
- Test reflection creation
- Test RLS policies
- Test sharing with coach

**Acceptance Criteria:**
- [ ] Reflections are stored securely
- [ ] Privacy is maintained (private by default)
- [ ] Reflections can be linked to sessions
- [ ] Prompts can be provided by coaches

---

#### Task 2.5.2: Implement Reflection Interface

**Status:** [ ] Not Started

**Prerequisites:** Task 2.5.1

**Files to Modify:**
- `src/app/[locale]/(authenticated)/client/reflections/page.tsx`
- `src/components/client/reflection-journal.tsx` (create)
- `src/components/client/reflection-editor.tsx` (create)

**Implementation Steps:**
1. Create reflection journal list view:
   - Timeline view of reflections
   - Filter by date, mood, tags
   - Search reflections
2. Implement rich text editor for reflections:
   - Formatting (bold, italic, lists)
   - Emoji support
   - Auto-save drafts
3. Add mood selector with icons
4. Implement tag input
5. Add session linking
6. Create reflection templates
7. Add prompt response interface
8. Implement share toggle

**Testing:**
- Test reflection creation and editing
- Test rich text formatting
- Test auto-save
- Test search and filtering

**Acceptance Criteria:**
- [ ] Users can create reflections easily
- [ ] Rich text editing works smoothly
- [ ] Auto-save prevents data loss
- [ ] Reflections can be organized with tags
- [ ] Sharing with coach is clear

---

#### Task 2.5.3: Implement Reflection Analytics

**Status:** [ ] Not Started

**Prerequisites:** Task 2.5.2

**Files to Modify:**
- `src/components/client/reflection-insights.tsx` (create)
- `src/app/api/client/reflections/analytics/route.ts` (create)

**Implementation Steps:**
1. Create reflection analytics view:
   - Reflection frequency (weekly, monthly)
   - Mood trends over time
   - Common themes/tags
   - Word cloud of frequent words
   - Longest reflection streak
2. Add coach view of client reflections (if shared)
3. Implement reflection reminders
4. Add reflection goals (e.g., 3x per week)

**Testing:**
- Test analytics calculation
- Test mood trend accuracy
- Test coach access to shared reflections

**Acceptance Criteria:**
- [ ] Analytics provide meaningful insights
- [ ] Mood trends are visualized clearly
- [ ] Coaches can view shared reflections
- [ ] Users can set reflection goals

---

### 2.6 Notifications System

#### Task 2.6.1: Implement Push Notification Infrastructure

**Status:** [ ] Not Started

**Prerequisites:** Firebase project with Cloud Messaging

**Files to Modify:**
- `.env.local` (add Firebase config)
- `src/lib/services/notification-service.ts` (create)
- `supabase/functions/send-push-notification/index.ts` (create)
- `public/firebase-messaging-sw.js` (create)

**Implementation Steps:**
1. Install Firebase SDK: `npm install firebase`
2. Configure Firebase Cloud Messaging
3. Create service worker for push notifications
4. Implement token registration on login
5. Create notification service:
   - requestPermission()
   - subscribeToTopic()
   - sendNotification()
6. Store FCM tokens in database
7. Implement token refresh logic
8. Create Supabase Edge Function to send notifications

**Testing:**
- Test notification permission request
- Test token registration
- Test notification delivery
- Test token refresh

**Acceptance Criteria:**
- [ ] Users can grant notification permission
- [ ] Tokens are registered correctly
- [ ] Push notifications are delivered
- [ ] Service worker handles background notifications

---

#### Task 2.6.2: Implement Notification Preferences

**Status:** [ ] Not Started

**Prerequisites:** Task 2.6.1

**Files to Modify:**
- `src/app/[locale]/(authenticated)/settings/notifications/page.tsx`
- `src/components/settings/notification-preferences.tsx` (create)
- `src/app/api/settings/notifications/route.ts` (create)

**Implementation Steps:**
1. Create notification preferences UI:
   - Push notifications toggle
   - Email notifications toggle
   - SMS notifications toggle (if applicable)
2. Add per-event-type preferences:
   - New message
   - Session reminder (1 hour, 1 day before)
   - Session booked/cancelled
   - Resource shared
   - Task assigned
   - Goal milestone reached
3. Implement quiet hours (do not disturb)
4. Add notification preview/testing
5. Store preferences in database
6. Respect preferences in all notification sends

**Testing:**
- Test preferences save correctly
- Test notifications respect preferences
- Test quiet hours
- Test preview functionality

**Acceptance Criteria:**
- [ ] Users can control all notification types
- [ ] Preferences are saved and respected
- [ ] Quiet hours prevent notifications
- [ ] Users can test notifications

---

#### Task 2.6.3: Implement Notification Triggers

**Status:** [ ] Not Started

**Prerequisites:** Task 2.6.1, Task 2.6.2

**Files to Modify:**
- Various event handlers throughout app
- `src/lib/services/notification-service.ts`

**Implementation Steps:**
1. Add notification triggers for:
   - New message received (Task 2.2.4)
   - Session booked (Task 2.1.3)
   - Session reminder (scheduled)
   - Session cancelled/rescheduled
   - Resource shared (Task 1.4.4)
   - Task assigned
   - Goal completed
   - Payment received (coach)
2. Implement notification batching (digest mode)
3. Add notification templates for each type
4. Implement link actions in notifications
5. Add notification history/center

**Testing:**
- Test each notification trigger
- Test notification content
- Test notification actions

**Acceptance Criteria:**
- [ ] All key events trigger notifications
- [ ] Notifications have clear, actionable content
- [ ] Users can access notification history
- [ ] Notification links work correctly

---

### 2.7 Coach Notes System

#### Task 2.7.1: Implement Notes Database Schema

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `supabase/migrations/YYYYMMDD_add_coach_notes.sql` (create)
- `src/app/api/coach/notes/route.ts` (create)

**Implementation Steps:**
1. Create coach_notes table:
   - id (uuid)
   - coach_id (uuid)
   - client_id (uuid)
   - session_id (uuid, optional)
   - title (text)
   - content (text, rich text)
   - is_shared_with_client (boolean)
   - tags (text[])
   - created_at, updated_at
2. Create RLS policies:
   - Coaches can CRUD their own notes
   - Clients can read shared notes only
3. Create note templates table
4. Add attachments support

**Testing:**
- Test note creation
- Test RLS policies
- Test client access to shared notes

**Acceptance Criteria:**
- [ ] Coaches can create private notes
- [ ] Notes can be linked to sessions
- [ ] Shared notes are accessible to clients
- [ ] RLS prevents unauthorized access

---

#### Task 2.7.2: Implement Notes Management Interface

**Status:** [ ] Not Started

**Prerequisites:** Task 2.7.1

**Files to Modify:**
- `src/app/[locale]/(authenticated)/coach/notes/page.tsx`
- `src/components/coach/notes-manager.tsx` (create)
- `src/components/coach/note-editor.tsx` (create)

**Implementation Steps:**
1. Create notes list view:
   - List all notes
   - Filter by client, session, tags
   - Search notes
   - Sort by date, client
2. Implement rich text editor for notes:
   - Formatting support
   - Auto-save
   - Version history
3. Add client association
4. Add session association
5. Implement share toggle
6. Add note templates
7. Implement note categories/tags
8. Add attachments support

**Testing:**
- Test note CRUD operations
- Test rich text editing
- Test auto-save
- Test search and filtering

**Acceptance Criteria:**
- [ ] Coaches can create notes easily
- [ ] Notes can be organized by client/session
- [ ] Rich text editing works smoothly
- [ ] Search returns relevant results
- [ ] Templates speed up note creation

---

#### Task 2.7.3: Integrate Notes with Sessions

**Status:** [ ] Not Started

**Prerequisites:** Task 2.7.2, Task 2.1.4

**Files to Modify:**
- `src/components/sessions/session-detail.tsx`
- `src/components/coach/session-notes-section.tsx` (create)

**Implementation Steps:**
1. Add notes section to session detail page
2. Show coach notes (if coach viewing)
3. Show shared notes (if client viewing)
4. Add quick note creation during/after session
5. Add note templates for session notes
6. Implement action items extraction from notes
7. Link notes to client profile

**Testing:**
- Test note display in session view
- Test note creation from session
- Test visibility rules

**Acceptance Criteria:**
- [ ] Notes appear in session details
- [ ] Coaches can take notes during sessions
- [ ] Clients can see shared session notes
- [ ] Action items are highlighted

---

## Phase 3: Secondary Features

**Goal:** Implement important features that enhance the platform but aren't critical for MVP.

**Estimated Duration:** 4-6 weeks

### 3.1 Enhanced Onboarding

#### Task 3.1.1: Implement Client Onboarding Flow

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/app/[locale]/(authenticated)/onboarding/page.tsx`
- `src/components/onboarding/client-onboarding.tsx` (create)

**Implementation Steps:**
1. Create multi-step onboarding wizard:
   - Step 1: Welcome and platform overview
   - Step 2: Profile completion (bio, goals)
   - Step 3: Select coaching areas of interest
   - Step 4: Browse and follow coaches
   - Step 5: Book first session (optional)
   - Step 6: Tour of key features
2. Add progress tracking
3. Implement skip/later functionality
4. Add onboarding state persistence
5. Create completion reward/badge

**Testing:**
- Test complete onboarding flow
- Test skip functionality
- Test state persistence

**Acceptance Criteria:**
- [ ] New clients complete onboarding smoothly
- [ ] Users can skip optional steps
- [ ] Progress is saved between sessions
- [ ] Onboarding can be resumed later

---

#### Task 3.1.2: Implement Coach Onboarding Flow

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/app/[locale]/(authenticated)/onboarding/coach/page.tsx`
- `src/components/onboarding/coach-onboarding.tsx` (create)

**Implementation Steps:**
1. Create coach onboarding wizard:
   - Step 1: Welcome and value proposition
   - Step 2: Profile setup (bio, expertise, credentials)
   - Step 3: Upload certifications/proof
   - Step 4: Set coaching specialties
   - Step 5: Configure availability
   - Step 6: Set rates and pricing
   - Step 7: Payment setup (Stripe Connect)
   - Step 8: Upload initial resources
   - Step 9: Review and submit for verification
2. Add verification workflow
3. Implement application review (admin)
4. Send approval/rejection emails

**Testing:**
- Test complete coach onboarding
- Test verification workflow
- Test admin review process

**Acceptance Criteria:**
- [ ] New coaches complete onboarding
- [ ] All required information is collected
- [ ] Verification process is clear
- [ ] Coaches can't accept clients until verified

---

### 3.2 Advanced Search and Discovery

#### Task 3.2.1: Implement Global Search

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/components/layout/global-search.tsx` (create)
- `src/app/api/search/route.ts` (create)

**Implementation Steps:**
1. Add global search bar to header
2. Implement search API that searches:
   - Coaches (name, bio, specialties)
   - Resources (name, description, tags)
   - Sessions (titles, notes)
   - Messages (content)
   - Tasks (title, description)
3. Add search result categories
4. Implement keyboard shortcuts (cmd+k / ctrl+k)
5. Add recent searches
6. Add search suggestions
7. Implement full-text search with PostgreSQL

**Testing:**
- Test search across all categories
- Test search performance
- Test keyboard shortcuts

**Acceptance Criteria:**
- [ ] Search returns relevant results quickly
- [ ] Results are categorized clearly
- [ ] Keyboard shortcut works
- [ ] Search handles typos gracefully

---

#### Task 3.2.2: Implement Advanced Filters

**Status:** [ ] Not Started

**Prerequisites:** Task 3.2.1

**Files to Modify:**
- `src/components/shared/filter-panel.tsx` (create)
- Various list pages

**Implementation Steps:**
1. Create reusable filter panel component
2. Add filters for coach directory:
   - Specialties (multi-select)
   - Availability (date range)
   - Rating (minimum)
   - Rate range (slider)
   - Language
   - Certifications
3. Add filters for resources:
   - Category (multi-select)
   - Tags (multi-select)
   - Date added
   - File type
4. Add filters for sessions:
   - Date range
   - Coach
   - Status
   - Type
5. Persist filter state in URL
6. Add saved filter presets

**Testing:**
- Test filters on all applicable pages
- Test filter combinations
- Test URL state persistence

**Acceptance Criteria:**
- [ ] Filters work consistently across pages
- [ ] Multiple filters can be combined
- [ ] Filter state persists in URL
- [ ] Users can save favorite filter combinations

---

### 3.3 Calendar Integration

#### Task 3.3.1: Implement Google Calendar Integration

**Status:** [ ] Not Started

**Prerequisites:** Google Cloud project with Calendar API

**Files to Modify:**
- `.env.local` (add Google Calendar API keys)
- `src/lib/services/calendar-service.ts` (create)
- `src/app/api/integrations/google-calendar/route.ts` (create)

**Implementation Steps:**
1. Set up Google Calendar API credentials
2. Implement OAuth flow for Google Calendar
3. Add calendar connection in settings
4. Sync sessions to Google Calendar
5. Support two-way sync (create session from calendar event)
6. Add calendar event updates on session changes
7. Handle disconnection

**Testing:**
- Test OAuth flow
- Test session sync to Google Calendar
- Test event updates
- Test disconnection

**Acceptance Criteria:**
- [ ] Users can connect Google Calendar
- [ ] Sessions appear in Google Calendar
- [ ] Changes sync both ways
- [ ] Users can disconnect calendar

---

#### Task 3.3.2: Implement iCal Export

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/app/api/sessions/calendar.ics/route.ts` (create)
- `src/components/sessions/calendar-export.tsx` (create)

**Implementation Steps:**
1. Install iCal library: `npm install ical-generator`
2. Create iCal feed endpoint for user's sessions
3. Generate authentication token for feed URL
4. Add "Subscribe to Calendar" button
5. Provide instructions for various calendar apps
6. Include session details in calendar events

**Testing:**
- Test iCal feed generation
- Test feed in various calendar apps
- Test authentication

**Acceptance Criteria:**
- [ ] iCal feed is valid
- [ ] Feed works in common calendar apps
- [ ] Feed is secure (authenticated)
- [ ] All session details are included

---

### 3.4 Email System

#### Task 3.4.1: Set Up Email Infrastructure

**Status:** [ ] Not Started

**Prerequisites:** Email service account (SendGrid, AWS SES, etc.)

**Files to Modify:**
- `.env.local` (add email service keys)
- `src/lib/services/email-service.ts` (create)
- `src/lib/email/templates/` (create directory)

**Implementation Steps:**
1. Choose and set up email service
2. Install email library
3. Create email service wrapper
4. Create email templates:
   - Welcome email
   - Email verification
   - Password reset
   - Session confirmation
   - Session reminder
   - Payment receipt
   - Resource shared notification
   - Weekly digest
5. Implement template rendering
6. Add email sending queue (with retry)
7. Track email delivery status

**Testing:**
- Test email sending
- Test template rendering
- Test delivery tracking

**Acceptance Criteria:**
- [ ] Emails are delivered reliably
- [ ] Templates are well-formatted
- [ ] Unsubscribe links are included
- [ ] Delivery failures are logged

---

#### Task 3.4.2: Implement Email Notifications

**Status:** [ ] Not Started

**Prerequisites:** Task 3.4.1, Task 2.6.2

**Files to Modify:**
- `src/lib/services/notification-service.ts`
- Various notification triggers

**Implementation Steps:**
1. Add email channel to notification service
2. Respect email notification preferences
3. Send emails for key events:
   - Session booked/cancelled
   - New message (if offline for 30+ minutes)
   - Resource shared
   - Task assigned
   - Payment received/sent
   - Weekly activity digest
4. Implement digest mode (batch emails)
5. Add unsubscribe handling
6. Track email open rates (optional)

**Testing:**
- Test email notifications sent
- Test preference enforcement
- Test digest mode
- Test unsubscribe

**Acceptance Criteria:**
- [ ] All key events trigger email (if enabled)
- [ ] Email preferences are respected
- [ ] Digest mode reduces email volume
- [ ] Unsubscribe works correctly

---

### 3.5 Advanced Analytics

#### Task 3.5.1: Implement Coach Insights Dashboard

**Status:** [ ] Not Started

**Prerequisites:** Task 2.1.4

**Files to Modify:**
- `src/app/[locale]/(authenticated)/coach/insights/page.tsx`
- `src/components/coach/insights-dashboard.tsx` (create)
- `src/app/api/coach/insights/route.ts` (create)

**Implementation Steps:**
1. Create comprehensive insights dashboard:
   - Revenue analytics (total, by period, forecasting)
   - Session metrics (total, completion rate, no-show rate)
   - Client metrics (total, active, retention rate, churn)
   - Booking patterns (popular times, fill rate)
   - Resource engagement (most popular, least used)
   - Client satisfaction (average rating, trends)
2. Add comparison views (week-over-week, month-over-month)
3. Implement custom date ranges
4. Add export to PDF/CSV
5. Create goal setting (revenue targets, client goals)

**Testing:**
- Test all metric calculations
- Test date range filtering
- Test export functionality

**Acceptance Criteria:**
- [ ] Dashboard shows comprehensive business metrics
- [ ] Calculations are accurate
- [ ] Data visualizations are clear
- [ ] Insights are actionable

---

#### Task 3.5.2: Implement Admin Analytics Enhancements

**Status:** [ ] Not Started

**Prerequisites:** Existing admin analytics

**Files to Modify:**
- `src/app/[locale]/(authenticated)/admin/analytics/page.tsx`
- `src/lib/database/admin-analytics.ts`

**Implementation Steps:**
1. Add custom date range selection
2. Implement cohort analysis:
   - User cohorts by signup date
   - Retention by cohort
   - Revenue by cohort
3. Add funnel analysis:
   - Signup to first session
   - Session booking to completion
   - Free to paid conversion
4. Implement geographic analytics
5. Add user segmentation
6. Create scheduled reports
7. Add export functionality

**Testing:**
- Test cohort analysis accuracy
- Test funnel calculations
- Test scheduled reports

**Acceptance Criteria:**
- [ ] Advanced analytics provide deep insights
- [ ] Cohort analysis shows retention patterns
- [ ] Funnels identify drop-off points
- [ ] Reports can be scheduled and automated

---

### 3.6 Content and Resource Enhancements

#### Task 3.6.1: Implement Resource Scheduling

**Status:** [ ] Not Started

**Prerequisites:** Existing resource library

**Files to Modify:**
- `supabase/migrations/YYYYMMDD_add_resource_scheduling.sql` (create)
- `src/components/resources/resource-scheduler.tsx` (create)

**Implementation Steps:**
1. Add scheduled_share_date to resource_shares table
2. Create background job to process scheduled shares
3. Add scheduling UI to resource sharing
4. Implement recurring sharing (weekly, monthly)
5. Add schedule preview
6. Allow schedule editing/cancellation

**Testing:**
- Test scheduled share processing
- Test recurring shares
- Test schedule editing

**Acceptance Criteria:**
- [ ] Resources can be scheduled for future sharing
- [ ] Scheduled shares are processed on time
- [ ] Recurring shares work correctly
- [ ] Schedules can be modified before execution

---

#### Task 3.6.2: Implement Resource Collections for Clients

**Status:** [ ] Not Started

**Prerequisites:** Existing resource collections

**Files to Modify:**
- `src/components/client/resource-collections-view.tsx` (create)
- `src/app/api/client/resources/collections/route.ts`

**Implementation Steps:**
1. Display collections on client resource page
2. Show collection progress (X of Y completed)
3. Add collection detail view
4. Implement collection sequencing (must complete in order)
5. Add collection prerequisites
6. Show estimated time to complete
7. Add collection completion badges

**Testing:**
- Test collection display
- Test progress tracking
- Test prerequisites enforcement

**Acceptance Criteria:**
- [ ] Collections organize resources clearly
- [ ] Progress is tracked per collection
- [ ] Prerequisites guide learning path
- [ ] Completion provides sense of achievement

---

## Phase 4: Advanced Features

**Goal:** Implement sophisticated features that differentiate the platform.

**Estimated Duration:** 4-6 weeks

### 4.1 Social and Community Features

#### Task 4.1.1: Implement Coach Reviews and Ratings

**Status:** [ ] Not Started

**Prerequisites:** Task 1.4.2

**Files to Modify:**
- `src/components/coach/coach-reviews.tsx` (create)
- `src/app/api/coaches/[id]/reviews/route.ts` (create)

**Implementation Steps:**
1. Create reviews table (if not exists from Task 1.4.2)
2. Display reviews on coach profile
3. Add review submission form
4. Implement review moderation (admin)
5. Calculate and display average rating
6. Add helpful/not helpful voting on reviews
7. Implement review responses from coaches

**Testing:**
- Test review submission
- Test review display
- Test rating calculation

**Acceptance Criteria:**
- [ ] Clients can review coaches
- [ ] Reviews are displayed on profiles
- [ ] Average ratings are calculated correctly
- [ ] Inappropriate reviews can be moderated

---

#### Task 4.1.2: Implement Referral System

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `supabase/migrations/YYYYMMDD_add_referral_system.sql` (create)
- `src/app/api/referrals/route.ts` (create)
- `src/components/settings/referral-program.tsx` (create)

**Implementation Steps:**
1. Create referral system tables:
   - referrals (referrer_id, referee_id, code, status)
   - referral_rewards (user_id, reward_type, amount, credited)
2. Generate unique referral codes
3. Track referral signups
4. Implement reward system (credits, discounts)
5. Create referral dashboard
6. Add referral sharing tools (email, social media)
7. Track referral conversions

**Testing:**
- Test referral code generation
- Test referral tracking
- Test reward distribution

**Acceptance Criteria:**
- [ ] Users can generate referral codes
- [ ] Referrals are tracked accurately
- [ ] Rewards are distributed correctly
- [ ] Users can view referral statistics

---

### 4.2 Advanced Session Features

#### Task 4.2.1: Implement Video Conferencing Integration

**Status:** [ ] Not Started

**Prerequisites:** Video conferencing service account (Zoom, Daily.co, etc.)

**Files to Modify:**
- `.env.local` (add video service keys)
- `src/lib/services/video-service.ts` (create)
- `src/components/sessions/video-room.tsx` (create)

**Implementation Steps:**
1. Choose and integrate video service
2. Create video room on session booking
3. Add join button to session detail
4. Implement in-browser video calls
5. Add recording option (with consent)
6. Implement screen sharing
7. Add chat during call
8. Auto-generate meeting links

**Testing:**
- Test video room creation
- Test joining calls
- Test recording functionality

**Acceptance Criteria:**
- [ ] Video rooms are created automatically
- [ ] Users can join calls easily
- [ ] Video and audio quality is good
- [ ] Recordings are stored securely

---

#### Task 4.2.2: Implement Session Templates and Packages

**Status:** [ ] Not Started

**Prerequisites:** Task 2.1.3

**Files to Modify:**
- `supabase/migrations/YYYYMMDD_add_session_templates.sql` (create)
- `src/components/coach/session-templates.tsx` (create)

**Implementation Steps:**
1. Create session_templates table
2. Allow coaches to create templates:
   - Name, description
   - Duration, price
   - Default agenda/notes
   - Resources to share
3. Create session packages:
   - Bundle multiple sessions
   - Discounted pricing
   - Validity period
4. Allow booking from template/package
5. Track package usage
6. Implement package expiration

**Testing:**
- Test template creation
- Test booking from template
- Test package tracking

**Acceptance Criteria:**
- [ ] Coaches can create reusable templates
- [ ] Packages offer value to clients
- [ ] Booking from template is quick
- [ ] Package expiration is enforced

---

### 4.3 AI and Automation

#### Task 4.3.1: Implement AI-Powered Insights

**Status:** [ ] Not Started

**Prerequisites:** OpenAI API account or similar

**Files to Modify:**
- `.env.local` (add AI service keys)
- `src/lib/services/ai-service.ts` (create)
- `src/components/shared/ai-insights.tsx` (create)

**Implementation Steps:**
1. Integrate AI service (OpenAI, Anthropic)
2. Generate insights from:
   - Client reflections (themes, sentiment)
   - Session notes (progress, patterns)
   - Task completion (productivity patterns)
   - Progress data (areas of improvement)
3. Add AI-powered recommendations:
   - Resource recommendations
   - Goal suggestions
   - Scheduling optimization
4. Implement AI-generated session summaries
5. Add privacy controls (opt-in)

**Testing:**
- Test insight generation
- Test recommendation accuracy
- Test privacy controls

**Acceptance Criteria:**
- [ ] AI provides meaningful insights
- [ ] Recommendations are relevant
- [ ] Users can control AI usage
- [ ] Data privacy is maintained

---

#### Task 4.3.2: Implement Smart Notifications

**Status:** [ ] Not Started

**Prerequisites:** Task 2.6, Task 4.3.1

**Files to Modify:**
- `src/lib/services/notification-service.ts`
- `src/lib/services/ai-service.ts`

**Implementation Steps:**
1. Analyze user notification interaction patterns
2. Optimize notification timing based on user behavior
3. Implement notification grouping intelligence
4. Add notification priority scoring
5. Personalize notification content
6. Implement do-not-disturb auto-detection

**Testing:**
- Test notification timing optimization
- Test grouping logic
- Test priority scoring

**Acceptance Criteria:**
- [ ] Notifications are sent at optimal times
- [ ] Notification volume is managed intelligently
- [ ] High-priority items surface appropriately
- [ ] User engagement with notifications improves

---

### 4.4 Mobile Experience

#### Task 4.4.1: Implement Progressive Web App (PWA)

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `public/manifest.json` (create)
- `src/app/layout.tsx`
- `public/sw.js` (create)

**Implementation Steps:**
1. Create web app manifest
2. Add PWA meta tags
3. Implement service worker:
   - Cache static assets
   - Offline page
   - Background sync
4. Add install prompt
5. Implement offline functionality:
   - View cached content
   - Queue actions for sync
6. Add push notification support
7. Optimize for mobile viewport

**Testing:**
- Test PWA installation
- Test offline functionality
- Test background sync

**Acceptance Criteria:**
- [ ] App can be installed on mobile
- [ ] Basic functionality works offline
- [ ] Push notifications work on mobile
- [ ] Mobile experience is smooth

---

## Phase 5: Polish & Optimization

**Goal:** Optimize performance, improve user experience, and prepare for production.

**Estimated Duration:** 3-4 weeks

### 5.1 Performance Optimization

#### Task 5.1.1: Implement Caching Strategy

**Status:** [ ] Not Started

**Prerequisites:** Redis instance (Upstash or similar)

**Files to Modify:**
- `.env.local` (add Redis URL)
- `src/lib/services/cache-service.ts` (create)
- Various API routes

**Implementation Steps:**
1. Set up Redis connection
2. Implement cache service wrapper
3. Add caching to expensive queries:
   - Coach availability
   - Analytics data
   - Resource metadata
   - User profiles
4. Implement cache invalidation strategies
5. Add cache warming for common queries
6. Implement stale-while-revalidate pattern

**Testing:**
- Test cache hit/miss rates
- Test cache invalidation
- Test performance improvements

**Acceptance Criteria:**
- [ ] Frequently accessed data is cached
- [ ] Cache improves response times significantly
- [ ] Cache invalidation works correctly
- [ ] Stale data is not served

---

#### Task 5.1.2: Optimize Database Queries

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- Various database query files
- `supabase/migrations/YYYYMMDD_add_performance_indexes.sql` (create)

**Implementation Steps:**
1. Identify slow queries using database logs
2. Add missing indexes:
   - Foreign key columns
   - Commonly filtered columns
   - Sort columns
3. Optimize complex queries:
   - Reduce N+1 queries
   - Add query batching
   - Implement pagination everywhere
4. Add database query monitoring
5. Set up slow query alerts

**Testing:**
- Test query performance improvements
- Test index usage
- Benchmark before and after

**Acceptance Criteria:**
- [ ] All queries under 100ms
- [ ] N+1 queries are eliminated
- [ ] Indexes are used appropriately
- [ ] Slow queries are monitored

---

#### Task 5.1.3: Optimize Frontend Bundle

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `next.config.js`
- Various component files

**Implementation Steps:**
1. Analyze bundle size with analyzer
2. Implement code splitting:
   - Dynamic imports for heavy components
   - Route-based splitting
3. Optimize dependencies:
   - Replace heavy libraries
   - Use tree-shaking
4. Implement lazy loading:
   - Images with next/image
   - Components below fold
   - Heavy features
5. Optimize fonts loading
6. Remove unused code
7. Set bundle size budgets

**Testing:**
- Test bundle size reduction
- Test lazy loading behavior
- Test loading performance

**Acceptance Criteria:**
- [ ] Main bundle under 200KB
- [ ] First load JS under 500KB
- [ ] Lazy loading works smoothly
- [ ] Bundle size is monitored

---

### 5.2 User Experience Polish

#### Task 5.2.1: Implement Loading States

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/components/shared/skeleton.tsx` (create)
- Various page components

**Implementation Steps:**
1. Create skeleton components for common layouts
2. Add loading states to all async operations:
   - Page loads
   - Button actions
   - Form submissions
   - Data fetching
3. Implement optimistic updates
4. Add progress indicators for long operations
5. Add loading state animations
6. Implement suspense boundaries

**Testing:**
- Test loading states on slow connections
- Test skeleton layouts
- Test optimistic updates

**Acceptance Criteria:**
- [ ] All async operations show loading states
- [ ] Skeleton layouts match content structure
- [ ] Optimistic updates provide instant feedback
- [ ] No layout shifts during loading

---

#### Task 5.2.2: Implement Empty States

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `src/components/shared/empty-state.tsx` (create)
- Various list/collection components

**Implementation Steps:**
1. Create empty state component
2. Add empty states for:
   - Empty session list
   - No tasks
   - No resources
   - No messages
   - No clients
3. Include helpful CTAs in empty states
4. Add illustrations/icons
5. Provide onboarding tips in empty states

**Testing:**
- Test empty states appear correctly
- Test CTA actions work

**Acceptance Criteria:**
- [ ] All lists have empty states
- [ ] Empty states are helpful and actionable
- [ ] CTAs guide users to next steps
- [ ] Illustrations are friendly and on-brand

---

#### Task 5.2.3: Improve Accessibility

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- Various component files

**Implementation Steps:**
1. Audit accessibility with axe DevTools
2. Fix all WCAG AA violations:
   - Add ARIA labels
   - Fix color contrast
   - Add focus indicators
   - Fix heading hierarchy
3. Implement keyboard navigation:
   - Modal focus trap
   - Menu keyboard controls
   - Form keyboard navigation
4. Add screen reader announcements:
   - Dynamic content changes
   - Error messages
   - Success confirmations
5. Test with screen reader (NVDA/JAWS)
6. Add skip to content links

**Testing:**
- Test with automated tools (axe, Lighthouse)
- Test with keyboard only
- Test with screen reader

**Acceptance Criteria:**
- [ ] No WCAG AA violations
- [ ] All interactive elements are keyboard accessible
- [ ] Screen readers can navigate effectively
- [ ] Focus management works correctly

---

### 5.3 Security Hardening

#### Task 5.3.1: Implement Rate Limiting

**Status:** [ ] Not Started

**Prerequisites:** Redis (from Task 5.1.1)

**Files to Modify:**
- `src/middleware.ts`
- `src/lib/services/rate-limiter.ts` (create)

**Implementation Steps:**
1. Implement rate limiting middleware
2. Add rate limits to all public endpoints:
   - Auth endpoints (stricter)
   - API endpoints (by user/IP)
   - File uploads (by size and count)
3. Implement different limits for auth users vs anonymous
4. Add rate limit headers to responses
5. Create bypass for admin/testing
6. Add rate limit monitoring

**Testing:**
- Test rate limits are enforced
- Test different limit tiers
- Test bypass mechanism

**Acceptance Criteria:**
- [ ] All endpoints are rate limited
- [ ] Limits are appropriate for use case
- [ ] Rate limit errors are clear
- [ ] Monitoring tracks limit hits

---

#### Task 5.3.2: Implement Security Headers

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `next.config.js`
- `src/middleware.ts`

**Implementation Steps:**
1. Add Content Security Policy (CSP)
2. Add security headers:
   - Strict-Transport-Security (HSTS)
   - X-Frame-Options
   - X-Content-Type-Options
   - Referrer-Policy
   - Permissions-Policy
3. Configure CORS properly
4. Implement CSRF protection
5. Add Subresource Integrity (SRI) for CDN assets

**Testing:**
- Test headers with securityheaders.com
- Test CSP doesn't break functionality
- Test CORS for allowed origins

**Acceptance Criteria:**
- [ ] All security headers are present
- [ ] CSP is strict and functional
- [ ] CORS allows only intended origins
- [ ] Application gets A+ on security scanners

---

#### Task 5.3.3: Implement Security Audit Logging

**Status:** [ ] Not Started

**Prerequisites:** Existing audit logs

**Files to Modify:**
- `src/lib/services/audit-logger.ts` (create)
- Various sensitive operations

**Implementation Steps:**
1. Create comprehensive audit logger
2. Log all sensitive operations:
   - Authentication attempts (success/failure)
   - Password changes
   - MFA changes
   - Permission changes
   - Data exports
   - Payment operations
   - Admin actions
3. Include context in logs:
   - User ID
   - IP address
   - User agent
   - Timestamp
   - Action details
4. Implement log retention policy
5. Add suspicious activity detection
6. Create audit log review tools

**Testing:**
- Test logging for all operations
- Test log content
- Test suspicious activity detection

**Acceptance Criteria:**
- [ ] All sensitive operations are logged
- [ ] Logs include sufficient context
- [ ] Suspicious activity is flagged
- [ ] Logs are tamper-proof

---

### 5.4 Production Readiness

#### Task 5.4.1: Set Up CI/CD Pipeline

**Status:** [ ] Not Started

**Prerequisites:** GitHub Actions or similar

**Files to Modify:**
- `.github/workflows/ci.yml` (create)
- `.github/workflows/deploy.yml` (create)

**Implementation Steps:**
1. Create CI workflow:
   - Run linter
   - Run type check
   - Run all tests
   - Check bundle size
   - Security scan
2. Create CD workflow:
   - Build application
   - Run production tests
   - Deploy to staging
   - Run smoke tests
   - Deploy to production (manual approval)
3. Add deployment notifications
4. Implement rollback mechanism
5. Add environment-specific configs

**Testing:**
- Test CI pipeline on PR
- Test CD pipeline on merge
- Test rollback mechanism

**Acceptance Criteria:**
- [ ] CI runs on every PR
- [ ] CD deploys automatically to staging
- [ ] Production deploys require approval
- [ ] Rollback is quick and reliable

---

#### Task 5.4.2: Implement Monitoring and Alerting

**Status:** [ ] Not Started

**Prerequisites:** Monitoring service (Datadog, New Relic, etc.)

**Files to Modify:**
- `.env.local` (add monitoring keys)
- `src/lib/services/monitoring-service.ts` (create)

**Implementation Steps:**
1. Set up monitoring service
2. Add application monitoring:
   - Error rates
   - Response times
   - Database query times
   - API endpoint performance
3. Add infrastructure monitoring:
   - Server resources
   - Database health
   - Storage usage
4. Create dashboards for:
   - Application health
   - Business metrics
   - User activity
5. Set up alerts for:
   - Error rate spikes
   - Slow responses
   - Database issues
   - High resource usage
6. Configure on-call rotation

**Testing:**
- Test metrics are collected
- Test alerts trigger correctly
- Test alert routing

**Acceptance Criteria:**
- [ ] All key metrics are monitored
- [ ] Dashboards show system health
- [ ] Alerts notify appropriate people
- [ ] On-call rotation is configured

---

#### Task 5.4.3: Create Documentation

**Status:** [ ] Not Started

**Prerequisites:** None

**Files to Modify:**
- `docs/` directory (create structure)

**Implementation Steps:**
1. Create user documentation:
   - Getting started guide (client)
   - Getting started guide (coach)
   - Feature guides
   - FAQ
   - Troubleshooting
2. Create developer documentation:
   - Architecture overview
   - API documentation (OpenAPI/Swagger)
   - Database schema documentation
   - Deployment guide
   - Contributing guide
3. Create admin documentation:
   - Admin panel guide
   - Monitoring guide
   - Incident response procedures
   - Backup and recovery procedures
4. Add inline code documentation
5. Create video tutorials (optional)

**Testing:**
- Review documentation for accuracy
- Test procedures in documentation

**Acceptance Criteria:**
- [ ] All features are documented
- [ ] Developer docs enable onboarding
- [ ] Admin docs enable operations
- [ ] Documentation is up-to-date

---

#### Task 5.4.4: Implement Feature Flags

**Status:** [ ] Not Started

**Prerequisites:** Feature flag service (LaunchDarkly, etc.) or custom

**Files to Modify:**
- `src/lib/services/feature-flags.ts` (create)
- `.env.local`

**Implementation Steps:**
1. Choose feature flag solution
2. Create feature flag service wrapper
3. Implement feature flags for:
   - New features (gradual rollout)
   - Experimental features
   - A/B tests
   - Emergency kill switches
4. Add feature flag admin UI
5. Implement targeting rules (by user, role, etc.)
6. Add analytics for feature usage

**Testing:**
- Test feature flag toggling
- Test targeting rules
- Test emergency kill switches

**Acceptance Criteria:**
- [ ] Features can be toggled remotely
- [ ] Rollouts can be gradual
- [ ] Emergency switches work instantly
- [ ] Feature usage is tracked

---

## Development Guidelines

### Code Quality Standards

**TypeScript**
- Use strict type checking
- No `any` types without justification
- Define interfaces for all data structures
- Use utility types (Pick, Omit, etc.) appropriately

**React**
- Use functional components exclusively
- Implement proper error boundaries
- Use React Server Components where appropriate
- Minimize client-side JavaScript

**Testing**
- Maintain 80%+ code coverage
- Write tests before fixing bugs (TDD for bug fixes)
- Include integration tests for user flows
- Add E2E tests for critical paths

**Performance**
- Keep bundle size under budgets
- Implement code splitting
- Optimize images and assets
- Monitor Core Web Vitals

**Accessibility**
- Follow WCAG 2.1 AA standards
- Test with keyboard only
- Test with screen readers
- Maintain color contrast ratios

### Git Workflow

**Branch Naming**
- Feature: `feature/short-description`
- Bug: `fix/short-description`
- Hotfix: `hotfix/short-description`

**Commit Messages**
- Use conventional commits format
- Include ticket/issue number
- Keep subject line under 50 characters
- Add detailed description if needed

**Pull Requests**
- Link to relevant issue/task
- Include test results
- Add screenshots for UI changes
- Request reviews from appropriate team members

### Task Workflow

**Before Starting a Task**
1. Review prerequisites
2. Read related documentation
3. Check for dependencies
4. Set up local environment if needed

**During Implementation**
1. Create feature branch
2. Write tests first (TDD)
3. Implement functionality
4. Verify tests pass
5. Test manually
6. Check acceptance criteria

**After Completing a Task**
1. Run full test suite
2. Update documentation
3. Create pull request
4. Address review feedback
5. Merge when approved
6. Update task status
7. Deploy to staging
8. Verify in staging

### Definition of Done

A task is "done" when:
- [ ] Code is written and tested
- [ ] Unit tests pass with adequate coverage
- [ ] Integration tests pass (if applicable)
- [ ] E2E tests pass (if applicable)
- [ ] Code review is complete and approved
- [ ] Documentation is updated
- [ ] Acceptance criteria are met
- [ ] Changes are deployed to staging
- [ ] Manual QA passes in staging
- [ ] No new accessibility violations
- [ ] Performance is acceptable

---

## Progress Tracking

### Phase 1 Progress: 0/7 tasks complete (0%)

- [ ] Task 1.1.1: Integrate Sentry Error Tracking
- [ ] Task 1.1.2: Implement Error Boundaries
- [ ] Task 1.2.1: Fix Supabase Realtime Mock Setup
- [ ] Task 1.2.2: Fix FileList Polyfill for Tests
- [ ] Task 1.3.1: Implement Database Health Monitoring
- [ ] Task 1.3.2: Implement Folder Schema for Files
- [ ] Task 1.4.1-1.4.7: Core TODOs (7 tasks)

### Phase 2 Progress: 0/24 tasks complete (0%)

- Session Booking: 0/4 complete
- Messaging: 0/4 complete
- Payments: 0/4 complete
- Progress Tracking: 0/3 complete
- Reflections: 0/3 complete
- Notifications: 0/3 complete
- Coach Notes: 0/3 complete

### Phase 3 Progress: 0/12 tasks complete (0%)

### Phase 4 Progress: 0/8 tasks complete (0%)

### Phase 5 Progress: 0/12 tasks complete (0%)

### Overall Progress: 0/63 major tasks complete (0%)

---

**Document Maintained By:** Development Team
**Last Updated:** 2025-11-05
**Next Review:** Weekly during active development

---

## Quick Reference

### Current Sprint Focus
- Phase 1: Foundation & Critical Infrastructure
- Priority: Fix testing infrastructure and error handling

### Blocked Tasks
- None currently (all prerequisites available)

### Next Up
1. Task 1.1.1: Integrate Sentry Error Tracking
2. Task 1.2.1: Fix Supabase Realtime Mock Setup
3. Task 1.3.2: Implement Folder Schema for Files

### Recently Completed
- None yet (starting Phase 1)

