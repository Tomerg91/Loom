# Coach Dashboard Bug Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 9 functionality bugs across coach dashboard pages (/coach/clients, /coach/sessions, /coach/insights) to restore broken navigation, missing interactive elements, and mock data issues.

**Architecture:** Fix bugs in priority order: HIGH severity routing/UI issues first (prevent broken workflows), then MEDIUM severity state/data issues (restore data integrity), then LOW severity cosmetic issues. Each fix includes tests to verify the bug is resolved.

**Tech Stack:** Next.js 15, TypeScript, React 19, next-intl for localization, TanStack Query for data fetching, Vitest for testing

---

## Task 1: Fix Missing Locale in Clients Page Navigation

**Files:**
- Modify: `src/components/coach/clients-page.tsx:1-30, 313-365, 449-460`
- Create: `src/tests/components/coach/clients-page.test.tsx` (test file)

**Step 1: Write failing test for locale routing**

Create file: `src/tests/components/coach/clients-page.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import ClientsPage from '@/components/coach/clients-page';

jest.mock('next/navigation');
jest.mock('next-intl');

describe('ClientsPage', () => {
  beforeEach(() => {
    (useLocale as jest.Mock).mockReturnValue('en');
  });

  it('navigates to client detail with locale prefix', async () => {
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    render(<ClientsPage />);

    const clientCard = screen.getByRole('button', { name: /John Doe/i });
    clientCard.click();

    expect(mockRouter.push).toHaveBeenCalledWith('/en/coach/clients/client-123');
  });

  it('navigates to book session with locale prefix', async () => {
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    render(<ClientsPage />);

    const bookButton = screen.getByRole('button', { name: /Book Session/i });
    bookButton.click();

    expect(mockRouter.push).toHaveBeenCalledWith('/en/sessions/book?clientId=client-123');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run src/tests/components/coach/clients-page.test.tsx
```

Expected output: FAIL - "useLocale is not imported" or "router.push called with wrong URL"

**Step 3: Modify clients-page.tsx to import useLocale and fix all router.push calls**

Current imports (line 1-10):
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
// ... other imports
```

Update to:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
// ... other imports
```

Add locale hook at top of component (after `const router = useRouter();`):
```typescript
export default function ClientsPage() {
  const router = useRouter();
  const locale = useLocale();
  const [clients, setClients] = useState([]);
  // ... rest of component
```

Find and replace all 6 router.push calls:

**Line 314** - from:
```typescript
router.push(`/coach/clients/${client.id}`)
```
to:
```typescript
router.push(`/${locale}/coach/clients/${client.id}`)
```

**Line 353** - from:
```typescript
router.push(`/sessions/book?clientId=${client.id}`)
```
to:
```typescript
router.push(`/${locale}/sessions/book?clientId=${client.id}`)
```

**Line 357** - from:
```typescript
router.push(`/messages?clientId=${client.id}`)
```
to:
```typescript
router.push(`/${locale}/messages?clientId=${client.id}`)
```

**Line 361** - from:
```typescript
router.push(`/coach/clients/${client.id}`)
```
to:
```typescript
router.push(`/${locale}/coach/clients/${client.id}`)
```

**Line 450** - from:
```typescript
router.push(`/sessions/book?clientId=${client.id}&type=instant`)
```
to:
```typescript
router.push(`/${locale}/sessions/book?clientId=${client.id}&type=instant`)
```

**Line 459** - from:
```typescript
router.push(`/messages?clientId=${client.id}`)
```
to:
```typescript
router.push(`/${locale}/messages?clientId=${client.id}`)
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run src/tests/components/coach/clients-page.test.tsx
```

Expected output: PASS - 2 tests passing

**Step 5: Commit**

```bash
git add src/components/coach/clients-page.tsx src/tests/components/coach/clients-page.test.tsx
git commit -m "fix: add locale prefix to all client page navigation links"
```

---

## Task 2: Add Missing Click Handlers to Sessions Page Buttons

**Files:**
- Modify: `src/app/coach/sessions/page.tsx:378-385`
- Modify: `src/tests/coach/sessions.test.tsx` (add test case)

**Step 1: Write failing test for button click handlers**

Add to existing test file `src/tests/coach/sessions.test.tsx`:

