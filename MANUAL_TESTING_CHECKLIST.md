# Manual Testing Checklist: Tasks Module

## Overview

This comprehensive checklist ensures the Tasks Module functions correctly across all user workflows, edge cases, and error scenarios.

**Test Environment:** Staging
**Testers:** QA Team, Product Team, Select Beta Users
**Completion Required Before:** Production Deployment

## Pre-Test Setup

### Test Accounts Required

- [ ] **Coach Account 1** (Primary test coach)
  - Email: coach1@test.loom-app.com
  - Has 3+ active clients

- [ ] **Coach Account 2** (Secondary test coach)
  - Email: coach2@test.loom-app.com
  - Has 1+ active client

- [ ] **Client Account 1** (Primary test client)
  - Email: client1@test.loom-app.com
  - Assigned to Coach 1

- [ ] **Client Account 2** (Secondary test client)
  - Email: client2@test.loom-app.com
  - Assigned to Coach 1

- [ ] **Client Account 3** (Cross-coach test)
  - Email: client3@test.loom-app.com
  - Assigned to Coach 2

### Test Data Setup

- [ ] Database migration successfully applied
- [ ] All test accounts created and verified
- [ ] Coach-client relationships established
- [ ] Browser cache cleared before testing

---

## COACH WORKFLOW TESTS

### Category Management

