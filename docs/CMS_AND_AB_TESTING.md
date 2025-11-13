# CMS and A/B Testing System Documentation

## Overview

The Loom platform implements a comprehensive CMS (Content Management System) for bilingual marketing content with built-in A/B testing capabilities. This system supports English and Hebrew locales with full RTL (right-to-left) text direction support.

## Architecture

### Directory Structure

```
src/
├── modules/platform/cms/
│   ├── client.ts          # Content fetching with caching
│   ├── types.ts           # Zod schemas and TypeScript types
├── i18n/locales/
│   ├── en/landing.json    # English marketing content
│   ├── he/landing.json    # Hebrew marketing content
├── components/
│   ├── features/landing/  # Main landing components
│   │   ├── Hero.tsx       # Hero section with CTAs
│   │   ├── Pricing.tsx    # Pricing tiers
│   │   ├── Testimonials.tsx
│   └── landing/
│       ├── marketing-header.tsx    # Navigation with CTAs
│       ├── final-cta-section.tsx   # Final CTA
│       └── use-tracked-cta.ts      # A/B testing hook
```

## CMS Integration

### Content Schema

The CMS uses Zod schemas to ensure type safety and validation. All content is defined in `src/modules/platform/cms/types.ts`.

#### Main Content Structure

```typescript
LandingContent {
  locale: 'en' | 'he'
  metadata: {
    title: string
    description: string
    openGraphTitle?: string
    openGraphDescription?: string
    keywords?: string[]
  }
  navigation: {
    links: Array<{label, href}>
    contact: LandingAction
    signIn: LandingAction
    signUp: LandingAction
    logoLabel: string
    navigationAriaLabel: string
    openMenuLabel: string
    closeMenuLabel: string
  }
  hero: {
    eyebrow: string
    title: string
    description: string
    primary: LandingAction
    secondary: LandingAction
    signInPrompt: string
    signInLabel: string
    signInHref: string
    visualAlt: string
    chip?: string
    previewCards?: Array<{label, value}>
  }
  socialProof: {
    title: string
    logos: string[]
  }
  features: {
    title: string
    items: Array<{title, description}>
  }
  testimonials: {
    title: string
    highlight: {quote, name, role}
    items: Array<{quote, name, role}>
  }
  pricing: {
    title: string
    description: string
    tiers: Array<{
      name, price, priceCaption,
      description, features,
      cta, popular?, badgeLabel?
    }>
  }
  cta: {
    title: string
    description: string
    primary: LandingAction
  }
}
```

### Fetching Content

Content is fetched using the cached `getLandingContent` function:

```typescript
import { getLandingContent } from '@/modules/platform/cms/client';

const content = await getLandingContent(locale);
```

The function:
- Accepts a locale string ('en' or 'he')
- Returns validated content from JSON files
- Uses React's `cache()` for automatic request deduplication
- Falls back to Hebrew content if validation fails

### Adding New Content Fields

1. **Update the Zod schema** in `src/modules/platform/cms/types.ts`:

```typescript
export const MyNewSectionSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

// Add to LandingContentSchema
export const LandingContentSchema = z.object({
  // ... existing fields
  myNewSection: MyNewSectionSchema,
});
```

2. **Export the TypeScript type**:

```typescript
export type MyNewSection = z.infer<typeof MyNewSectionSchema>;
```

3. **Add content to JSON files**:

`src/i18n/locales/en/landing.json`:
```json
{
  "myNewSection": {
    "title": "My Section Title",
    "description": "Description here"
  }
}
```

`src/i18n/locales/he/landing.json`:
```json
{
  "myNewSection": {
    "title": "כותרת הסעיף שלי",
    "description": "תיאור כאן"
  }
}
```

4. **Use in components**:

```typescript
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const content = await getLandingContent(locale);

  return (
    <MyNewSection data={content.myNewSection} />
  );
}
```

## A/B Testing System

### Overview

The A/B testing system allows you to test different CTA (Call-to-Action) labels across the marketing site. It uses deterministic, hash-based variant selection to ensure consistent experiences.

### Key Features

- **Deterministic Selection**: Same user sees same variant across sessions
- **Session Persistence**: Variant stored in sessionStorage
- **Weighted Distribution**: Configure custom traffic splits (e.g., 70/30)
- **Analytics Integration**: Automatic tracking of views and clicks
- **SSR-Safe**: Handles server-side rendering gracefully

### Experiment Configuration

Experiments are configured directly in the JSON content files:

```json
{
  "signUp": {
    "label": "Start free trial",
    "href": "/auth/signup",
    "experiment": {
      "experimentId": "nav-signup-experiment-001",
      "enabled": true,
      "variants": [
        {
          "id": "control",
          "label": "Start free trial",
          "weight": 50
        },
        {
          "id": "variant-get-started",
          "label": "Get started free",
          "weight": 50
        }
      ]
    }
  }
}
```

