/**
 * Subscription Management Dashboard
 * /billing/subscription
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface SubscriptionStatus {
  tier: 'free' | 'basic' | 'professional' | 'enterprise';
  expiresAt: string | null;
  startedAt: string | null;
  isActive: boolean;
  isPaid: boolean;
  daysRemaining: number | null;
  plan: {
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    currency: string;
    features: Record<string, boolean>;
  } | null;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'en';
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/me');
      const data = await response.json();
      if (data.success) {
        setSubscription(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setCanceling(true);
    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchSubscription();
      } else {
        alert('Failed to cancel subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-IL', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load subscription details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-2">Manage your subscription and billing settings</p>
        </div>

        {/* Current Plan */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {subscription.plan?.name || subscription.tier.toUpperCase()} Plan
              </h2>
              <p className="text-gray-600 mb-4">{subscription.plan?.description}</p>

              <div className="space-y-2">
                <div className="flex items-center">
                  <span className="font-semibold text-gray-700 w-32">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    subscription.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {subscription.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {subscription.startedAt && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-32">Started:</span>
                    <span className="text-gray-900">{formatDate(subscription.startedAt)}</span>
                  </div>
                )}

                {subscription.expiresAt && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-32">Renews:</span>
                    <span className="text-gray-900">{formatDate(subscription.expiresAt)}</span>
                  </div>
                )}

                {subscription.daysRemaining !== null && subscription.daysRemaining > 0 && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-32">Days Remaining:</span>
                    <span className="text-gray-900">{subscription.daysRemaining} days</span>
                  </div>
                )}

                {subscription.plan && (
                  <div className="flex items-center">
                    <span className="font-semibold text-gray-700 w-32">Price:</span>
                    <span className="text-gray-900">
                      {formatPrice(subscription.plan.priceMonthly, subscription.plan.currency)}/month
                    </span>
                  </div>
                )}
              </div>
            </div>

            {subscription.isPaid && (
              <button
                onClick={handleCancelSubscription}
                disabled={canceling}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                {canceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            )}
          </div>
        </div>

        {/* Features */}
        {subscription.plan && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Plan Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(subscription.plan.features)
                .filter(([_, enabled]) => enabled)
                .map(([name]) => (
                  <div key={name} className="flex items-center">
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">
                      {name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Change Plan</h3>
            <p className="text-gray-600 mb-4">Upgrade or downgrade your subscription</p>
            <button
              onClick={() => router.push(`/${locale}/billing/pricing`)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              View Plans
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Billing History</h3>
            <p className="text-gray-600 mb-4">View your invoices and receipts</p>
            <button
              onClick={() => router.push(`/${locale}/billing/invoices`)}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium"
            >
              View Invoices
            </button>
          </div>
        </div>

        {/* Warning for Expiring Subscription */}
        {subscription.daysRemaining !== null && subscription.daysRemaining <= 7 && subscription.daysRemaining > 0 && (
          <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Your subscription expires in {subscription.daysRemaining} days. Renew now to avoid interruption.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
