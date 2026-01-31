'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBilling } from '../../contexts/BillingContext';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

function BillingPageContent() {
  const { user, loading: authLoading } = useAuth();
  const {
    subscription,
    limits,
    plans,
    loading: billingLoading,
    createCheckout,
    openPortal,
    refreshSubscription,
  } = useBilling();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setMessage({ type: 'success', text: 'Subscription successful! Welcome to Pro.' });
      refreshSubscription();
    } else if (searchParams.get('canceled') === 'true') {
      setMessage({ type: 'error', text: 'Checkout canceled. You can try again anytime.' });
    }
  }, [searchParams, refreshSubscription]);

  if (authLoading || billingLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please sign in to manage your subscription.</p>
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const currentPlan = subscription?.plan;
  const isPro = currentPlan?.id === 'pro' || currentPlan?.id === 'team';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 mb-4 transition-colors font-medium text-sm">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Billing & Subscription</h1>
          <p className="text-gray-600 mt-2">Manage your subscription and billing settings</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Current Plan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Plan</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">{currentPlan?.name || 'Free'}</span>
                {isPro && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                {isPro
                  ? `Renews on ${new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}`
                  : 'Upgrade to unlock more features'}
              </p>
            </div>
            {isPro && (
              <button
                onClick={openPortal}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Manage Subscription
              </button>
            )}
          </div>
        </div>

        {/* Usage */}
        {limits && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage This Month</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <UsageCard
                title="Repositories"
                current={limits.repos.current}
                limit={limits.repos.limit}
              />
              <UsageCard
                title="Snapshots"
                current={limits.snapshots.current}
                limit={limits.snapshots.limit}
              />
              <UsageCard
                title="Task Generations"
                current={limits.tasks.current}
                limit={limits.tasks.limit}
              />
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={currentPlan?.id === plan.id}
                onSelect={() => {
                  if (plan.id === 'pro') {
                    createCheckout(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '');
                  } else if (plan.id === 'team') {
                    createCheckout(process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID || '');
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <BillingPageContent />
    </Suspense>
  );
}

function UsageCard({ title, current, limit }: { title: string; current: number; limit: number }) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className={`text-sm ${isNearLimit ? 'text-orange-600' : 'text-gray-600'}`}>
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            isNearLimit ? 'bg-orange-500' : 'bg-blue-600'
          }`}
          style={{ width: isUnlimited ? '5%' : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  isCurrentPlan,
  onSelect,
}: {
  plan: { id: string; name: string; price: number; priceDisplay: string; features: string[] };
  isCurrentPlan: boolean;
  onSelect: () => void;
}) {
  const isPopular = plan.id === 'pro';

  return (
    <div
      className={`relative bg-white rounded-xl border-2 p-6 ${
        isPopular ? 'border-blue-600 shadow-lg' : 'border-gray-200'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        <div className="mt-2">
          <span className="text-4xl font-bold text-gray-900">
            {plan.price === 0 ? 'Free' : `€${plan.price / 100}`}
          </span>
          {plan.price > 0 && <span className="text-gray-600">/mo</span>}
        </div>
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature: string, index: number) => (
          <li key={index} className="flex items-center text-sm text-gray-600">
            <svg
              className="w-4 h-4 mr-2 text-green-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrentPlan || plan.id === 'free'}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isCurrentPlan
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : plan.id === 'free'
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : isPopular
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-900 text-white hover:bg-gray-800'
        }`}
      >
        {isCurrentPlan ? 'Current Plan' : plan.id === 'free' ? 'Free Forever' : 'Upgrade Now'}
      </button>
    </div>
  );
}
