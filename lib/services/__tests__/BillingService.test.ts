import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BillingService } from '../BillingService';
import { PLANS } from '../BillingService';

// Mock Supabase
vi.mock('../../supabase-server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

describe('BillingService', () => {
  let billingService: BillingService;

  beforeEach(() => {
    billingService = new BillingService();
  });

  describe('getSubscription', () => {
    it('should return free plan when no subscription exists', async () => {
      const subscription = await billingService.getSubscription('test-user-id');
      
      expect(subscription.plan).toEqual(PLANS.free);
      expect(subscription.status).toBe('free');
    });
  });

  describe('checkLimit', () => {
    it('should allow unlimited when limit is -1', async () => {
      // Mock subscription with unlimited plan
      vi.spyOn(billingService, 'getSubscription').mockResolvedValue({
        plan: PLANS.team,
        status: 'active',
        currentPeriodEnd: null,
      });

      const result = await billingService.checkLimit('test-user-id', 'repos');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });

    it('should check repository limit correctly', async () => {
      vi.spyOn(billingService, 'getSubscription').mockResolvedValue({
        plan: PLANS.free,
        status: 'free',
        currentPeriodEnd: null,
      });

      // Mock project count
      const { supabaseAdmin } = await import('../../supabase-server');
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            count: 0,
          })),
        })),
      } as any);

      const result = await billingService.checkLimit('test-user-id', 'repos');
      
      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(PLANS.free.limits.repos);
    });
  });
});
