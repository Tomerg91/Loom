# Satya Method - Phase 2: Key Screen Redesigns

## ✅ Phase 1 Complete: Design System Foundation
All design system updates have been implemented and pushed to main:
- Satya Method color palette (Teal, Terracotta, Moss, Sand/Stone)
- Hebrew-first typography with Assistant font
- Updated CSS design tokens and animations
- Component library updates (Button, Card, Badge)

## Phase 2: Screen Redesigns Overview

### Priority 1: Coach Dashboard → "Practice Overview" (מרחב התרגול)

#### Current State
- Generic business dashboard with stats cards
- English-first terminology ("Coach Dashboard", "Total Revenue")
- Business-focused metrics (revenue, ratings)
- Orange/black color scheme

#### Satya Method Redesign Goals
**Hebrew Terminology:**
- "Coach Dashboard" → "מרחב התרגול" (Practice Overview)
- "Upcoming Sessions" → "פגישות קרובות"
- "Recent Activity" → "פעילות אחרונה"
- "Active Clients" → "לקוחות פעילים"

**Redesigned Widgets:**

1. **Widget: "פגישות קרובות" (Upcoming Sessions)**
   - List format with Hebrew dates
   - Show client first name + last initial
   - Session focus/intention (not just "session")
   - Teal accents for upcoming sessions

2. **Widget: "פעילות אחרונה" (Recent Activity Feed)**
   - Use somatic terminology:
     - ✓ "ירדן כהן השלימה תרגול" (Yarden Cohen completed a practice)
     - 💬 "הודעה חדשה מאביגיל לוי" (New message from Avigail Levi)
     - 📝 "הערות מפגישה התווספו" (Session notes added)
   - Soft moss green icons for completions
   - Natural, flowing feed layout

3. **Widget: "מרחב להתבוננות" (Space for Reflection)**
   - NEW FEATURE: Daily reflection prompt for the coach
   - Mindful quotes related to Satya Method
   - Editable by coach for personal practice
   - Calming teal gradient background
   - Example prompts:
     - "מה עלה בגוף שלי היום?" (What arose in my body today?)
     - "איפה הרגשתי נוכחות?" (Where did I feel presence?)

**Remove Business Metrics:**
- No "Total Revenue" card
- No "Average Rating" card
- Focus on practice quality, not quantity
- Stats should support the therapeutic journey

---

### Priority 2: Client Hub → "Somatic Journey" (המסע הסומטי)

#### Redesigned Layout

**Header:**
```
[Client Name] - המסע הסומטי שלך
[Button: קבע/י פגישה - Book Session]
```

**Tab Navigation (Hebrew RTL):**
1. יומן תרגול (Practice Journal) ← PRIMARY TAB
2. פגישות (Sessions)
3. תרגולים ומקורות (Practices & Resources)
4. הודעות (Messages)

---

### Tab 1: יומן תרגול (Practice Journal)

