'use client';

import React from 'react';

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="page-title">Terms of Service</h1>
      <div className="premium-divider mt-4 mb-6" />
      <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90">
        <p>
          These terms govern the use of the service. This placeholder covers common items such as
          acceptable use, account responsibilities, and limitations of liability. Replace this text
          with your finalized legal terms.
        </p>
        <p className="mt-4">
          By using the service, you agree to these terms.
        </p>
      </div>
    </div>
  );
}

