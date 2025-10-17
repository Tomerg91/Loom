import type { Metadata } from 'next';

/**
 * Privacy policy marketing page.
 *
 * Marked as static with a generous revalidation window so it can be cached by
 * the edge and CDNs while still allowing content updates via CMS or markdown
 * imports without a full redeploy.
 */
export const dynamic = 'error';
export const revalidate = 21600; // Revalidate every 6 hours

export const metadata: Metadata = {
  title: 'Privacy Policy – Satya Method',
  description:
    'Understand how Satya Method collects, stores, and protects your personal information across the coaching platform.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="page-title">Privacy Policy</h1>
      <div className="premium-divider mt-4 mb-8" />
      <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 space-y-4">
        <p>
          We respect your privacy. This placeholder page explains, in brief,
          that we collect only the information necessary to provide the service
          and never sell your data. Detailed policy text can be added here as it
          is finalized.
        </p>
        <p>For questions about this policy, please contact support.</p>
      </div>
    </div>
  );
}
