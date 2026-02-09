'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
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
  const refreshingRef = useRef(false);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/plans');
      
      if (!response.ok) {
        const text = await response.text();
        console.error('Failed to fetch plans:', response.status, text.substring(0, 100));
        setPlans([]);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON from plans API, got:', contentType, text.substring(0, 100));
        setPlans([]);
        return;
      }

      const text = await response.text();
      if (!text) {
        console.error('Empty response from plans API');
        setPlans([]);
        return;
      }

      const data = JSON.parse(text);
      setPlans(data.plans || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setPlans([]);
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous calls
    if (refreshingRef.current) {
      return;
    }

    refreshingRef.current = true;
    setLoading(true);

    try {
      const [subResponse, limitsResponse] = await Promise.all([
        fetch('/api/billing/subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch('/api/billing/limits', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      // Check content type before reading body
      const subContentType = subResponse.headers.get('content-type');
      const limitsContentType = limitsResponse.headers.get('content-type');

      // Read response bodies once (can only be read once)
      const subText = await subResponse.text();
      const limitsText = await limitsResponse.text();

      // Check if responses are OK and have content
      if (!subResponse.ok) {
        throw new Error(`Subscription API error: ${subResponse.status} - ${subText.substring(0, 100)}`);
      }

      if (!limitsResponse.ok) {
        throw new Error(`Limits API error: ${limitsResponse.status} - ${limitsText.substring(0, 100)}`);
      }

      if (!subContentType || !subContentType.includes('application/json')) {
        throw new Error(`Expected JSON from subscription API, got: ${subContentType} - ${subText.substring(0, 100)}`);
      }

      if (!limitsContentType || !limitsContentType.includes('application/json')) {
        throw new Error(`Expected JSON from limits API, got: ${limitsContentType} - ${limitsText.substring(0, 100)}`);
      }

      if (!subText || !limitsText) {
        throw new Error('Empty response from API');
      }

      const subData = JSON.parse(subText);
      const limitsData = JSON.parse(limitsText);

      setSubscription(subData.subscription);
      setLimits(limitsData.limits);
      setError(null);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to load subscription');
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  }, [session?.access_token]);

  const createCheckout = useCallback(async (priceId: string) => {
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
  }, [session?.access_token]);

  const openPortal = useCallback(async () => {
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
  }, [session?.access_token]);

  const canUseFeature = useCallback((feature: 'repos' | 'snapshots' | 'tasks'): boolean => {
    if (!limits) return true; // Allow if limits not loaded yet
    return limits[feature]?.allowed ?? true;
  }, [limits]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    if (user && session?.access_token) {
      refreshSubscription();
    } else {
      setLoading(false);
    }
  }, [user, session?.access_token, refreshSubscription]);

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
