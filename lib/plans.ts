export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    repos: number;
    snapshots: number;
    tasks: number;
  };
}

export const PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'eur',
    interval: 'month',
    features: [
      '1 GitHub repository',
      '3 architecture snapshots/month',
      '10 task generations/month',
      'Community support',
    ],
    limits: {
      repos: 1,
      snapshots: 3,
      tasks: 10,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 1900,
    currency: 'eur',
    interval: 'month',
    features: [
      'Up to 5 GitHub repositories',
      'Unlimited architecture snapshots',
      'Unlimited task generations',
      'Priority support',
      'Export to PDF',
    ],
    limits: {
      repos: 5,
      snapshots: -1,
      tasks: -1,
    },
  },
  team: {
    id: 'team',
    name: 'Team',
    price: 4900,
    currency: 'eur',
    interval: 'month',
    features: [
      'Unlimited GitHub repositories',
      'Unlimited architecture snapshots',
      'Unlimited task generations',
      'Priority support',
      'Export to PDF',
      'Team collaboration (coming soon)',
    ],
    limits: {
      repos: -1,
      snapshots: -1,
      tasks: -1,
    },
  },
};