```typescript
it('should handle New Session button click', async () => {
  const mockOnNewSession = jest.fn();
  render(<SessionsPage onNewSession={mockOnNewSession} />);

  const newSessionButton = screen.getByRole('button', { name: /New Session/i });
  expect(newSessionButton).toBeInTheDocument();

  fireEvent.click(newSessionButton);

  expect(mockOnNewSession).toHaveBeenCalled();
});

it('should handle Schedule button click', async () => {
  const mockOnSchedule = jest.fn();
  render(<SessionsPage onSchedule={mockOnSchedule} />);

  const scheduleButton = screen.getByRole('button', { name: /Schedule/i });
  expect(scheduleButton).toBeInTheDocument();

  fireEvent.click(scheduleButton);

  expect(mockOnSchedule).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run src/tests/coach/sessions.test.tsx -t "button click"
```

Expected output: FAIL - "Cannot find button" or "onClick is not defined"

**Step 3: Add onClick handlers to the buttons**

In `src/app/coach/sessions/page.tsx` at line 378-381, update:

Current:
```typescript
<Button variant="ghost" size="sm">
  <PlusIcon className="mr-2 h-4 w-4" />
  New Session
</Button>
```

To:
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowNewSessionDialog(true)}
>
  <PlusIcon className="mr-2 h-4 w-4" />
  New Session
</Button>
```

At line 382-385, update:

Current:
```typescript
<Button variant="ghost" size="sm">
  <CalendarIcon className="mr-2 h-4 w-4" />
  Schedule
</Button>
```

To:
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => setShowScheduleDialog(true)}
>
  <CalendarIcon className="mr-2 h-4 w-4" />
  Schedule
</Button>
```

Add state declarations near top of component:
```typescript
const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
const [showScheduleDialog, setShowScheduleDialog] = useState(false);
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run src/tests/coach/sessions.test.tsx -t "button click"
```

Expected output: PASS - 2 tests passing

**Step 5: Commit**

```bash
git add src/app/coach/sessions/page.tsx src/tests/coach/sessions.test.tsx
git commit -m "fix: add click handlers to New Session and Schedule buttons"
```

---

## Task 3: Fix Dialog State Mutation Order Bug in Sessions

**Files:**
- Modify: `src/app/coach/sessions/page.tsx:1035-1039`
- Modify: `src/tests/coach/sessions.test.tsx` (add test case)

**Step 1: Write failing test for outcome dialog state**

Add to `src/tests/coach/sessions.test.tsx`:

```typescript
it('should correctly set outcome dialog session ID when completing session', async () => {
  const mockCompleteSession = jest.fn();
  render(<SessionsPage onCompleteSession={mockCompleteSession} />);

  const sessionId = 'session-123';
  // Trigger complete button with conductDialog set to sessionId

  // After clicking, outcomeDialog should be set to the session ID, not null
  expect(screen.getByTestId('outcome-dialog')).toHaveAttribute('data-session-id', sessionId);
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run src/tests/coach/sessions.test.tsx -t "outcome dialog"
```

Expected output: FAIL - "data-session-id is null or undefined"

**Step 3: Fix the state mutation order**

In `src/app/coach/sessions/page.tsx` at lines 1035-1039, change:

Current:
```typescript
<Button onClick={() => {
  completeSession(conductDialog);
  setConductDialog(null);
  setOutcomeDialog(conductDialog);
}}>
```

To:
```typescript
<Button onClick={() => {
  const sessionId = conductDialog;
  completeSession(sessionId);
  setConductDialog(null);
  setOutcomeDialog(sessionId);
}}>
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run src/tests/coach/sessions.test.tsx -t "outcome dialog"
```

Expected output: PASS - 1 test passing

**Step 5: Commit**

```bash
git add src/app/coach/sessions/page.tsx src/tests/coach/sessions.test.tsx
git commit -m "fix: capture conductDialog value before state update in outcome dialog handler"
```

---

## Task 4: Add Missing Export Button Handler to Insights Page

**Files:**
- Modify: `src/components/coach/insights-page.tsx:218`
- Modify: `src/tests/coach/insights.test.tsx` (add test case)

**Step 1: Write failing test for export button**

Add to `src/tests/coach/insights.test.tsx`:

```typescript
it('should export analytics data when export button clicked', async () => {
  const mockExport = jest.fn();
  render(<InsightsPage onExport={mockExport} />);

  const exportButton = screen.getByTestId('export-button');
  expect(exportButton).toBeInTheDocument();

  fireEvent.click(exportButton);

  expect(mockExport).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run src/tests/coach/insights.test.tsx -t "export button"
```

Expected output: FAIL - "Cannot find button" or "onClick is not defined"