**Purpose:** Replace generic "goals" with somatic practice logging

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ יומן תרגול                                      │
│ מרחב אישי לתיעוד החוויה הסומטית שלך           │
├─────────────────────────────────────────────────┤
│                                                 │
│ [+ רשום תרגול חדש]                             │
│                                                 │
│ ┌──────── Entry Card ────────┐                  │
│ │ 28 במרץ, 2025 | 14:30      │                  │
│ │                            │                  │
│ │ אילו תחושות עלו בגוף היום?│                  │
│ │ הרגשתי מתיחות בכתפיים...  │                  │
│ │                            │                  │
│ │ Tags: [כאב] [מודעות]       │                  │
│ └────────────────────────────┘                  │
│                                                 │
│ ┌──────── Entry Card ────────┐                  │
│ │ 25 במרץ, 2025 | 10:15      │                  │
│ │ ...                        │                  │
│ └────────────────────────────┘                  │
└─────────────────────────────────────────────────┘
```

**Guided Prompts (when creating new entry):**
1. "אילו תחושות עלו בגוף היום?" (What sensations arose in the body today?)
2. "היכן הרגשת שחרור או מתח?" (Where did you feel release or tension?)
3. "מה למדת על עצמך?" (What did you learn about yourself?)

**Features:**
- Free-form text entry
- Optional emotion/sensation tags
- Date/time stamp
- Search by sensation or date
- Private to client (coach can view if shared)

---

### Tab 2: פגישות (Sessions)

**Session Card Design:**
```
┌─────────────────────────────────────────┐
│ פגישה עם [Coach Name]                   │
│ 20 במרץ, 2025 | 60 דקות                 │
├─────────────────────────────────────────┤
│ סיכום AI:                               │
│ בפגישה זו חקרנו תחושות של...           │
│ גילויים סומטיים מרכזיים:               │
│ • שחרור באזור הלסת                      │
│ • הגברת מודעות לנשימה                   │
│                                         │
│ [הצג פירוט מלא]                         │
└─────────────────────────────────────────┘
```

**AI Summary Focus (Satya Method):**
- Somatic discoveries: body sensations, releases
- Awareness shifts: proprioception changes
- Practice homework: movements or exercises
- No business jargon, therapeutic language only

---

### Tab 3: תרגולים ומקורות (Practices & Resources)

**Content Types:**
- 🎥 Video: guided meditations, movement sequences
- 📄 PDF: reading materials, worksheets
- 🎵 Audio: breathing exercises, body scans
- 🔗 Links: external resources

**Layout:** Grid of cards with thumbnails

---

### Tab 4: הודעות (Messages)

**Direct messaging with coach:**
- Secure, private communication
- Threaded conversations
- File attachments (photos, voice notes)
- Notification badges

---

## Priority 3: Booking Flow → Mindful Language

### Current: "Book Now" → "Select Service" → "Pick Time" → "Confirm"

### Satya Method Redesign:

**Step 1 Header:**
```
הזמן/י מרחב לעצמך
(Reserve a space for yourself)
```

**Service Selection:**
- "Session" → "מפגש" (Meeting)
- "Initial Consultation" → "מפגש ראשוני" (Initial Meeting)
- 60 minutes → "60 דקות של נוכחות" (60 minutes of presence)

**Time Selection:**
- Calendar with Hebrew dates
- Gentle language: "בחר/י זמן שמרגיש נכון" (Choose a time that feels right)

**Confirmation:**
- "Your session is booked!" → "המרחב שלך שמור" (Your space is reserved)
- Confirmation email with:
  - Preparation suggestions
  - Reminder to arrive grounded
  - Pre-session reflection prompts

---

## Implementation Order

### Week 1: Coach Dashboard
1. Update Hebrew translations in `src/messages/he.json`
2. Redesign `src/components/coach/coach-dashboard.tsx`:
   - Implement "Space for Reflection" widget
   - Update activity feed with somatic language
   - Remove business metrics
3. Add Satya Method styling to dashboard cards

### Week 2: Client Hub
1. Create new Client Hub component structure
2. Implement Practice Journal tab
3. Redesign Sessions tab with AI summaries
4. Update Practices & Resources tab

### Week 3: Booking Flow
1. Update booking component language
2. Redesign confirmation flow
3. Update email templates with mindful language

### Week 4: Polish & Testing
1. RTL testing for all new screens
2. Mobile responsiveness verification
3. Accessibility audit
4. User testing with Satya Method practitioners

---

## Key Design Principles

1. **Hebrew First**: All primary labels in Hebrew, English secondary
2. **Somatic Terminology**: Body-focused language, not business jargon
3. **Calm Aesthetics**: Teal/terracotta/moss colors, soft shadows
4. **Mindful Interactions**: Gentle animations, thoughtful micro-copy
5. **Mobile Optimization**: Touch-first, 44px targets, readable fonts
6. **RTL Excellence**: Perfect right-to-left layout and flow

---

## Files to Modify

### Translations
- `src/messages/he.json` - Add Satya Method terminology
- `src/messages/en.json` - Update English translations

### Components
- `src/components/coach/coach-dashboard.tsx` - Practice Overview redesign
- `src/components/client/client-hub.tsx` - NEW: Somatic Journey hub
- `src/components/client/practice-journal.tsx` - NEW: Journal component
- `src/components/sessions/session-card.tsx` - Update with AI summaries
- `src/components/booking/booking-flow.tsx` - Mindful language updates

### Pages
- `src/app/[locale]/coach/page.tsx` - Updated dashboard integration
- `src/app/[locale]/client/page.tsx` - New Client Hub integration
- `src/app/[locale]/client/practice-journal/page.tsx` - NEW: Journal page

---

## Next Steps

To continue Phase 2 implementation:

1. **Start with translations**: Update `src/messages/he.json` with all Satya Method terms
2. **Create "Space for Reflection" widget**: New component in `src/components/coach/reflection-widget.tsx`
3. **Redesign activity feed**: Update language and icons in dashboard
4. **Build Practice Journal**: New feature, start from scratch following mockups above
5. **Update AI summaries**: Modify session summary generation to focus on somatic discoveries

Each task should be committed separately with clear descriptions of the Satya Method changes.

---

## Resources

- **Color Reference**: See `tailwind.config.ts` for teal/terracotta/moss/sand palette
- **Font Reference**: Assistant (Hebrew), Inter (English) configured in layout
- **Component Library**: Updated Button/Card/Badge components in `src/components/ui/`
- **RTL Support**: Global CSS rules in `src/app/globals.css`

---

*This plan maintains the therapeutic, grounded essence of the Satya Method while providing a complete, modern coaching platform.*