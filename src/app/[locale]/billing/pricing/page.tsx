/**
 * Pricing & Plan Selection Page
 * /billing/pricing
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SubscriptionPlan {
  id: string;
  tier: 'free' | 'basic' | 'professional' | 'enterprise';
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: Record<string, boolean>;
  maxClients?: number;
  maxSessionsPerMonth?: number;
  maxResources?: number;
  trialDays: number;
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [currentTier, setCurrentTier] = useState<string>('free');

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/subscriptions/plans');
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await fetch('/api/subscriptions/me');
      const data = await response.json();
      if (data.success) {
        setCurrentTier(data.data.tier);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan.tier === 'free') {
      return;
    }

    const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;

    try {
      // Create payment session
      const response = await fetch('/api/payments/tranzila/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: price / 100, // Convert cents to major units
          description: `${plan.name} subscription (${billingInterval})`,
          currency: 'ILS',
          metadata: {
            subscription_tier: plan.tier,
            billing_interval: billingInterval,
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.url) {
        // Redirect to payment gateway
        window.location.href = data.url;
      } else {
        alert('Failed to initiate payment. Please try again.');
      }
    } catch (error) {
      console.error('Error creating payment session:', error);
      alert('Failed to initiate payment. Please try again.');
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-IL', {
      style: 'currency',
      currency: currency,
    }).format(cents / 100);
  };

  const getFeaturesList = (features: Record<string, boolean>): string[] => {
    return Object.entries(features)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pricing plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose the Perfect Plan for You
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Start with a free trial, upgrade anytime
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-12">
            <span className={`mr-3 ${billingInterval === 'monthly' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingInterval(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  billingInterval === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 ${billingInterval === 'yearly' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
              Yearly <span className="text-green-600 text-sm">(Save 17%)</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const price = billingInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
            const isCurrentPlan = plan.tier === currentTier;
            const isPro = plan.tier === 'professional';

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${
                  isPro ? 'ring-2 ring-blue-600' : ''
                }`}
              >
                {isPro && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-sm font-semibold">
                    Popular
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(price, plan.currency)}
                    </span>
                    {plan.tier !== 'free' && (
                      <span className="text-gray-600">
                        /{billingInterval === 'monthly' ? 'month' : 'year'}
                      </span>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.maxClients !== null && (
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">
                          {plan.maxClients ? `Up to ${plan.maxClients} clients` : 'Unlimited clients'}
                        </span>
                      </li>
                    )}
                    {plan.maxSessionsPerMonth !== null && (
                      <li className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">
                          {plan.maxSessionsPerMonth ? `${plan.maxSessionsPerMonth} sessions/month` : 'Unlimited sessions'}
                        </span>
                      </li>
                    )}
                    {getFeaturesList(plan.features).slice(0, 5).map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <svg className="h-5 w-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrentPlan || plan.tier === 'free'}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
                      isCurrentPlan
                        ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                        : isPro
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.tier === 'free' ? 'Free Forever' : 'Choose Plan'}
                  </button>

                  {plan.trialDays > 0 && plan.tier !== 'free' && (
                    <p className="text-center text-sm text-gray-600 mt-2">
                      {plan.trialDays}-day free trial
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="max-w-3xl mx-auto text-left space-y-4">
            <details className="bg-white p-4 rounded-lg shadow">
              <summary className="font-semibold cursor-pointer">Can I change my plan later?</summary>
              <p className="mt-2 text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time from your billing dashboard.
              </p>
            </details>
            <details className="bg-white p-4 rounded-lg shadow">
              <summary className="font-semibold cursor-pointer">What payment methods do you accept?</summary>
              <p className="mt-2 text-gray-600">
                We accept all major credit cards through our secure payment provider, Tranzila.
              </p>
            </details>
            <details className="bg-white p-4 rounded-lg shadow">
              <summary className="font-semibold cursor-pointer">Is there a free trial?</summary>
              <p className="mt-2 text-gray-600">
                Yes, all paid plans include a free trial period. No credit card required for the free plan.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
