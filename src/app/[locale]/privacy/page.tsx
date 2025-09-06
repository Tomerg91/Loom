'use client';

import React from 'react';

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="page-title">Privacy Policy</h1>
      <div className="premium-divider mt-4 mb-6" />
      <div className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90">
        <p>
          We respect your privacy. This placeholder page explains, in brief, that we collect only
          the information necessary to provide the service and never sell your data. Detailed policy
          text can be added here as it is finalized.
        </p>
        <p className="mt-4">
          For questions about this policy, please contact support.
        </p>
      </div>
    </div>
  );
}