**Step 3: Add onClick handler to export button**

In `src/components/coach/insights-page.tsx` at line 218, change:

Current:
```typescript
<Button variant="outline" data-testid="export-button">
  <Download className="mr-2 h-4 w-4" />
  Export
</Button>
```

To:
```typescript
<Button
  variant="outline"
  data-testid="export-button"
  onClick={handleExport}
>
  <Download className="mr-2 h-4 w-4" />
  Export
</Button>
```

Add handler function before the return statement:
```typescript
const handleExport = async () => {
  try {
    const csvContent = generateCSV(metrics);
    downloadFile(csvContent, 'coaching-insights.csv');
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Failed to export data');
  }
};
```

Add utility functions (or import from existing utils):
```typescript
const generateCSV = (data: typeof metrics): string => {
  // Convert metrics to CSV format
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Sessions', data.totalSessions],
    ['Completed Sessions', data.completedSessions],
    ['Client Count', data.clientCount],
    ['Average Rating', data.averageRating],
  ];

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
};

const downloadFile = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run src/tests/coach/insights.test.tsx -t "export button"
```

Expected output: PASS - 1 test passing

**Step 5: Commit**

```bash
git add src/components/coach/insights-page.tsx src/tests/coach/insights.test.tsx
git commit -m "feat: add export analytics data functionality to insights page"
```

---

## Task 5: Replace Mock Data with Real API Calls in Sessions Page

**Files:**
- Modify: `src/app/coach/sessions/page.tsx:102-198` (remove mock data)
- Modify: `src/app/coach/sessions/page.tsx:70-100` (add useQuery hooks)
- Create: `src/hooks/useCoachSessions.ts` (custom hook)
- Modify: `src/tests/coach/sessions.test.tsx` (add integration test)

**Step 1: Write custom hook for fetching sessions**

Create: `src/hooks/useCoachSessions.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface Session {
  id: string;
  clientId: string;
  coachId: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes: string;
}

export const useCoachSessions = (coachId: string) => {
  return useQuery({
    queryKey: ['sessions', coachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('coachId', coachId)
        .order('startTime', { ascending: false });

      if (error) throw error;
      return (data as Session[]) || [];
    },
  });
};

export const useCoachClients = (coachId: string) => {
  return useQuery({
    queryKey: ['clients', coachId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, firstName, lastName, email, phone')
        .eq('coachId', coachId);

      if (error) throw error;
      return data || [];
    },
  });
};
```

**Step 2: Run test to verify hook works**

```bash
npm run test:run src/tests/hooks/useCoachSessions.test.tsx
```

