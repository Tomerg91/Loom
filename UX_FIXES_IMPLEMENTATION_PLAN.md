# UX Fixes Implementation Plan
**Based on:** UX Audit Report (95+ issues identified)
**Target Branch:** `claude/audit-user-journeys-01XzyUqzG3vuiLKZsFE8Pnfc`
**Estimated Total Effort:** 12-15 developer days
**Last Updated:** 2025-11-20

---

## Table of Contents
1. [Sprint 1: Critical Blockers (2-3 days)](#sprint-1-critical-blockers)
2. [Sprint 2: High Priority (3-4 days)](#sprint-2-high-priority)
3. [Month 1: Medium Priority (4-5 days)](#month-1-medium-priority)
4. [Backlog: Low Priority (3 days)](#backlog-low-priority)
5. [Testing Strategy](#testing-strategy)
6. [Success Metrics](#success-metrics)

---

## Sprint 1: Critical Blockers (2-3 days)

**Goal:** Fix navigation dead ends and critical UX blockers that prevent users from completing key tasks.

### 🔴 **Task 1.1: Fix Profile Navigation Link**
- **Priority:** CRITICAL
- **Effort:** 5 minutes
- **File:** `src/components/navigation/nav-menu.tsx:304`
- **Issue:** Link points to non-existent `/profile` page
- **Impact:** Users get 404 when clicking "Profile"

**Implementation:**
```tsx
// BEFORE (Line 304)
<Link href="/profile">Profile</Link>

// AFTER
<Link href="/settings">Profile</Link>
```

**Testing:**
- [ ] Verify link navigates to settings page
- [ ] Test in both English and Hebrew locales
- [ ] Verify settings page loads correctly

---

### 🔴 **Task 1.2: Fix MFA Setup Redirect**
- **Priority:** CRITICAL
- **Effort:** 1 hour
- **Files:**
  - `src/components/auth/mfa-setup-form.tsx:214`
  - `src/app/[locale]/(authenticated)/auth/mfa-setup/page.tsx:96`
- **Issue:** Redirects to non-existent `/settings/security` after MFA completion
- **Impact:** Users completing security setup get 404 error

**Implementation Option A (Recommended):**
Create the security settings page:
```bash
# Create new page
mkdir -p src/app/[locale]/(authenticated)/settings/security
touch src/app/[locale]/(authenticated)/settings/security/page.tsx
```

```tsx
// src/app/[locale]/(authenticated)/settings/security/page.tsx
import { Suspense } from 'react';
import { SecuritySettingsCard } from '@/components/settings/security-settings-card';

export default function SecuritySettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Security Settings</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <SecuritySettingsCard />
      </Suspense>
    </div>
  );
}
```

**Implementation Option B (Quick Fix):**
Update redirect targets:
```tsx
// mfa-setup-form.tsx:214 and auth/mfa-setup/page.tsx:96
// BEFORE
router.push('/settings/security');

// AFTER
router.push(`/${locale}/settings`);
```

**Testing:**
- [ ] Complete MFA setup flow
- [ ] Verify redirect works
- [ ] Check both authenticated and new user scenarios
- [ ] Test with different locales

---

### 🔴 **Task 1.3: Fix "Add Client" Button**
- **Priority:** CRITICAL
- **Effort:** 30 minutes
- **File:** `src/components/coach/clients-page.tsx:206`
- **Issue:** Button has no onClick handler
- **Impact:** Primary CTA on coach clients page does nothing

**Implementation:**
```tsx
// BEFORE (Line 206)
<Button data-testid="add-client-button">
  <Plus className="mr-2 h-4 w-4" />
  {t('addClient')}
</Button>

// AFTER
<Button
  data-testid="add-client-button"
  onClick={() => router.push(`/${locale}/coach/clients/add`)}
>
  <Plus className="mr-2 h-4 w-4" />
  {t('addClient')}
</Button>
```

**Alternative (if add client page doesn't exist yet):**
```tsx
const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);

<Button
  data-testid="add-client-button"
  onClick={() => setIsAddClientModalOpen(true)}
>
  <Plus className="mr-2 h-4 w-4" />
  {t('addClient')}
</Button>

{isAddClientModalOpen && (
  <AddClientModal
    open={isAddClientModalOpen}
    onOpenChange={setIsAddClientModalOpen}
  />
)}
```

**Testing:**
- [ ] Click button and verify navigation/modal opens
- [ ] Test with coach role
- [ ] Verify button disabled for non-coach roles
- [ ] Check analytics tracking fires

---

### 🔴 **Task 1.4: Fix Locale Prefix in Navigation (6 locations)**
- **Priority:** CRITICAL
- **Effort:** 30 minutes
- **Issue:** Multiple navigation calls missing locale prefix
- **Impact:** Breaks internationalization for Hebrew/non-English users

**Files to Fix:**

**1.4.1: Collection Card**
```tsx
// src/components/resources/collection-card.tsx:75
// BEFORE
onClick={() => router.push(`/coach/resources/collections/${id}`)}

// AFTER
onClick={() => router.push(`/${locale}/coach/resources/collections/${id}`)}
// Add: import { useLocale } from 'next-intl'; const locale = useLocale();
```

**1.4.2: Files Page (3 locations)**
```tsx
// src/app/[locale]/(authenticated)/files/page.tsx:27, 40, 50
// BEFORE
router.push('/login')

// AFTER
router.push(`/${locale}/auth/signin`)
```

**1.4.3: Billing Subscription (2 locations)**
```tsx
// src/app/[locale]/billing/subscription/page.tsx:216, 227
// BEFORE
router.push('/billing/pricing')

// AFTER
router.push(`/${locale}/billing/pricing`)
```

**Testing:**
- [ ] Test each navigation in English locale
- [ ] Test each navigation in Hebrew locale
- [ ] Verify query parameters preserved
- [ ] Check browser back button works correctly

---

### 🔴 **Task 1.5: Add Error Toast to File Downloads**
- **Priority:** CRITICAL
- **Effort:** 20 minutes
- **File:** `src/components/client/shared-files.tsx:145-180`
- **Issue:** Download failures fail silently
- **Impact:** Users click download, nothing happens, no explanation

**Implementation:**
```tsx
// BEFORE (approximate location)
const handleDownload = async (fileId: string) => {
  try {
    const response = await fetch(`/api/files/${fileId}/download`);
    // ... download logic

    // Track access (this is failing silently)
    fetch(`/api/files/${fileId}/track-access`, { method: 'POST' });
  } catch (error) {
    // No user feedback!
  }
};

// AFTER
import { toast } from 'sonner';

const handleDownload = async (fileId: string) => {
  try {
    const response = await fetch(`/api/files/${fileId}/download`);

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    // ... download logic

    // Track access with error handling
    try {
      await fetch(`/api/files/${fileId}/track-access`, { method: 'POST' });
    } catch (trackError) {
      console.warn('Failed to track file access:', trackError);
      // Don't block download for tracking failure
    }

    toast.success('File downloaded successfully');
  } catch (error) {
    console.error('Download failed:', error);
    toast.error(
      error instanceof Error
        ? error.message
        : 'Failed to download file. Please try again.'
    );
  }
};
```

**Testing:**
- [ ] Test successful download shows success toast
- [ ] Test failed download shows error toast
- [ ] Test network failure scenario
- [ ] Verify tracking failure doesn't block download

---

### 🔴 **Task 1.6: Add Loading State to Test Notification**
- **Priority:** CRITICAL
- **Effort:** 30 minutes
- **File:** `src/components/settings/enhanced-notification-settings.tsx`
- **Issue:** Test notification button has no loading feedback
- **Impact:** Users click multiple times, creating duplicate notifications

**Implementation:**
```tsx
// Add state
const [isSendingTest, setIsSendingTest] = useState(false);

// Update mutation
const sendTestNotification = useMutation({
  mutationFn: async (channel: string) => {
    setIsSendingTest(true);
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        body: JSON.stringify({ channel }),
      });
      if (!response.ok) throw new Error('Failed to send test');
      return response.json();
    } finally {
      setIsSendingTest(false);
    }
  },
  onSuccess: () => {
    toast.success('Test notification sent successfully');
  },
  onError: () => {
    toast.error('Failed to send test notification');
  },
});

// Update button
<Button
  onClick={() => sendTestNotification.mutate('email')}
  disabled={isSendingTest}
>
  {isSendingTest ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Sending...
    </>
  ) : (
    'Send Test Notification'
  )}
</Button>
```

**Testing:**
- [ ] Click button and verify it disables
- [ ] Verify spinner shows during send
- [ ] Check success toast appears
- [ ] Test error handling
- [ ] Verify can't click twice rapidly

---

## Sprint 2: High Priority (3-4 days)

**Goal:** Improve user feedback, accessibility, and empty states.

### 🟡 **Task 2.1: Add Empty State to Coaches List**
- **Priority:** HIGH
- **Effort:** 20 minutes
- **File:** `src/components/client/coaches-page.tsx:341-430`
- **Issue:** Filtered list shows blank space when no results
- **Impact:** Users think page is broken

**Implementation:**
```tsx
// Around line 341 in the grid section
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {sortedCoaches.length === 0 ? (
    <div className="col-span-full text-center py-12">
      <div className="flex flex-col items-center space-y-4">
        <div className="rounded-full bg-muted p-4">
          <Users className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">No Coaches Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your filters to see more results.'
              : 'No coaches are available at this time.'}
          </p>
        </div>
        {(searchTerm || statusFilter !== 'all') && (
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  ) : (
    sortedCoaches.map((coach) => (
      // ... existing coach card
    ))
  )}
</div>
```

**Testing:**
- [ ] Apply filters that return no results
- [ ] Verify empty state shows
- [ ] Click "Clear Filters" button
- [ ] Test with no coaches in database

---

### 🟡 **Task 2.2: Add Empty State to Shared Files**
- **Priority:** HIGH
- **Effort:** 20 minutes
- **File:** `src/components/client/shared-files.tsx:145-180`

**Implementation:**
```tsx
{filteredFiles.length === 0 ? (
  <div className="col-span-full text-center py-12">
    <div className="flex flex-col items-center space-y-4">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">No Files Found</h3>
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? 'No files match your current filters.'
            : 'Your coach hasn\'t shared any files yet.'}
        </p>
      </div>
      {hasFilters && (
        <Button variant="outline" onClick={clearFilters}>
          Clear Filters
        </Button>
      )}
    </div>
  </div>
) : (
  filteredFiles.map(file => ...)
)}
```

---

### 🟡 **Task 2.3-2.7: Add aria-labels to Icon Buttons (5 components)**
- **Priority:** HIGH
- **Effort:** 1 hour total (12 min each)
- **Issue:** Screen readers can't identify button purposes
- **WCAG Violation:** Level A (Critical accessibility issue)

**Pattern to Apply:**

```tsx
// BEFORE
<Button variant="ghost" className="h-8 w-8 p-0">
  <MoreHorizontal className="h-4 w-4" />
</Button>

// AFTER
<Button
  variant="ghost"
  className="h-8 w-8 p-0"
  aria-label="Open actions menu"
>
  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
</Button>
```

**Files to Fix:**

**2.3: Coach Clients Page (line 346)**
```tsx
aria-label="Client actions menu"
```

**2.4: User Management Table (line 94)**
```tsx
aria-label="User actions"
```

**2.5: Note Editor Modal (line 222)**
```tsx
aria-label="Close note editor"
```

**2.6: Note Card (line 176)**
```tsx
aria-label="Note options"
```

**2.7: Resource Card (line 236)**
```tsx
aria-label="Resource actions"
```

**Testing:**
- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Verify button purpose is announced
- [ ] Check keyboard navigation works
- [ ] Verify aria-hidden on icons

---

### 🟡 **Task 2.8: Fix Client Card Keyboard Accessibility**
- **Priority:** HIGH
- **Effort:** 30 minutes
- **File:** `src/components/coach/clients-page.tsx:314-318`
- **Issue:** Card with onClick is not keyboard accessible
- **WCAG Violation:** Level A

**Implementation Option A (Recommended - Use Link):**
```tsx
// BEFORE
<Card
  key={client.id}
  className="hover:shadow-lg transition-shadow cursor-pointer"
  data-testid={`client-card-${client.id}`}
  onClick={() => router.push(`/coach/clients/${client.id}`)}
>
  <CardHeader className="pb-3">
    {/* ... card content */}
  </CardHeader>
</Card>

// AFTER
<Link
  href={`/${locale}/coach/clients/${client.id}`}
  key={client.id}
  className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
>
  <Card className="hover:shadow-lg transition-shadow h-full">
    <CardHeader className="pb-3">
      {/* ... card content */}
    </CardHeader>
  </Card>
</Link>
```

**Implementation Option B (Use Button Semantics):**
```tsx
<Card
  key={client.id}
  className="hover:shadow-lg transition-shadow cursor-pointer"
  data-testid={`client-card-${client.id}`}
  onClick={() => router.push(`/${locale}/coach/clients/${client.id}`)}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      router.push(`/${locale}/coach/clients/${client.id}`);
    }
  }}
  role="button"
  tabIndex={0}
  aria-label={`View details for ${client.firstName} ${client.lastName}`}
>
```

**Testing:**
- [ ] Tab to card and verify focus ring
- [ ] Press Enter key
- [ ] Press Space key
- [ ] Test with screen reader
- [ ] Verify nested buttons still work

---

### 🟡 **Task 2.9: Fix Star Rating Accessibility**
- **Priority:** HIGH
- **Effort:** 45 minutes
- **File:** `src/components/sessions/session-rating-dialog.tsx:98-107`
- **Issue:** Star buttons lack aria-labels and state indicators
- **WCAG Violation:** Level A

**Implementation:**
```tsx
// BEFORE
{[1, 2, 3, 4, 5].map((i) => (
  <Button
    key={i}
    variant="ghost"
    size="sm"
    onClick={() => setRating(i)}
  >
    <Star className={cn(
      "h-6 w-6",
      i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
    )} />
  </Button>
))}

// AFTER
<div role="radiogroup" aria-label="Rate this session">
  {[1, 2, 3, 4, 5].map((i) => (
    <Button
      key={i}
      variant="ghost"
      size="sm"
      onClick={() => setRating(i)}
      role="radio"
      aria-checked={rating === i}
      aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' && i < 5) {
          setRating(i + 1);
        } else if (e.key === 'ArrowLeft' && i > 1) {
          setRating(i - 1);
        }
      }}
    >
      <Star
        className={cn(
          "h-6 w-6",
          i <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
        )}
        aria-hidden="true"
      />
    </Button>
  ))}
</div>
<div className="sr-only" aria-live="polite" aria-atomic="true">
  {rating ? `${rating} star${rating > 1 ? 's' : ''} selected` : 'No rating selected'}
</div>
```

**Testing:**
- [ ] Tab to rating control
- [ ] Use arrow keys to change rating
- [ ] Verify screen reader announces selected rating
- [ ] Test with JAWS/NVDA/VoiceOver
- [ ] Verify visual focus indicators

---

### 🟡 **Task 2.10: Add Loading State to Admin Delete**
- **Priority:** HIGH
- **Effort:** 15 minutes
- **File:** `src/components/admin/users-page.tsx`

**Implementation:**
```tsx
// In delete mutation
const deleteUserMutation = useMutation({
  mutationFn: async (userId: string) => {
    // ... delete logic
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    toast.success('User deleted successfully');
  },
});

// Update button
<Button
  variant="destructive"
  size="sm"
  onClick={() => deleteUserMutation.mutate(user.id)}
  disabled={deleteUserMutation.isPending}
>
  {deleteUserMutation.isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Deleting...
    </>
  ) : (
    <>
      <Trash2 className="mr-2 h-4 w-4" />
      Delete
    </>
  )}
</Button>
```

---

### 🟡 **Task 2.11: Verify Session Booking Error Feedback**
- **Priority:** HIGH
- **Effort:** 1 hour
- **File:** `src/components/sessions/unified-session-booking.tsx`
- **Issue:** Complex component with multiple API calls - error handling unclear

**Audit Checklist:**
```tsx
// Check each API call has error handling:
1. Coach list fetch - line ~105
2. Time slots fetch - line ~115
3. Availability status - line ~116
4. Booking mutation - line ~129
5. Session actions (start/complete/cancel) - line ~147

// Verify each has:
- Error state in query/mutation
- User-friendly error message
- Toast notification or Alert component
- Retry mechanism where appropriate
```

**Implementation Pattern:**
```tsx
const { data, error, isError } = useBookingTimeSlots(...);

// In UI:
{isError && error && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Unable to Load Availability</AlertTitle>
    <AlertDescription>
      {error.message || 'Please try again or contact support if the issue persists.'}
    </AlertDescription>
    <Button
      variant="outline"
      size="sm"
      onClick={() => refetch()}
      className="mt-2"
    >
      Retry
    </Button>
  </Alert>
)}
```

**Testing:**
- [ ] Disconnect network and try booking
- [ ] Mock 500 server error
- [ ] Mock 401 unauthorized error
- [ ] Test with invalid coach ID
- [ ] Verify all error paths show user feedback

---

## Month 1: Medium Priority (4-5 days)

### 📱 **Section 3.1: Mobile Responsive Fixes - Select Dropdowns (7 components)**
- **Priority:** MEDIUM
- **Effort:** 2 hours total (~15 min each)
- **Pattern:** Change fixed widths to responsive

**Files to Fix:**

**3.1.1: Settings Audit History (line 65)**
```tsx
// BEFORE
<SelectTrigger className="w-[180px]">

// AFTER
<SelectTrigger className="w-full sm:w-[180px]">
```

**Apply same pattern to:**
- 3.1.2: `notification-settings-card.tsx:300` - `w-[200px]` → `w-full sm:w-[200px]`
- 3.1.3: `insights-page.tsx:201` - `w-[180px]` → `w-full sm:w-[180px]`
- 3.1.4: `clients-page.tsx:285` - `w-[180px]` → `w-full sm:w-[180px]`
- 3.1.5: `clients-page.tsx:297` - `w-[180px]` → `w-full sm:w-[180px]`
- 3.1.6: `resource-analytics-dashboard.tsx:123` - `w-[140px]` → `w-full sm:w-[140px]`
- 3.1.7: `client-resource-filters.tsx:108` - `w-[180px]` → `w-full sm:w-[180px]`
- 3.1.8: `analytics-page.tsx:400` - `w-[180px]` → `w-full sm:w-[180px]`

**Testing:**
- [ ] View on mobile (< 640px width)
- [ ] View on tablet (640px - 1024px)
- [ ] View on desktop (> 1024px)
- [ ] Test in Chrome DevTools device emulator
- [ ] Test on actual mobile device

---

### 📱 **Section 3.2: Mobile Responsive Fixes - Grid Layouts (4 components)**
- **Priority:** MEDIUM
- **Effort:** 1.5 hours

**3.2.1: Settings Tabs (settings-page.tsx:154)**
```tsx
// BEFORE
<TabsList className="grid w-full grid-cols-4">

// AFTER
<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
```

**3.2.2: Audit History (settings-audit-history.tsx:116)**
```tsx
// BEFORE
<div className="grid grid-cols-2 gap-4">

// AFTER
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

**3.2.3: Theme Selector (preferences-settings-card.tsx:93)**
```tsx
// BEFORE
<div className="grid grid-cols-3 gap-3">

// AFTER
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
```

**3.2.4: Notification Tabs (enhanced-notification-settings.tsx:260)**
```tsx
// BEFORE
<TabsList className="grid w-full grid-cols-4">

// AFTER
<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
```

---

### 📱 **Section 3.3: Touch Target Size Improvements (4 components)**
- **Priority:** MEDIUM
- **Effort:** 1 hour
- **Standard:** Minimum 44×44px for touch targets (WCAG 2.5.5)

**Pattern to Apply:**
```tsx
// BEFORE
<Button variant="ghost" className="h-8 w-8 p-0">

// AFTER
<Button variant="ghost" className="h-10 w-10 p-0">
// or even better:
<Button variant="ghost" className="h-11 w-11 p-0">
```

**Files:**
- 3.3.1: `clients-page.tsx:346` - More menu button
- 3.3.2: `user-management-table.tsx:94` - Dropdown trigger
- 3.3.3: `note-card.tsx:176` - Options button
- 3.3.4: `resource-card.tsx:236` - Menu button

**Testing:**
- [ ] Test on actual mobile device
- [ ] Tap with thumb, index finger, pinky
- [ ] Test with accessibility setting "larger touch targets"
- [ ] Verify icon still centered in larger button

---

### 🎨 **Section 3.4: Empty States (5 more components)**
- **Priority:** MEDIUM
- **Effort:** 2 hours

**Template to use:**
```tsx
{items.length === 0 ? (
  <div className="text-center py-12">
    <div className="flex flex-col items-center space-y-4">
      <div className="rounded-full bg-muted p-4">
        <IconComponent className="h-12 w-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">[Empty State Title]</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          [Helpful explanation]
        </p>
      </div>
      <Button onClick={handleAction}>[Action Text]</Button>
    </div>
  </div>
) : (
  items.map(...)
)}
```

**3.4.1: Coach Notes (notes-management.tsx)**
- Message: "No notes yet. Click '+' to create your first note."
- Icon: `FileText`

**3.4.2: Profile Specialties (profile-settings-card.tsx:265-269)**
- Message: "Add your specialties to help clients find you."
- Button: "Add Specialty"

**3.4.3: Session Action Items (session-detail-view.tsx)**
- Message: "No action items for this session."

**3.4.4: Session Key Insights (session-detail-view.tsx)**
- Message: "No key insights recorded yet."

**3.4.5: Client Reflections (if not already done)**
- Message: "You haven't written any reflections yet."
- Button: "Write Reflection"

---

### 🎨 **Section 3.5: Skeleton Loader Fixes (3 components)**
- **Priority:** MEDIUM
- **Effort:** 1 hour

**3.5.1: Admin Table Skeleton (admin-skeletons.tsx:28,38)**
```tsx
// BEFORE
<div className="grid grid-cols-6 gap-4">

// AFTER
<div className="hidden md:grid md:grid-cols-6 gap-4">
  {/* Desktop view */}
</div>
<div className="grid grid-cols-2 gap-2 md:hidden">
  {/* Mobile view */}
</div>
```

**3.5.2: Calendar Skeleton (client-coach-skeletons.tsx:431,438)**
```tsx
// BEFORE
<div className="grid grid-cols-7 gap-2">

// AFTER
<div className="hidden md:grid md:grid-cols-7 gap-2">
  {/* Week view */}
</div>
<div className="grid grid-cols-1 gap-2 md:hidden">
  {/* Mobile list view */}
</div>
```

**3.5.3: Dashboard Stats (dashboard-skeletons.tsx:174)**
```tsx
// BEFORE
<div className="grid grid-cols-3 gap-4">

// AFTER
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## Backlog: Low Priority (3 days)

### 📍 **Section 4.1: Add Back Buttons to Billing Pages**
- **Priority:** LOW
- **Effort:** 1 hour
- **Files:** 3 billing pages

**Pattern:**
```tsx
<div className="space-y-6">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => router.push(`/${locale}/settings`)}
  >
    <ArrowLeft className="mr-2 h-4 w-4" />
    Back to Settings
  </Button>

  <h1 className="text-3xl font-bold">...</h1>
  {/* ... rest of page */}
</div>
```

**Files:**
- 4.1.1: `/billing/subscription/page.tsx`
- 4.1.2: `/billing/invoices/page.tsx`
- 4.1.3: `/billing/pricing/page.tsx`

---

### 🧹 **Section 4.2: Audit and Remove Orphaned Pages**
- **Priority:** LOW
- **Effort:** 4 hours
- **Potential Files:**
  - `/client/page.tsx`
  - `/coach/clients/[id]/page.tsx`
  - `/sessions/[id]/page.tsx`
  - `/onboarding/page.tsx`
  - `/settings/page.tsx`
  - And 6+ more

**Process:**
1. Search codebase for any links/references to old-style routes
2. Verify if page is still in use
3. If unused:
   - Remove page file
   - Remove from git
   - Document in CHANGELOG
4. If still used:
   - Migrate to new `/[locale]/(authenticated)/` pattern
   - Update all references
   - Test thoroughly

---

### 🎨 **Section 4.3: Polish & Nice-to-Haves**
- **Priority:** LOW
- **Effort:** 1 day

**4.3.1: Search Debounce Indicator**
```tsx
// clients-page.tsx:76-82
const [isSearching, setIsSearching] = useState(false);

useEffect(() => {
  setIsSearching(true);
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm);
    setIsSearching(false);
  }, 300);
  return () => clearTimeout(timer);
}, [searchTerm]);

// In Input:
<Input
  placeholder={t('searchPlaceholder')}
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  className="pl-10"
  data-testid="client-search-input"
/>
{isSearching && (
  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
)}
```

**4.3.2: Star Rating Color Contrast**
```tsx
// Test current yellow: #FACC15
// If contrast < 4.5:1, use darker yellow: #EAB308
```

---

## Testing Strategy

### **Unit Tests**
Create tests for critical fixes:

```tsx
// Example: Add Client Button
describe('CoachClientsPage', () => {
  it('should navigate to add client page when button clicked', () => {
    render(<CoachClientsPage />);
    const addButton = screen.getByTestId('add-client-button');
    fireEvent.click(addButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/en/coach/clients/add');
  });
});

// Example: Star Rating Accessibility
describe('SessionRatingDialog', () => {
  it('should announce rating changes to screen readers', () => {
    render(<SessionRatingDialog />);
    const star3 = screen.getByLabelText('Rate 3 stars');
    fireEvent.click(star3);
    expect(screen.getByText('3 stars selected')).toBeInTheDocument();
  });
});
```

### **Integration Tests**
Test user journeys end-to-end:

```tsx
// Example: Coach booking flow
it('Coach can create session for client', async () => {
  // 1. Navigate to dashboard
  // 2. Click "Schedule Session"
  // 3. Select client
  // 4. Fill form
  // 5. Verify success toast
  // 6. Verify session appears in list
});
```

### **Accessibility Tests**
```bash
# Run axe-core on each modified page
npm run test:a11y

# Manual screen reader testing
# - NVDA (Windows)
# - JAWS (Windows)
# - VoiceOver (macOS/iOS)
# - TalkBack (Android)
```

### **Mobile Testing**
```bash
# Test on real devices:
- iPhone SE (small screen)
- iPhone 14 Pro (modern iOS)
- Samsung Galaxy S21 (Android)
- iPad (tablet)

# Test in DevTools emulator:
- 320px width (iPhone SE)
- 375px width (iPhone 14)
- 768px width (iPad)
- 1024px width (desktop)
```

### **Internationalization Testing**
```bash
# Test all fixes in both locales
- English (en)
- Hebrew (he) - RTL layout

# Verify:
- All navigation preserves locale
- Text wraps correctly in RTL
- Icons don't flip incorrectly
```

---

## Success Metrics

### **Quantitative Metrics**
- [ ] 95+ issues from audit report closed
- [ ] 0 broken navigation links (down from 6)
- [ ] 0 icon buttons without aria-labels (down from 21+)
- [ ] 0 empty states showing blank space (down from 9)
- [ ] 100% of touch targets meet 44×44px minimum
- [ ] Lighthouse accessibility score > 95 (currently unknown)

### **Qualitative Metrics**
- [ ] User can complete coach onboarding without dead ends
- [ ] Client can book session without confusion
- [ ] Screen reader user can navigate entire app
- [ ] Hebrew locale users can access all features
- [ ] Mobile users can tap all buttons comfortably

### **Performance Metrics**
- [ ] No layout shift from skeleton loader mismatch
- [ ] Search debounce doesn't feel laggy
- [ ] Error messages appear within 200ms of failure

---

## Rollout Plan

### **Phase 1: Critical Fixes (Week 1)**
1. Deploy Sprint 1 fixes to staging
2. Test all critical navigation paths
3. Deploy to production with feature flag
4. Monitor error rates and user feedback
5. Roll out to 100% if no issues

### **Phase 2: High Priority (Week 2)**
1. Deploy Sprint 2 fixes to staging
2. Conduct accessibility audit with screen reader
3. Test on mobile devices
4. Deploy to production
5. Monitor accessibility metrics

### **Phase 3: Medium Priority (Weeks 3-4)**
1. Deploy mobile responsive fixes
2. Test on variety of devices
3. Gather user feedback
4. Deploy empty states
5. Monitor engagement metrics

### **Phase 4: Low Priority (Month 2)**
1. Clean up orphaned pages
2. Deploy polish improvements
3. Document new patterns
4. Update component library

---

## Documentation Updates

After implementing fixes:

1. **Update Component Library**
   - Add empty state patterns
   - Document accessibility requirements
   - Add mobile-first responsive patterns

2. **Update Developer Guide**
   - Document locale prefix requirements
   - Add checklist for new components
   - Link to accessibility guidelines

3. **Create Runbook**
   - Common UX issues and how to fix
   - Testing checklist for new features
   - Accessibility testing procedure

---

## Monitoring & Rollback

### **Error Tracking**
```javascript
// Add tracking for fixed issues
trackEvent({
  category: 'ux_fix',
  action: 'navigation_click',
  label: 'profile_link',
  success: true
});
```

### **Rollback Plan**
If critical issues arise:
1. Feature flag off problematic changes
2. Revert specific commits
3. Notify team in Slack
4. Schedule fix within 24 hours

---

## Questions & Considerations

### **Open Questions**
1. Does `/coach/clients/add` page exist or do we need modal?
2. Should we create full security settings page or just redirect?
3. What's the target Lighthouse score for accessibility?
4. Do we have budget for paid screen reader software (JAWS)?

### **Technical Debt**
- Consider standardizing empty state component
- Create reusable accessible rating component
- Implement consistent locale handling utility
- Add linting rules to catch missing aria-labels

---

**Next Steps:**
1. Review and approve this plan
2. Create GitHub issues for each task
3. Assign to sprint/developers
4. Begin Sprint 1 implementation
5. Set up monitoring and testing

**Estimated Timeline:** 4-6 weeks for full implementation (12-15 dev days + testing + deployment)
