# Coach Onboarding Wizard - Integration Guide

## Overview
A complete multi-step onboarding wizard for coaches joining the Loom coaching platform. The wizard guides coaches through profile setup, pricing configuration, availability scheduling, and final review before submission.

## File Structure

```
src/
├── components/
│   └── onboarding/
│       └── coach/
│           ├── coach-onboarding-wizard.tsx   # Main wizard container
│           └── steps/
│               ├── profile-step.tsx          # Step 1: Profile information
│               ├── pricing-step.tsx          # Step 2: Pricing and languages
│               ├── availability-step.tsx     # Step 3: Weekly availability
│               └── review-step.tsx           # Step 4: Review and submit
├── lib/
│   └── types/
│       └── onboarding.ts                     # TypeScript interfaces
└── messages/
    ├── en.json                               # English translations
    └── he.json                               # Hebrew translations
```

## Implementation Details

### 1. TypeScript Types (`/Users/tomergalansky/Desktop/loom-app/src/lib/types/onboarding.ts`)

Complete type definitions for:
- `CoachOnboardingData` - Complete onboarding data structure
- `ProfileStepData` - Profile information (bio, experience, specializations, photo)
- `PricingStepData` - Session rates, currency, languages, timezone
- `AvailabilityStepData` - Weekly schedule, session duration, booking buffer
- `ReviewStepData` - Terms acceptance
- Helper types for specializations, currencies, languages, etc.

### 2. Wizard Steps

#### Step 1: Profile (`profile-step.tsx`)
**Fields:**
- Bio (textarea, 50-500 characters with counter)
- Years of experience (number, 0-50)
- Specializations (multi-select badges)
- Profile picture (optional, with avatar upload component)

**Features:**
- Character counter for bio
- Visual badge selection for specializations
- Drag & drop profile picture upload
- Full form validation with react-hook-form + zod

#### Step 2: Pricing (`pricing-step.tsx`)
**Fields:**
- Session rate (number input with currency symbol)
- Currency selector (USD, EUR, ILS, GBP)
- Languages spoken (multi-select with flag icons)
- Timezone (grouped by region)

**Features:**
- Dynamic currency symbol display
- Flag emojis for language selection
- Organized timezone picker

#### Step 3: Availability (`availability-step.tsx`)
**Fields:**
- Weekly schedule grid (Monday-Sunday)
- Time slots for each available day
- Default session duration (30, 45, 60, 90, 120 minutes)
- Booking buffer time (0, 15, 30, 60 minutes)

**Features:**
- Interactive day toggles
- Add/remove time slots dynamically
- HTML5 time inputs for precise scheduling
- Visual indication of available days

#### Step 4: Review (`review-step.tsx`)
**Features:**
- Summary cards for each section
- Edit buttons to jump back to specific steps
- Profile picture preview
- Terms & conditions acceptance
- Submit button with loading state
- Error handling display

### 3. Main Wizard (`coach-onboarding-wizard.tsx`)

**Features:**
- Progress indicator with visual steps
- Step-by-step navigation
- Form data persistence across steps
- Profile picture upload to `/api/upload/avatar`
- Onboarding submission to `/api/coach/onboarding`
- Success state with auto-redirect
- Error handling and display
- Fully internationalized (English & Hebrew)

## API Integration

### Required API Endpoints

#### 1. Avatar Upload
```typescript
POST /api/upload/avatar
Content-Type: multipart/form-data

Body:
- file: File
- userId: string

Response:
{
  url: string;
  success: boolean;
}
```

#### 2. Coach Onboarding
```typescript
POST /api/coach/onboarding
Content-Type: application/json

Body:
{
  userId: string;
  onboardingData: CoachOnboardingData;
}

Response:
{
  success: boolean;
  message: string;
  coachProfileId?: string;
  errors?: string[];
}
```

## Usage Example

```tsx
import { CoachOnboardingWizard } from '@/components/onboarding/coach/coach-onboarding-wizard';

export default function OnboardingPage() {
  const userId = 'user-id-from-auth';

  return (
    <CoachOnboardingWizard
      userId={userId}
      redirectTo="/dashboard/coach"
    />
  );
}
```

## Integration with Signup Flow

