/**
 * @file Defines the Zod schemas and TypeScript contracts that model the marketing
 *       content delivered to the landing page. The schema enforces consistency
 *       across locale-specific JSON sources and any future CMS integrations.
 */
import { z } from 'zod';

/**
 * Schema describing navigation link entries exposed from the marketing CMS.
 */
export const LandingNavigationLinkSchema = z.object({
  label: z.string().min(1, 'Navigation label is required'),
  href: z.string().min(1, 'Navigation href is required'),
});

/**
 * Schema for CTA experiment variants.
 */
export const CtaExperimentVariantSchema = z.object({
  id: z.string().min(1, 'Variant ID is required'),
  label: z.string().min(1, 'Variant label is required'),
  weight: z.number().min(0).max(100).optional().default(50),
});

/**
 * Schema for CTA experiment configuration.
 */
export const CtaExperimentSchema = z.object({
  experimentId: z.string().min(1, 'Experiment ID is required'),
  enabled: z.boolean().default(false),
  variants: z.array(CtaExperimentVariantSchema).min(1).optional(),
});

/**
 * Schema describing a primary or secondary call to action link.
 */
export const LandingActionSchema = z.object({
  label: z.string().min(1, 'Action label is required'),
  href: z.string().min(1, 'Action href is required'),
  experiment: CtaExperimentSchema.optional(),
});

/**
 * Schema for the marketing header content block.
 */
export const LandingNavigationSchema = z.object({
  links: z.array(LandingNavigationLinkSchema).min(1),
  contact: LandingActionSchema,
  signIn: LandingActionSchema,
  signUp: LandingActionSchema,
  logoLabel: z.string().min(1),
  navigationAriaLabel: z.string().min(1),
  openMenuLabel: z.string().min(1),
  closeMenuLabel: z.string().min(1),
});

/**
 * Schema for the hero section copy and actions.
 */
export const LandingHeroSchema = z.object({
  eyebrow: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  primary: LandingActionSchema,
  secondary: LandingActionSchema,
  signInPrompt: z.string().min(1),
  signInLabel: z.string().min(1),
  signInHref: z.string().min(1),
  visualAlt: z.string().min(1),
  chip: z.string().optional(),
  previewCards: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
      })
    )
    .optional(),
});

/**
 * Schema for the social proof stripe.
 */
export const LandingSocialProofSchema = z.object({
  title: z.string().min(1),
  logos: z.array(z.string().min(1)).min(1),
});

/**
 * Schema for product feature highlight cards.
 */
export const LandingFeaturesSchema = z.object({
  title: z.string().min(1),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
      })
    )
    .min(1),
});

/**
 * Schema for testimonials shown on the landing page.
 */
export const LandingTestimonialsSchema = z.object({
  title: z.string().min(1),
  highlight: z.object({
    quote: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
  }),
  items: z
    .array(
      z.object({
        quote: z.string().min(1),
        name: z.string().min(1),
        role: z.string().min(1),
      })
    )
    .min(1),
});

/**
 * Schema for pricing tiers surfaced to prospects.
 */
export const LandingPricingSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  tiers: z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.string().min(1),
        priceCaption: z.string().min(1),
        description: z.string().min(1),
        features: z.array(z.string().min(1)).min(1),
        cta: LandingActionSchema,
        popular: z.boolean().optional(),
        badgeLabel: z.string().min(1).optional(),
      })
    )
    .min(1),
});

/**
 * Schema for the bottom call-to-action block.
 */
export const LandingCtaSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  primary: LandingActionSchema,
});

/**
 * Main schema exported by the CMS client.
 */
export const LandingContentSchema = z.object({
  locale: z.enum(['en', 'he']),
  navigation: LandingNavigationSchema,
  hero: LandingHeroSchema,
  socialProof: LandingSocialProofSchema,
  features: LandingFeaturesSchema,
  testimonials: LandingTestimonialsSchema,
  pricing: LandingPricingSchema,
  cta: LandingCtaSchema,
});

export type CtaExperimentVariant = z.infer<typeof CtaExperimentVariantSchema>;
export type CtaExperiment = z.infer<typeof CtaExperimentSchema>;
export type LandingNavigationLink = z.infer<typeof LandingNavigationLinkSchema>;
export type LandingAction = z.infer<typeof LandingActionSchema>;
export type LandingNavigation = z.infer<typeof LandingNavigationSchema>;
export type LandingHero = z.infer<typeof LandingHeroSchema>;
export type LandingSocialProof = z.infer<typeof LandingSocialProofSchema>;
export type LandingFeatures = z.infer<typeof LandingFeaturesSchema>;
export type LandingTestimonials = z.infer<typeof LandingTestimonialsSchema>;
export type LandingPricing = z.infer<typeof LandingPricingSchema>;
export type LandingCta = z.infer<typeof LandingCtaSchema>;
export type LandingContent = z.infer<typeof LandingContentSchema>;
export type LandingLocale = LandingContent['locale'];
