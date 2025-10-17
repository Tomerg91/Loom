import type { Metadata } from 'next';

/**
 * Terms of service marketing page.
 *
 * The page is statically generated and revalidated on a predictable interval so
 * marketing/legal updates propagate without invalidating the entire build.
 */
export const dynamic = 'error';
export const revalidate = 21600; // Revalidate every 6 hours

export const metadata: Metadata = {
  title: 'Terms of Service – Satya Method',
  description:
    'Review the terms and conditions that govern access to the Satya Method coaching platform and services.',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="page-title">Terms of Service</h1>
      <div className="premium-divider mt-4 mb-8" />
      <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 space-y-4">
        <p>
          These placeholder terms outline how you may use the Satya Method
          coaching platform. Replace this with the finalized legal text before
          launch.
        </p>
        <p>
          Using the service constitutes acceptance of these terms. Contact
          support with any questions.
        </p>
      </div>
    </div>
  );
}
