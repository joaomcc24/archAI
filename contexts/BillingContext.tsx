'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  priceDisplay: string;
  limits: {
    repos: number;
    snapshots: number;
    tasks: number;
  };
}

interface Subscription {
  plan: Plan;
  status: string;
  currentPeriodEnd: string | null;
}

interface Limits {
  repos: { allowed: boolean; current: number; limit: number };
  snapshots: { allowed: boolean; current: number; limit: number };
  tasks: { allowed: boolean; current: number; limit: number };
}

interface BillingContextType {
  subscription: Subscription | null;
  limits: Limits | null;
  plans: Plan[];
  loading: boolean;
  error: string | null;
  refreshSubscription: () => Promise<void>;
  createCheckout: (priceId: string) => Promise<void>;
  openPortal: () => Promise<void>;
  canUseFeature: (feature: 'repos' | 'snapshots' | 'tasks') => boolean;
}

const BillingContext = createContext<BillingContextType | undefined>(undefined);

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/billing/plans');
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  const refreshSubscription = async () => {
    if (!session?.access_token) return;

    try {
      const [subResponse, limitsResponse] = await Promise.all([
        fetch('/api/billing/subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch('/api/billing/limits', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      const subData = await subResponse.json();
      const limitsData = await limitsResponse.json();

      setSubscription(subData.subscription);
      setLimits(limitsData.limits);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError('Failed to load subscription');
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (priceId: string) => {
    if (!session?.access_token) return;

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error creating checkout:', err);
      setError('Failed to create checkout session');
    }
  };

  const openPortal = async () => {
    if (!session?.access_token) return;

    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error opening portal:', err);
      setError('Failed to open billing portal');
    }
  };

  const canUseFeature = (feature: 'repos' | 'snapshots' | 'tasks'): boolean => {
    if (!limits) return true; // Allow if limits not loaded yet
    return limits[feature]?.allowed ?? true;
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    if (user && session) {
      refreshSubscription();
    } else {
      setLoading(false);
    }
  }, [user, session]);

  return (
    <BillingContext.Provider
      value={{
        subscription,
        limits,
        plans,
        loading,
        error,
        refreshSubscription,
        createCheckout,
        openPortal,
        canUseFeature,
      }}
    >
      {children}
    </BillingContext.Provider>
  );
}

export function useBilling() {
  const context = useContext(BillingContext);
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider');
  }
  return context;
}