### Experiment Configuration Schema

```typescript
{
  experimentId: string    // Unique identifier for analytics
  enabled: boolean        // Toggle experiment on/off
  variants: Array<{
    id: string           // Variant identifier (e.g., 'control', 'variant-a')
    label: string        // CTA text to display
    weight: number       // Traffic percentage (0-100)
  }>
}
```

### Using the `useTrackedCta` Hook

The hook handles variant selection, analytics tracking, and rendering:

```typescript
'use client';

import { useTrackedCta } from '@/components/landing/use-tracked-cta';

function MyComponent({ action, locale }) {
  const { label, handleClick } = useTrackedCta({
    label: action.label,
    href: action.href,
    location: 'my-component-cta',  // For analytics
    locale,
    experiment: action.experiment,
  });

  return (
    <Button onClick={handleClick}>
      {label}  {/* Shows selected variant */}
    </Button>
  );
}
```

### Variant Selection Algorithm

1. **Generate Session ID**: Create or retrieve from sessionStorage
2. **Hash Input**: Combine `experimentId:sessionId`
3. **Calculate Score**: Convert hash to number 0-99
4. **Select Variant**: Use cumulative weights to determine variant

Example with 70/30 split:
- Variant A (weight: 70) → scores 0-69
- Variant B (weight: 30) → scores 70-99

### Analytics Tracking

The system automatically tracks:

1. **Experiment Views**: When a variant is displayed
```typescript
trackExperimentView(
  experimentId,
  variantId,
  location,
  locale
);
```

2. **CTA Clicks**: When a user clicks the CTA
```typescript
trackCtaClick(
  location,
  label,
  href,
  locale,
  experimentId?,
  variantId?
);
```

### Best Practices

#### 1. Naming Conventions

- **Experiment IDs**: Use descriptive names with version numbers
  - Good: `hero-cta-experiment-001`, `nav-signup-experiment-002`
  - Bad: `exp1`, `test`

- **Variant IDs**: Use clear, descriptive names
  - Good: `control`, `variant-schedule`, `variant-long-form`
  - Bad: `a`, `b`, `v1`

- **Locations**: Use kebab-case with section context
  - Good: `hero-primary`, `pricing-tier-1`, `nav-signup`
  - Bad: `button1`, `cta`

#### 2. Weight Configuration

- Weights should sum to 100 for predictable distribution
- Use 50/50 for standard A/B tests
- Consider 80/20 for safety (control/variant)
- For A/B/C tests: 33/33/34 or custom ratios

#### 3. Experiment Lifecycle

**Planning:**
1. Define hypothesis and success metrics
2. Choose experiment location and variants
3. Set traffic allocation (start conservative)

**Implementation:**
1. Add experiment config to JSON files
2. Ensure both locales have the config
3. Test locally with different session IDs

**Running:**
1. Monitor analytics for variant views/clicks
2. Check for statistical significance
3. Watch for technical issues

**Concluding:**
1. Analyze results and pick winner
2. Update JSON to use winning variant
3. Set `enabled: false` or remove experiment config
4. Document learnings

#### 4. Testing Experiments Locally

```typescript
// Clear session storage to get a new variant
sessionStorage.clear();
location.reload();

// Or manually set session ID for specific variant
sessionStorage.setItem(
  'loom_experiment_session_id',
  'test-session-for-variant-b'
);
```

## Localization

### Supported Locales

- **English (en)**: LTR, Inter font
- **Hebrew (he)**: RTL, Assistant font

### Text Direction

Text direction is automatically set on the `<html>` element:

```typescript
// In src/app/[locale]/layout.tsx
const direction = getLocaleDirection(locale);

<html lang={locale} dir={direction}>
```

This ensures:
- Proper text alignment
- Correct layout mirroring for RTL
- Appropriate CSS cascade for directional properties

### Adding a New Locale

1. **Update locale configuration**:

`src/modules/i18n/config.ts`:
```typescript
export const SUPPORTED_LOCALES = ['en', 'he', 'fr'] as const;

export const LOCALE_METADATA: Record<AppLocale, LocaleMetadata> = {
  // ... existing
  fr: {
    code: 'fr',
    englishLabel: 'French',
    nativeLabel: 'Français',
    direction: 'ltr',
  },
};
```

2. **Create locale JSON file**:

Create `src/i18n/locales/fr/landing.json` with translated content.

3. **Update CMS client**:

`src/modules/platform/cms/client.ts`:
```typescript
import landingFr from '@/i18n/locales/fr/landing.json';

export const getLandingContent = cache(
  async (rawLocale: string): Promise<LandingContent> => {
    const locale: LandingLocale =
      rawLocale === 'en' ? 'en' :
      rawLocale === 'fr' ? 'fr' : 'he';

    const source =
      locale === 'en' ? landingEn :
      locale === 'fr' ? landingFr : landingHe;

    // ... rest of function
  }
);
```