### Option 1: Post-Signup Redirect
After a user signs up as a coach, redirect them to the onboarding wizard:

```tsx
// In signup completion logic
if (userData.role === 'coach' && !userData.onboardingCompleted) {
  router.push('/onboarding/coach');
}
```

### Option 2: Conditional Dashboard
Check onboarding status on dashboard load:

```tsx
// In dashboard page
useEffect(() => {
  if (user.role === 'coach' && !user.onboardingCompleted) {
    router.push('/onboarding/coach');
  }
}, [user]);
```

## Styling & Design

- **Theme Colors**: Uses teal-400 (primary), sand-200 (borders), terracotta-500 (destructive)
- **Components**: All UI components from `@/components/ui/*`
- **Responsive**: Mobile-first design with breakpoints
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Animations**: Smooth transitions between steps with Framer Motion-style animations

## Internationalization (i18n)

Both English and Hebrew translations have been added to:
- `/Users/tomergalansky/Desktop/loom-app/src/messages/en.json`
- `/Users/tomergalansky/Desktop/loom-app/src/messages/he.json`

Translation keys are under `onboarding.coach.*`

### RTL Support
The wizard automatically supports RTL layouts for Hebrew:
- Uses `rtl:` and `ltr:` Tailwind utilities
- Icons and layouts adjust automatically
- Text direction handled by `next-intl`

## Form Validation

All steps use `react-hook-form` with `zod` schemas:

```typescript
const profileSchema = z.object({
  bio: z.string().min(50).max(500),
  yearsOfExperience: z.number().min(0).max(50),
  specializations: z.array(z.string()).min(1),
  // ...
});
```

Validation errors display inline with clear messaging.

## State Management

- **Local State**: React useState for wizard navigation
- **Form State**: react-hook-form for each step
- **Data Persistence**: Parent component stores all step data
- **Submission State**: Loading/error states managed locally

## Error Handling

- **Validation Errors**: Inline field-level error messages
- **API Errors**: Alert component with retry option
- **Upload Errors**: File upload component handles errors
- **Network Errors**: Graceful error messages with user guidance

## Testing Recommendations

1. **Unit Tests**: Test each step component independently
2. **Integration Tests**: Test wizard navigation and data flow
3. **Validation Tests**: Test form validation rules
4. **API Tests**: Mock API endpoints and test submission
5. **Accessibility Tests**: Test keyboard navigation and screen readers
6. **RTL Tests**: Test Hebrew layout and translations

## Future Enhancements

- [ ] Save draft progress to localStorage
- [ ] Multi-step form progress persistence in database
- [ ] Email verification before onboarding completion
- [ ] Video introduction upload
- [ ] Certification upload
- [ ] Payment integration setup
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Social media profile links
- [ ] Sample session video upload

## Dependencies

```json
{
  "react-hook-form": "^7.x",
  "@hookform/resolvers": "^3.x",
  "zod": "^3.x",
  "next-intl": "^3.x",
  "lucide-react": "^0.x",
  "@radix-ui/react-select": "^2.x",
  "@radix-ui/react-checkbox": "^1.x"
}
```

## Database Schema Recommendation

```sql
-- Extend users table or create coach_profiles table
CREATE TABLE coach_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT NOT NULL,
  years_of_experience INTEGER NOT NULL,
  specializations TEXT[] NOT NULL,
  profile_picture_url TEXT,
  session_rate DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  languages TEXT[] NOT NULL,
  timezone VARCHAR(255) NOT NULL,
  weekly_availability JSONB NOT NULL,
  default_session_duration INTEGER NOT NULL,
  booking_buffer INTEGER NOT NULL,
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_coach_profiles_user_id ON coach_profiles(user_id);
CREATE INDEX idx_coach_profiles_specializations ON coach_profiles USING GIN(specializations);
CREATE INDEX idx_coach_profiles_languages ON coach_profiles USING GIN(languages);
```

## Support & Maintenance

For questions or issues with the onboarding wizard:
1. Check component props and TypeScript types
2. Review translation keys in message files
3. Verify API endpoint implementations
4. Check browser console for validation errors
5. Review this integration guide for usage patterns

---

**Last Updated**: 2025-10-04
**Version**: 1.0.0
**Status**: Ready for Integration