Expected output: PASS (or create test if it doesn't exist)

**Step 3: Update sessions page to use real data**

In `src/app/coach/sessions/page.tsx`, replace mock data (lines 102-198) with:

```typescript
'use client';

import { useCoachSessions, useCoachClients } from '@/hooks/useCoachSessions';
import { useCallback } from 'react';
import { useTransition } from 'react';

export default function SessionsPage() {
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();

  const { data: sessions = [], isLoading: sessionsLoading } = useCoachSessions(user?.id || '');
  const { data: clients = [], isLoading: clientsLoading } = useCoachClients(user?.id || '');

  // Remove all mockSessions and mockClients declarations (lines 102-198)

  // ... rest of component uses sessions and clients from hooks
```

**Step 4: Run integration test**

```bash
npm run test:run src/tests/coach/sessions.test.tsx -t "real data"
```

Expected output: PASS - Sessions and clients loaded from API

**Step 5: Commit**

```bash
git add src/hooks/useCoachSessions.ts src/app/coach/sessions/page.tsx
git commit -m "refactor: replace mock data with real API calls in sessions page"
```

---

## Task 6: Replace Hardcoded Placeholder Data in Insights Page

**Files:**
- Modify: `src/components/coach/insights-page.tsx:110-138`
- Create: `src/hooks/useCoachAnalytics.ts` (custom hook)
- Modify: `src/tests/coach/insights.test.tsx` (add test)

**Step 1: Write custom hook for analytics data**

Create: `src/hooks/useCoachAnalytics.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AnalyticsMetrics {
  totalSessions: number;
  completedSessions: number;
  clientCount: number;
  clientRetentionRate: number;
  goalAchievement: number;
  averageRating: number;
  revenue: number;
  mostCommonGoals: Array<{ goal: string; count: number }>;
  feedback: Array<{ clientId: string; rating: number; comment: string }>;
}

export const useCoachAnalytics = (coachId: string) => {
  return useQuery({
    queryKey: ['analytics', coachId],
    queryFn: async () => {
      // Fetch session metrics
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, status, endTime')
        .eq('coachId', coachId);

      // Fetch client data
      const { data: clients } = await supabase
        .from('clients')
        .select('id, createdAt, status')
        .eq('coachId', coachId);

      // Fetch ratings
      const { data: ratings } = await supabase
        .from('session_ratings')
        .select('rating, feedback')
        .eq('coachId', coachId);

      // Fetch goals
      const { data: goals } = await supabase
        .from('client_goals')
        .select('goal, status')
        .eq('coachId', coachId);

      // Calculate metrics
      const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;
      const totalSessions = sessions?.length || 0;
      const clientCount = clients?.length || 0;

      // Calculate retention rate (active clients / total clients who had sessions)
      const activeClients = clients?.filter(c => c.status === 'active').length || 0;
      const clientRetentionRate = clientCount > 0 ? (activeClients / clientCount) * 100 : 0;

      // Calculate goal achievement rate
      const achievedGoals = goals?.filter(g => g.status === 'achieved').length || 0;
      const goalAchievement = goals && goals.length > 0 ? (achievedGoals / goals.length) * 100 : 0;

      // Calculate average rating
      const averageRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

      // Estimate revenue (you may need to adjust this based on your pricing model)
      const revenue = completedSessions * 100; // $100 per session

      // Most common goals
      const goalCounts: Record<string, number> = {};
      goals?.forEach(g => {
        goalCounts[g.goal] = (goalCounts[g.goal] || 0) + 1;
      });

      const mostCommonGoals = Object.entries(goalCounts)
        .map(([goal, count]) => ({ goal, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const feedback = ratings?.map(r => ({
        clientId: 'unknown',
        rating: r.rating,
        comment: r.feedback,
      })) || [];

      return {
        totalSessions,
        completedSessions,
        clientCount,
        clientRetentionRate: Math.round(clientRetentionRate),
        goalAchievement: Math.round(goalAchievement),
        averageRating: Math.round(averageRating * 10) / 10,
        revenue,
        mostCommonGoals,
        feedback,
      };
    },
  });
};
```

**Step 2: Run test to verify hook works**

```bash
npm run test:run src/tests/hooks/useCoachAnalytics.test.tsx
```

Expected output: PASS

**Step 3: Update insights page to use real metrics**

In `src/components/coach/insights-page.tsx`, replace lines 110-138:

Current:
```typescript
const metrics = {
  totalSessions: 24,
  completedSessions: 22,
  clientCount: 8,
  clientRetentionRate: 85, // Placeholder
  goalAchievement: Math.round((client.averageProgress || 2.5) * 20),
  averageRating: 4.5, // Placeholder
  revenue: metric.completed * 100,
  mostCommonGoals: [ /* hardcoded array */ ],
  feedback: [] // Placeholder
};
```

To:
```typescript
const { data: metrics, isLoading } = useCoachAnalytics(user?.id || '');

// Use metrics directly from the hook
if (isLoading) {
  return <div>Loading analytics...</div>;
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run src/tests/coach/insights.test.tsx -t "real metrics"
```

Expected output: PASS - Real metrics displayed

**Step 5: Commit**

```bash
git add src/hooks/useCoachAnalytics.ts src/components/coach/insights-page.tsx
git commit -m "refactor: replace hardcoded placeholder data with real analytics calculations"
```

---

## Task 7: Implement Reschedule Feature in Sessions Page

**Files:**
- Modify: `src/app/coach/sessions/page.tsx:329-331` (replace debug log)
- Create: `src/components/reschedule-dialog.tsx` (dialog component)
- Modify: `src/tests/coach/sessions.test.tsx` (add test)

**Step 1: Write test for reschedule functionality**

Add to `src/tests/coach/sessions.test.tsx`:

```typescript
it('should open reschedule dialog when reschedule action selected', async () => {
  render(<SessionsPage />);

  const rescheduleButton = screen.getByRole('button', { name: /Reschedule/i });
  fireEvent.click(rescheduleButton);

  expect(screen.getByTestId('reschedule-dialog')).toBeInTheDocument();
});

it('should reschedule selected sessions', async () => {
  const mockReschedule = jest.fn();
  render(<SessionsPage onReschedule={mockReschedule} />);

  // Select sessions and click reschedule
  const rescheduleButton = screen.getByRole('button', { name: /Reschedule/i });
  fireEvent.click(rescheduleButton);

  const dateInput = screen.getByRole('textbox', { name: /New Date/i });
  fireEvent.change(dateInput, { target: { value: '2025-02-15' } });

  const confirmButton = screen.getByRole('button', { name: /Confirm/i });
  fireEvent.click(confirmButton);

  expect(mockReschedule).toHaveBeenCalledWith(
    expect.arrayContaining(['session-1', 'session-2']),
    '2025-02-15'
  );
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run src/tests/coach/sessions.test.tsx -t "reschedule"
```

Expected output: FAIL - "reschedule-dialog not found"

**Step 3: Create reschedule dialog component**

Create: `src/components/reschedule-dialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionIds: string[];
  onSuccess?: () => void;
}

export function RescheduleDialog({
  open,
  onOpenChange,
  sessionIds,
  onSuccess,
}: RescheduleDialogProps) {
  const [newDate, setNewDate] = useState('');

  const reschedule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sessions')
        .update({ startTime: newDate })
        .in('id', sessionIds);

      if (error) throw error;
    },
    onSuccess: () => {
      onOpenChange(false);
      setNewDate('');
      onSuccess?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="reschedule-dialog">
        <DialogHeader>
          <DialogTitle>Reschedule Sessions</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">New Date & Time</label>
            <Input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => reschedule.mutate()}
              disabled={!newDate || reschedule.isPending}
            >
              {reschedule.isPending ? 'Rescheduling...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 4: Update sessions page to use reschedule dialog**

In `src/app/coach/sessions/page.tsx`, add state for reschedule dialog:

```typescript
const [rescheduleOpen, setRescheduleOpen] = useState(false);
const [selectedSessionsToReschedule, setSelectedSessionsToReschedule] = useState<string[]>([]);
```

Replace the debug code at lines 329-331:

Current:
```typescript
case 'reschedule':
  console.log('Reschedule sessions:', selectedSessions);
  break;
```

To:
```typescript
case 'reschedule':
  setSelectedSessionsToReschedule(selectedSessions);
  setRescheduleOpen(true);
  break;
```

Add the dialog component before the closing return:

```typescript
<RescheduleDialog
  open={rescheduleOpen}
  onOpenChange={setRescheduleOpen}
  sessionIds={selectedSessionsToReschedule}
  onSuccess={() => {
    // Refresh sessions list
    setSelectedSessions([]);
  }}
/>
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run src/tests/coach/sessions.test.tsx -t "reschedule"
```

Expected output: PASS - 2 tests passing

**Step 6: Commit**

```bash
git add src/components/reschedule-dialog.tsx src/app/coach/sessions/page.tsx src/tests/coach/sessions.test.tsx
git commit -m "feat: implement reschedule functionality for bulk session management"
```

---

## Task 8: Standardize Locale Handling Across Coach Components

**Files:**
- Modify: `src/components/coach/availability-manager.tsx` (verify it uses useLocale)
- Modify: `src/components/coach/insights-page.tsx` (add useLocale if missing)
- Create: `src/tests/coach/locale-consistency.test.tsx` (test)

**Step 1: Write test for locale consistency**

Create: `src/tests/coach/locale-consistency.test.tsx`

```typescript
import { render } from '@testing-library/react';
import { useLocale } from 'next-intl';
import ClientsPage from '@/components/coach/clients-page';
import InsightsPage from '@/components/coach/insights-page';
import AvailabilityManager from '@/components/coach/availability-manager';

jest.mock('next-intl');

describe('Locale handling consistency', () => {
  beforeEach(() => {
    (useLocale as jest.Mock).mockReturnValue('en');
  });

  it('ClientsPage uses locale', () => {
    render(<ClientsPage />);
    expect(useLocale).toHaveBeenCalled();
  });

  it('InsightsPage uses locale', () => {
    render(<InsightsPage />);
    expect(useLocale).toHaveBeenCalled();
  });

  it('AvailabilityManager uses locale', () => {
    render(<AvailabilityManager />);
    expect(useLocale).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to check which components are missing**

```bash
npm run test:run src/tests/coach/locale-consistency.test.tsx
```

Expected output: Some tests fail for components not using useLocale

**Step 3: Add useLocale to any components missing it**

Check `src/components/coach/insights-page.tsx`:

If it doesn't import useLocale, add:
```typescript
import { useLocale } from 'next-intl';

export default function InsightsPage() {
  const locale = useLocale();
  // ... rest of component
}
```

Check `src/components/coach/availability-manager.tsx` - if missing, add the same.

**Step 4: Run test to verify all pass**

```bash
npm run test:run src/tests/coach/locale-consistency.test.tsx
```

Expected output: PASS - All 3 tests passing

**Step 5: Commit**

```bash
git add src/components/coach/insights-page.tsx src/components/coach/availability-manager.tsx src/tests/coach/locale-consistency.test.tsx
git commit -m "refactor: standardize locale handling across all coach dashboard components"
```

---

## Task 9: Fix API Response Data Transformation Fragility

**Files:**
- Create: `src/lib/transformers/client-transformer.ts` (transformation utility)
- Modify: `src/components/coach/clients-page.tsx:113-117` (use transformer)
- Modify: `src/tests/lib/client-transformer.test.ts` (test)

**Step 1: Write test for client data transformer**

Create: `src/tests/lib/client-transformer.test.ts`

```typescript
import { transformClientData } from '@/lib/transformers/client-transformer';

describe('Client Data Transformer', () => {
  it('should transform snake_case API response to camelCase', () => {
    const apiResponse = {
      id: '123',
      first_name: 'John',
      last_name: 'Doe',
      email_address: 'john@example.com',
      phone_number: '555-1234',
    };

    const result = transformClientData(apiResponse);

    expect(result).toEqual({
      id: '123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
    });
  });

  it('should handle mixed case API response', () => {
    const apiResponse = {
      id: '123',
      firstName: 'John', // already camelCase
      last_name: 'Doe',  // snake_case
    };

    const result = transformClientData(apiResponse);

    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
  });

  it('should handle missing fields gracefully', () => {
    const apiResponse = { id: '123' };

    const result = transformClientData(apiResponse);

    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run src/tests/lib/client-transformer.test.ts
```

Expected output: FAIL - "transformClientData is not defined"

**Step 3: Create transformer utility**

Create: `src/lib/transformers/client-transformer.ts`

```typescript
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  [key: string]: any;
}

export const transformClientData = (
  apiResponse: Record<string, any>
): Client => {
  return {
    id: apiResponse.id || '',
    firstName: apiResponse.firstName ?? apiResponse.first_name ?? '',
    lastName: apiResponse.lastName ?? apiResponse.last_name ?? '',
    email: apiResponse.email ?? apiResponse.email_address ?? '',
    phone: apiResponse.phone ?? apiResponse.phone_number ?? '',
    ...apiResponse, // Include any additional fields
  };
};

export const transformClientList = (
  apiResponses: Record<string, any>[]
): Client[] => {
  return apiResponses.map(transformClientData);
};
```

**Step 4: Update clients-page.tsx to use transformer**

In `src/components/coach/clients-page.tsx`, replace lines 113-117:

Current:
```typescript
firstName: client.firstName ?? client.first_name ?? ''
lastName: client.lastName ?? client.last_name ?? ''
email: client.email ?? client.email_address ?? ''
phone: client.phone ?? client.phone_number ?? ''
```

To:
```typescript
import { transformClientData } from '@/lib/transformers/client-transformer';

// When fetching clients from API:
const transformedClients = clients.map(transformClientData);

// Then use transformedClients throughout
firstName: transformedClient.firstName
lastName: transformedClient.lastName
email: transformedClient.email
phone: transformedClient.phone
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run src/tests/lib/client-transformer.test.ts
```

Expected output: PASS - 3 tests passing

**Step 6: Commit**

```bash
git add src/lib/transformers/client-transformer.ts src/components/coach/clients-page.tsx src/tests/lib/client-transformer.test.ts
git commit -m "refactor: create data transformer for consistent API response handling"
```

---

## Final Verification

After all tasks are complete, run the full test suite:

```bash
npm run test:run
```

Expected output: All tests pass with no failures

Run the build to verify no TypeScript errors:

```bash
npm run typecheck
```

Expected output: No errors

---

## Plan Summary

**9 bugs fixed across 3 pages:**
- 2 HIGH priority navigation/UI issues
- 5 MEDIUM priority state/data issues
- 1 LOW priority cosmetic issue

**Quality improvements:**
- Consistent locale handling
- Real API integration instead of mocks
- Proper data transformation layer
- Complete test coverage for all fixes
- TypeScript safety throughout

---

Plan complete and saved to `docs/plans/2025-01-30-coach-dashboard-bug-fixes.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach would you prefer?