4. **Update schema locale enum**:

`src/modules/platform/cms/types.ts`:
```typescript
export const LandingContentSchema = z.object({
  locale: z.enum(['en', 'he', 'fr']),
  // ...
});
```

## Accessibility

### Built-in Features

1. **Semantic HTML**: All components use proper HTML5 elements
2. **ARIA Labels**: Navigation, buttons, and interactive elements have labels
3. **Keyboard Navigation**: Full keyboard support for all interactive elements
4. **Skip Links**: Skip to main content and navigation
5. **Alt Text**: Images and decorative elements properly labeled
6. **Focus Management**: Visible focus indicators and logical tab order
7. **RTL Support**: Proper text direction for Hebrew content

### Accessibility in CMS Content

The CMS includes accessibility-specific fields:

```json
{
  "navigation": {
    "logoLabel": "Back to the Loom-app homepage",
    "navigationAriaLabel": "Primary marketing navigation",
    "openMenuLabel": "Open navigation menu",
    "closeMenuLabel": "Close navigation menu"
  },
  "hero": {
    "visualAlt": "Screenshot of the Loom-app dashboard..."
  }
}
```

### Testing Accessibility

1. **Screen Reader Testing**: Test with NVDA (Windows) or VoiceOver (Mac)
2. **Keyboard Navigation**: Tab through entire page without mouse
3. **Color Contrast**: Verify WCAG AA compliance
4. **Automated Testing**: Run accessibility tests (see below)

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test i18n
npm test landing

# Run with coverage
npm test -- --coverage
```

### Testing Checklist

- [ ] Content validates against Zod schemas
- [ ] Both locales have complete translations
- [ ] A/B test variants display correctly
- [ ] Analytics tracking fires properly
- [ ] RTL layout works for Hebrew
- [ ] Keyboard navigation works
- [ ] Screen reader announces content correctly
- [ ] Mobile responsive design works
- [ ] Performance metrics are acceptable

## Performance

### Optimization Strategies

1. **Static Generation**: Pages use `force-static` for CDN caching
2. **Revalidation**: 1-hour cache TTL for fresh content
3. **React Cache**: Automatic request deduplication
4. **Code Splitting**: Client components loaded on demand
5. **Font Optimization**: Preloaded fonts with fallbacks

### Monitoring

- **Core Web Vitals**: LCP, FID, CLS
- **Bundle Size**: Track JavaScript payload
- **Cache Hit Rate**: Monitor CDN effectiveness
- **Experiment Metrics**: Track variant performance

## Troubleshooting

### Common Issues

**Issue**: Experiment variant not changing
- **Solution**: Clear sessionStorage and reload

**Issue**: Content validation fails
- **Solution**: Check JSON against schema, ensure all required fields present

**Issue**: RTL layout broken
- **Solution**: Verify `dir="rtl"` on html element, check for hardcoded LTR styles

**Issue**: Metadata not showing in social shares
- **Solution**: Test with Open Graph debugger, verify metadata in page source

## Migration Guide

### From Hardcoded to CMS

If you have hardcoded content you want to move to the CMS:

1. Define schema in `types.ts`
2. Add content to both locale JSON files
3. Update components to use CMS data
4. Test both locales
5. Remove hardcoded content

### Adding External CMS

To integrate with an external CMS (e.g., Sanity, Contentful):

1. Keep the Zod schemas in `types.ts`
2. Replace `getLandingContent` in `client.ts` to fetch from CMS API
3. Add caching layer (React cache or CDN)
4. Handle loading states and errors
5. Keep JSON files as fallback

Example:
```typescript
export const getLandingContent = cache(
  async (rawLocale: string): Promise<LandingContent> => {
    try {
      // Fetch from external CMS
      const data = await fetch(`${CMS_API}/landing/${locale}`);
      const json = await data.json();

      // Validate against schema
      const parsed = LandingContentSchema.safeParse(json);
      if (!parsed.success) {
        console.error('CMS validation failed', parsed.error);
        // Fallback to local JSON
        return LandingContentSchema.parse(landingHe);
      }

      return parsed.data;
    } catch (error) {
      console.error('CMS fetch failed', error);
      // Fallback to local JSON
      return LandingContentSchema.parse(landingHe);
    }
  }
);
```

## Support

For questions or issues:
- Check this documentation first
- Review component source code for examples
- Run tests to verify functionality
- Check browser console for validation errors

## Changelog

### 2025-11-13
- ✅ Complete CMS schema with metadata support
- ✅ Full bilingual content (EN/HE)
- ✅ Comprehensive A/B testing system
- ✅ Locale-aware routing with RTL support
- ✅ All marketing components implemented
- ✅ Accessibility features and ARIA labels
- ✅ Analytics tracking integration