#### CM-1: Create Task Category
- [ ] Login as Coach 1
- [ ] Navigate to Tasks page
- [ ] Click "Manage Categories" button
- [ ] Click "New Category"
- [ ] Enter category name: "Mindfulness Practices"
- [ ] Select color: Blue (#3b82f6)
- [ ] Click "Create"
- [ ] **Expected:** Category appears in category list
- [ ] **Expected:** Success toast message displayed
- [ ] **Expected:** Category persists after page refresh

#### CM-2: Create Duplicate Category (Error Case)
- [ ] Attempt to create another category named "Mindfulness Practices"
- [ ] **Expected:** Validation error displayed
- [ ] **Expected:** Error message: "Category already exists"
- [ ] **Expected:** Dialog remains open to allow correction

#### CM-3: Edit Task Category
- [ ] Click edit icon on "Mindfulness Practices" category
- [ ] Change name to "Mindfulness & Meditation"
- [ ] Change color to Green (#10b981)
- [ ] Click "Save"
- [ ] **Expected:** Category updates in list
- [ ] **Expected:** Color changes reflected
- [ ] **Expected:** Tasks in this category show new name and color

#### CM-4: Delete Unused Category
- [ ] Create a new category: "Test Category"
- [ ] Immediately delete it (no tasks assigned)
- [ ] Confirm deletion
- [ ] **Expected:** Category removed from list
- [ ] **Expected:** Success message displayed

#### CM-5: Delete Category with Tasks
- [ ] Create a task assigned to "Mindfulness & Meditation" category
- [ ] Attempt to delete "Mindfulness & Meditation" category
- [ ] Confirm deletion
- [ ] **Expected:** Category deleted
- [ ] **Expected:** Tasks previously in this category now show "No Category"
- [ ] **Expected:** Tasks are NOT deleted (only category_id set to NULL)

### Task Creation

#### TC-1: Create Basic Task (Required Fields Only)
- [ ] Login as Coach 1
- [ ] Navigate to Tasks page
- [ ] Click "Assign action item" button
- [ ] Select client: Client 1
- [ ] Enter title: "Practice somatic grounding"
- [ ] Click "Assign action item"
- [ ] **Expected:** Dialog closes
- [ ] **Expected:** Success toast: "Action item assigned"
- [ ] **Expected:** Task appears in task list
- [ ] **Expected:** Task shows Client 1's name
- [ ] **Expected:** Status is "Pending"
- [ ] **Expected:** Priority is "Medium" (default)

#### TC-2: Create Task with All Fields
- [ ] Click "Assign action item"
- [ ] Select client: Client 2
- [ ] Enter title: "Complete body scan meditation"
- [ ] Enter description: "Use the guided meditation video I shared. Aim for 10 minutes daily."
- [ ] Select priority: "High"
- [ ] Select category: "Mindfulness & Meditation"
- [ ] Set due date: 7 days from today
- [ ] Toggle "Visible to coach": ON
- [ ] Click "Assign action item"
- [ ] **Expected:** Task created successfully
- [ ] **Expected:** All fields saved correctly
- [ ] **Expected:** Due date displays correctly
- [ ] **Expected:** Category badge shows correct color

#### TC-3: Create Task with Empty Title (Validation Error)
- [ ] Click "Assign action item"
- [ ] Select client: Client 1
- [ ] Leave title empty
- [ ] Fill other fields
- [ ] Click "Assign action item"
- [ ] **Expected:** Validation error: "Title is required"
- [ ] **Expected:** Dialog remains open
- [ ] **Expected:** Task not created

#### TC-4: Create Task Without Selecting Client (Validation Error)
- [ ] Click "Assign action item"
- [ ] Enter title: "Test task"
- [ ] Do NOT select a client
- [ ] Click "Assign action item"
- [ ] **Expected:** Validation error: "Select a client to assign this task"
- [ ] **Expected:** Dialog remains open

#### TC-5: Create Task with Past Due Date (Validation Error)
- [ ] Click "Assign action item"
- [ ] Select client: Client 1
- [ ] Enter title: "Test task"
- [ ] Set due date: Yesterday's date
- [ ] **Expected:** Browser prevents selecting past date (HTML5 date input)
- [ ] **Alternative:** If past date allowed, backend validation error

#### TC-6: Save Task as Template
- [ ] Create a task with title: "Weekly reflection journal"
- [ ] Add description: "Reflect on your progress this week"
- [ ] Check "Save as template" checkbox
- [ ] Assign to Client 1
- [ ] **Expected:** Task created
- [ ] **Expected:** Task appears in "Templates" section
- [ ] **Expected:** Can reuse template for other clients

### Task Listing and Filtering

#### TL-1: View All Tasks
- [ ] Navigate to Tasks page
- [ ] **Expected:** See all tasks assigned by current coach
- [ ] **Expected:** Tasks sorted by due date (ascending)
- [ ] **Expected:** Pagination works if >20 tasks

#### TL-2: Filter by Client
- [ ] Use client filter dropdown
- [ ] Select "Client 1"
- [ ] **Expected:** Only tasks assigned to Client 1 displayed
- [ ] **Expected:** Other clients' tasks hidden

#### TL-3: Filter by Status
- [ ] Use status filter
- [ ] Select "Pending"
- [ ] **Expected:** Only pending tasks shown
- [ ] Select "In Progress"
- [ ] **Expected:** Only in-progress tasks shown
- [ ] Select "Completed"
- [ ] **Expected:** Only completed tasks shown

#### TL-4: Filter by Category
- [ ] Use category filter
- [ ] Select "Mindfulness & Meditation"
- [ ] **Expected:** Only tasks in that category shown

#### TL-5: Filter by Priority
- [ ] Use priority filter
- [ ] Select "High"
- [ ] **Expected:** Only high priority tasks shown

#### TL-6: Search Tasks
- [ ] Enter search term: "somatic"
- [ ] **Expected:** Tasks with "somatic" in title shown
- [ ] **Expected:** Other tasks hidden
- [ ] **Expected:** Search is case-insensitive

#### TL-7: Clear Filters
- [ ] Apply multiple filters (client, status, priority)
- [ ] Click "Clear filters" button
- [ ] **Expected:** All filters reset
- [ ] **Expected:** Full task list displayed

#### TL-8: Sort by Due Date
- [ ] Click "Sort by Due Date" (ascending)
- [ ] **Expected:** Tasks with earliest due dates first
- [ ] Click again (descending)
- [ ] **Expected:** Tasks with latest due dates first

#### TL-9: Sort by Created Date
- [ ] Click "Sort by Created Date" (ascending)
- [ ] **Expected:** Oldest tasks first
- [ ] Click again (descending)
- [ ] **Expected:** Newest tasks first

### Task Editing

#### TE-1: Edit Task Title
- [ ] Click on a task to open details
- [ ] Click "Edit" button
- [ ] Change title to: "Updated practice title"
- [ ] Click "Save"
- [ ] **Expected:** Title updates in list
- [ ] **Expected:** Success message displayed

#### TE-2: Edit Task Description
- [ ] Edit a task
- [ ] Change description
- [ ] Save
- [ ] **Expected:** Description updated
- [ ] **Expected:** Changes reflected in task details view

#### TE-3: Change Task Category
- [ ] Edit a task
- [ ] Change category from "Mindfulness" to another category
- [ ] Save
- [ ] **Expected:** Category badge updates
- [ ] **Expected:** Task appears in new category filter

#### TE-4: Change Task Priority
- [ ] Edit a task
- [ ] Change priority from "Medium" to "High"
- [ ] Save
- [ ] **Expected:** Priority indicator updates
- [ ] **Expected:** Task appears in High priority filter

#### TE-5: Update Due Date
- [ ] Edit a task
- [ ] Change due date to 14 days from today
- [ ] Save
- [ ] **Expected:** Due date updates
- [ ] **Expected:** Task re-sorts in list if sorted by due date

#### TE-6: Remove Due Date
- [ ] Edit a task with a due date
- [ ] Clear the due date field
- [ ] Save
- [ ] **Expected:** Due date removed
- [ ] **Expected:** Task shows "No due date" in list

#### TE-7: Toggle Coach Visibility
- [ ] Edit a task
- [ ] Toggle "Visible to coach" to OFF
- [ ] Save
- [ ] **Expected:** Setting persists
- [ ] **Expected:** Task still visible to coach (they created it)
- [ ] **Note:** Visibility affects client's view, not coach's

### Task Assignment Management

#### TA-1: View Client Progress on Task
- [ ] Click on a task assigned to Client 1
- [ ] Navigate to "Progress" tab
- [ ] **Expected:** See list of progress updates from client
- [ ] **Expected:** See progress percentage
- [ ] **Expected:** See client's notes
- [ ] **Expected:** See timestamps

#### TA-2: Assign Same Task to Multiple Clients
- [ ] Create a new task: "Daily gratitude practice"
- [ ] Assign to Client 1
- [ ] Create another instance of same task
- [ ] Assign to Client 2
- [ ] **Expected:** Both clients receive the task
- [ ] **Expected:** Progress tracked separately for each

#### TA-3: Reassign Task to Different Client
- [ ] Edit a task
- [ ] Change client from Client 1 to Client 2
- [ ] Save
- [ ] **Expected:** Task moves to Client 2's list
- [ ] **Expected:** Client 1 no longer sees it
- [ ] **Expected:** Progress history preserved or reset (based on business rules)

### Task Deletion

#### TD-1: Delete Task with No Progress
- [ ] Create a new task
- [ ] Immediately delete it
- [ ] Confirm deletion
- [ ] **Expected:** Task removed from list
- [ ] **Expected:** Success message displayed

#### TD-2: Delete Task with Progress
- [ ] Find a task where client has added progress
- [ ] Delete the task
- [ ] Confirm deletion
- [ ] **Expected:** Confirmation dialog warns about losing progress
- [ ] **Expected:** Task and all progress updates deleted
- [ ] **Expected:** Client no longer sees task

#### TD-3: Cancel Task Deletion
- [ ] Click delete on a task
- [ ] Click "Cancel" in confirmation dialog
- [ ] **Expected:** Task NOT deleted
- [ ] **Expected:** Task remains in list

### Templates

#### TT-1: Create Task from Template
- [ ] Navigate to "Templates" tab
- [ ] Click on a saved template
- [ ] Click "Use Template"
- [ ] Select client
- [ ] **Expected:** New task dialog pre-filled with template data
- [ ] Modify if needed
- [ ] Assign
- [ ] **Expected:** New task instance created

#### TT-2: Edit Template
- [ ] Edit a template task
- [ ] Change title or description
- [ ] Save
- [ ] **Expected:** Template updated
- [ ] **Expected:** Existing tasks from this template unchanged
- [ ] **Expected:** New tasks use updated template

#### TT-3: Delete Template
- [ ] Delete a template task
- [ ] Confirm
- [ ] **Expected:** Template removed
- [ ] **Expected:** Existing tasks from this template unchanged

---

## CLIENT WORKFLOW TESTS

### Viewing Tasks

#### CV-1: View My Tasks List
- [ ] Login as Client 1
- [ ] Navigate to "My Tasks" page
- [ ] **Expected:** See all tasks assigned to Client 1
- [ ] **Expected:** Tasks from Coach 1 visible
- [ ] **Expected:** Tasks from other coaches/clients NOT visible

#### CV-2: View Task Details
- [ ] Click on a task
- [ ] **Expected:** See full task title
- [ ] **Expected:** See description
- [ ] **Expected:** See due date
- [ ] **Expected:** See priority
- [ ] **Expected:** See progress history

#### CV-3: Filter My Tasks by Status
- [ ] Use status filter
- [ ] Select "Pending"
- [ ] **Expected:** Only pending tasks shown
- [ ] Repeat for "In Progress" and "Completed"

#### CV-4: Empty State - No Tasks
- [ ] Login as Client 3 (no tasks assigned)
- [ ] Navigate to My Tasks
- [ ] **Expected:** Empty state message displayed
- [ ] **Expected:** Message: "No action items assigned yet"
- [ ] **Expected:** No errors

### Adding Progress

#### CP-1: Add First Progress Update
- [ ] Login as Client 1
- [ ] Click on a pending task
- [ ] Click "Add Progress"
- [ ] Set progress: 25%
- [ ] Add notes: "Started practicing, feeling good"
- [ ] Click "Submit"
- [ ] **Expected:** Progress update added
- [ ] **Expected:** Task status changes to "In Progress"
- [ ] **Expected:** Progress shows in history
- [ ] **Expected:** Coach can see update

#### CP-2: Add Progress with 0%
- [ ] Add progress update
- [ ] Set progress: 0%
- [ ] Add notes: "Haven't started yet"
- [ ] Submit
- [ ] **Expected:** Update accepted
- [ ] **Expected:** Task remains "Pending"

#### CP-3: Add Progress with 100%
- [ ] Add progress update
- [ ] Set progress: 100%
- [ ] Add notes: "Completed all sessions"
- [ ] Submit
- [ ] **Expected:** Update accepted
- [ ] **Expected:** Task status auto-changes to "Completed"
- [ ] **Expected:** Completed timestamp recorded

#### CP-4: Add Progress > 100% (Validation Error)
- [ ] Attempt to set progress: 150%
- [ ] **Expected:** Validation error
- [ ] **Expected:** Error message: "Progress must be between 0 and 100"
- [ ] **Expected:** Update not saved

#### CP-5: Add Progress with Negative Value (Validation Error)
- [ ] Attempt to set progress: -10%
- [ ] **Expected:** Validation error
- [ ] **Expected:** Update not saved

#### CP-6: Add Progress Without Notes
- [ ] Add progress update
- [ ] Set progress: 50%
- [ ] Leave notes empty
- [ ] Submit
- [ ] **Expected:** Update accepted (notes optional)
- [ ] **Expected:** Progress saved

#### CP-7: Add Multiple Progress Updates
- [ ] Add progress: 25% with notes
- [ ] Wait a few seconds
- [ ] Add progress: 50% with different notes
- [ ] Wait a few seconds
- [ ] Add progress: 75% with notes
- [ ] **Expected:** All updates appear in history
- [ ] **Expected:** Sorted by newest first
- [ ] **Expected:** Progress increases over time

#### CP-8: Edit Own Progress Update
- [ ] Find a progress update you created
- [ ] Click "Edit"
- [ ] Change percentage and notes
- [ ] Save
- [ ] **Expected:** Update modified
- [ ] **Expected:** Changes visible to coach

#### CP-9: Delete Own Progress Update
- [ ] Find a progress update you created
- [ ] Click "Delete"
- [ ] Confirm
- [ ] **Expected:** Update removed
- [ ] **Expected:** If it was the highest progress, task status may revert

### Attachments

#### CA-1: Upload Attachment to Progress
- [ ] Add progress update
- [ ] Click "Attach File"
- [ ] Select a PDF file (< 5MB)
- [ ] **Expected:** File uploads successfully
- [ ] **Expected:** File name displayed
- [ ] Submit progress
- [ ] **Expected:** Attachment saved with progress
- [ ] **Expected:** Coach can download attachment

#### CA-2: Upload Image Attachment
- [ ] Add progress update
- [ ] Attach a JPG image
- [ ] Submit
- [ ] **Expected:** Image uploads and displays as thumbnail
- [ ] **Expected:** Clicking shows full size

#### CA-3: Upload Multiple Attachments
- [ ] Add progress update
- [ ] Attach 3 files (PDF, JPG, PNG)
- [ ] Submit
- [ ] **Expected:** All files uploaded
- [ ] **Expected:** All files listed in progress update

#### CA-4: Upload Large File (Error Case)
- [ ] Attempt to upload file > 10MB
- [ ] **Expected:** Validation error
- [ ] **Expected:** Error message: "File too large. Maximum size is 10MB"
- [ ] **Expected:** Upload rejected

#### CA-5: Upload Invalid File Type (Error Case)
- [ ] Attempt to upload .exe or .zip file
- [ ] **Expected:** Validation error
- [ ] **Expected:** Error message: "Invalid file type"
- [ ] **Expected:** Upload rejected

#### CA-6: Download Attachment
- [ ] View a progress update with attachment
- [ ] Click "Download" on attachment
- [ ] **Expected:** File downloads to device
- [ ] **Expected:** File opens correctly

#### CA-7: Delete Attachment
- [ ] Edit a progress update with attachment
- [ ] Click "Remove" on attachment
- [ ] Save update
- [ ] **Expected:** Attachment deleted
- [ ] **Expected:** File no longer in storage

### Marking Complete

#### CC-1: Manually Mark Task Complete
- [ ] Click on a task
- [ ] Click "Mark as Complete" button
- [ ] **Expected:** Task status changes to "Completed"
- [ ] **Expected:** Completion timestamp recorded
- [ ] **Expected:** Task moves to "Completed" filter
- [ ] **Expected:** Coach notified

#### CC-2: Un-mark Task as Complete
- [ ] Click on a completed task
- [ ] Click "Reopen Task"
- [ ] **Expected:** Task status changes to "In Progress"
- [ ] **Expected:** Completed timestamp cleared
- [ ] **Expected:** Can add more progress

---

## SECURITY & ACCESS CONTROL TESTS

### Authorization

#### AC-1: Client Cannot View Other Client's Tasks
- [ ] Login as Client 1
- [ ] Note the URL of one of your tasks
- [ ] Logout
- [ ] Login as Client 2
- [ ] Manually navigate to Client 1's task URL
- [ ] **Expected:** 403 Forbidden error
- [ ] **Expected:** Error message: "Access denied"

#### AC-2: Client Cannot Edit Other Client's Tasks
- [ ] As Client 2, attempt to edit Client 1's task via API
- [ ] **Expected:** 403 Forbidden error
- [ ] **Expected:** RLS policy blocks update

#### AC-3: Coach Cannot View Other Coach's Tasks
- [ ] Login as Coach 1
- [ ] Note a task ID
- [ ] Logout
- [ ] Login as Coach 2
- [ ] Manually navigate to Coach 1's task URL
- [ ] **Expected:** 403 Forbidden or 404 Not Found
- [ ] **Expected:** Task not displayed

#### AC-4: Unauthenticated User Cannot Access Tasks
- [ ] Logout completely
- [ ] Navigate to /coach/tasks
- [ ] **Expected:** Redirect to login page
- [ ] **Expected:** After login, redirect back to tasks

#### AC-5: Client Cannot Create Tasks
- [ ] Login as Client 1
- [ ] Attempt to access task creation endpoint via API
- [ ] **Expected:** 403 Forbidden error
- [ ] **Expected:** Error: "Access denied. Required role: coach"

#### AC-6: Client Cannot Delete Tasks
- [ ] As Client 1, attempt to delete a task via API
- [ ] **Expected:** 403 Forbidden error
- [ ] **Expected:** Task remains in database

### RLS Policy Verification

#### RLS-1: Coach Can Only See Own Tasks
- [ ] Login as Coach 1
- [ ] Query tasks via API
- [ ] **Expected:** Only tasks created by Coach 1 returned
- [ ] **Expected:** Coach 2's tasks not in response

#### RLS-2: Client Can Only See Own Assigned Tasks
- [ ] Login as Client 1
- [ ] Query tasks via API
- [ ] **Expected:** Only tasks assigned to Client 1 returned
- [ ] **Expected:** Other clients' tasks not in response

#### RLS-3: Progress Updates Respect RLS
- [ ] Client 1 adds progress to their task
- [ ] Client 2 attempts to view Client 1's progress via API
- [ ] **Expected:** 403 Forbidden or empty response
- [ ] Coach 1 views Client 1's progress
- [ ] **Expected:** Coach can see progress (they own the task)

---

## EDGE CASES & ERROR HANDLING

### Network Errors

#### NE-1: Create Task with Network Failure
- [ ] Login as Coach 1
- [ ] Open browser DevTools
- [ ] Set network to "Offline" mode
- [ ] Attempt to create a task
- [ ] **Expected:** Error message: "Network error. Please check your connection."
- [ ] **Expected:** Option to retry
- [ ] Set network back to "Online"
- [ ] Click "Retry"
- [ ] **Expected:** Task created successfully

#### NE-2: Load Tasks with Network Failure
- [ ] Set network to "Offline"
- [ ] Navigate to Tasks page
- [ ] **Expected:** Error message displayed
- [ ] **Expected:** Retry button available
- [ ] Set network back to "Online"
- [ ] Click "Retry"
- [ ] **Expected:** Tasks load successfully

#### NE-3: Add Progress with Network Failure
- [ ] Login as Client 1
- [ ] Set network to "Offline"
- [ ] Attempt to add progress
- [ ] **Expected:** Error message displayed
- [ ] **Expected:** Form data preserved (not lost)
- [ ] Set network back to "Online"
- [ ] Submit again
- [ ] **Expected:** Progress saved successfully

### Database Errors

#### DB-1: Create Task with Invalid Client ID
- [ ] Via API, send create task request with non-existent client_id
- [ ] **Expected:** 400 Bad Request error
- [ ] **Expected:** Error: "Invalid client ID"

#### DB-2: Update Task That Was Deleted
- [ ] Coach 1 opens edit dialog for a task
- [ ] Coach 1 deletes the same task in another tab
- [ ] Coach 1 submits edit form
- [ ] **Expected:** 404 Not Found error
- [ ] **Expected:** Error message: "Task not found"

### Concurrent Modifications

#### CM-1: Two Coaches Edit Same Task (Impossible Scenario)
- [ ] This should never happen (RLS prevents it)
- [ ] But if it did via API bypass, last write wins
- [ ] **Expected:** updated_at timestamp resolves conflicts

#### CM-2: Client and Coach Edit Task Simultaneously
- [ ] Coach edits task metadata
- [ ] Client adds progress at same time
- [ ] **Expected:** Both operations succeed (different tables)
- [ ] **Expected:** No data loss

### Validation Edge Cases

#### VE-1: Create Task with Very Long Title (200 characters)
- [ ] Create task with 200-character title
- [ ] **Expected:** Accepted (at max length)
- [ ] Create task with 201-character title
- [ ] **Expected:** Validation error: "Title must be 200 characters or fewer"

#### VE-2: Create Task with Very Long Description (2000 characters)
- [ ] Create task with 2000-character description
- [ ] **Expected:** Accepted
- [ ] Create task with 2001-character description
- [ ] **Expected:** Validation error: "Description must be 2000 characters or fewer"

#### VE-3: XSS Attempt in Title
- [ ] Create task with title: `<script>alert('XSS')</script>`
- [ ] View task
- [ ] **Expected:** Script NOT executed
- [ ] **Expected:** Text displayed as plain text

#### VE-4: SQL Injection Attempt in Search
- [ ] Search for: `'; DROP TABLE tasks; --`
- [ ] **Expected:** No database error
- [ ] **Expected:** Searches for literal string
- [ ] **Expected:** Parameterized queries prevent injection

#### VE-5: Unicode Characters in Task Title
- [ ] Create task with title: "練習 Practice 🧘‍♀️"
- [ ] **Expected:** Accepted
- [ ] **Expected:** Displays correctly
- [ ] **Expected:** Searchable

### Pagination

#### PG-1: View Large Task List (>20 tasks)
- [ ] Create 25+ tasks
- [ ] Navigate to Tasks page
- [ ] **Expected:** First 20 tasks displayed
- [ ] **Expected:** Pagination controls visible
- [ ] Click "Next Page"
- [ ] **Expected:** Tasks 21-25 displayed

#### PG-2: Navigate to Non-Existent Page
- [ ] Via URL, navigate to page=999 (beyond total)
- [ ] **Expected:** Empty list or redirect to last valid page
- [ ] **Expected:** No error

### Data Integrity

#### DI-1: Delete Coach Account
- [ ] Delete Coach 2 account (via admin)
- [ ] **Expected:** All Coach 2's tasks CASCADE deleted
- [ ] **Expected:** Client 3 no longer sees tasks from Coach 2

#### DI-2: Delete Client Account
- [ ] Delete Client 2 account
- [ ] **Expected:** All task instances for Client 2 CASCADE deleted
- [ ] **Expected:** Coach 1 no longer sees Client 2's tasks
- [ ] **Expected:** Task templates remain (if any)

#### DI-3: Delete Category with Tasks
- [ ] Delete category that has tasks
- [ ] **Expected:** Category deleted
- [ ] **Expected:** Tasks' category_id set to NULL (ON DELETE SET NULL)
- [ ] **Expected:** Tasks remain, just uncategorized

---

## PERFORMANCE TESTS

### PT-1: Load Time for Task List
- [ ] Navigate to Tasks page with 50+ tasks
- [ ] **Expected:** Page loads in < 2 seconds
- [ ] **Expected:** No UI freezing

### PT-2: Filter Performance
- [ ] Apply multiple filters to large task list
- [ ] **Expected:** Filters apply in < 500ms
- [ ] **Expected:** UI remains responsive

### PT-3: Search Performance
- [ ] Search in list of 100+ tasks
- [ ] **Expected:** Results appear in < 1 second
- [ ] **Expected:** Debounced search (not searching on every keystroke)

---

## ACCESSIBILITY TESTS

### A11Y-1: Keyboard Navigation
- [ ] Navigate entire task creation flow using only keyboard (Tab, Enter, Esc)
- [ ] **Expected:** All interactive elements reachable
- [ ] **Expected:** Focus indicators visible
- [ ] **Expected:** Can create task without mouse

### A11Y-2: Screen Reader Compatibility
- [ ] Use screen reader (VoiceOver, NVDA, JAWS)
- [ ] Navigate task list
- [ ] **Expected:** All content announced correctly
- [ ] **Expected:** Form labels read properly
- [ ] **Expected:** Error messages announced

### A11Y-3: Color Contrast
- [ ] Check all UI elements meet WCAG AA standards
- [ ] **Expected:** Text contrast ratio ≥ 4.5:1
- [ ] **Expected:** Interactive elements clearly visible

### A11Y-4: Focus Management
- [ ] Open task creation dialog
- [ ] **Expected:** Focus moves to first input
- [ ] Press Esc
- [ ] **Expected:** Dialog closes, focus returns to trigger button

---

## MOBILE RESPONSIVENESS

### MR-1: Task List on Mobile
- [ ] View task list on iPhone/Android
- [ ] **Expected:** Layout adapts to small screen
- [ ] **Expected:** All functions accessible
- [ ] **Expected:** No horizontal scrolling

### MR-2: Create Task on Mobile
- [ ] Create task on mobile device
- [ ] **Expected:** Dialog fits screen
- [ ] **Expected:** All form fields accessible
- [ ] **Expected:** Date picker works on mobile

### MR-3: Add Progress on Mobile
- [ ] Client adds progress on mobile
- [ ] **Expected:** Progress slider works with touch
- [ ] **Expected:** File upload works on mobile

---

## REAL-TIME UPDATES (IF IMPLEMENTED)

### RT-1: Coach Sees Client Progress in Real-Time
- [ ] Coach and Client both logged in
- [ ] Client adds progress
- [ ] **Expected:** Coach's view updates without refresh
- [ ] **Expected:** New progress appears in list

### RT-2: Client Sees Task Assignment in Real-Time
- [ ] Client and Coach both logged in
- [ ] Coach assigns new task to client
- [ ] **Expected:** Client's task list updates without refresh

---

## NOTIFICATIONS (IF IMPLEMENTED)

### N-1: Client Receives Task Assignment Notification
- [ ] Coach assigns task to client
- [ ] **Expected:** Client receives notification (email/in-app)
- [ ] **Expected:** Notification contains task title and due date

### N-2: Coach Receives Progress Notification
- [ ] Client adds progress to task
- [ ] **Expected:** Coach receives notification
- [ ] **Expected:** Notification contains client name and progress percentage

---

## SIGN-OFF

### Tester Information
- **Tester Name:** _______________________
- **Date Tested:** _______________________
- **Environment:** Staging / Production

### Test Results Summary
- **Total Tests:** ________
- **Passed:** ________
- **Failed:** ________
- **Blockers:** ________

### Critical Issues Found
1. _______________________________________
2. _______________________________________
3. _______________________________________

### Non-Critical Issues Found
1. _______________________________________
2. _______________________________________
3. _______________________________________

### Recommendation
- [ ] **APPROVED** for production deployment
- [ ] **APPROVED WITH MINOR FIXES** (list fixes required)
- [ ] **NOT APPROVED** (major issues must be resolved)

### Approver Signature
**Name:** _______________________
**Role:** QA Lead / Product Manager
**Date:** _______________________
**Signature:** _______________________

---

## Notes

- This checklist should be completed in a staging environment that mirrors production
- All blockers must be resolved before production deployment
- Document any deviations from expected behavior
- Include screenshots/videos for any bugs found
- Re-test any failed scenarios after fixes are applied
