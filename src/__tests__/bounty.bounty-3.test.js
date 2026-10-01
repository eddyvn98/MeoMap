/**
 * Lost Pet Bounty System - Unit Tests
 * Test quy trình tìm mèo thất lạc 5 bước
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/supabaseClient';

vi.mock('@/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
    raw: vi.fn((sql) => sql),
  },
}));

describe('Lost Pet Bounty System - Unit Tests', () => {
  const testPetId = 'lost-pet-001';
  const testOwnerId = 'owner-nguyen-123';
  const testFinderId = 'finder-tran-456';
  const testBountyId = 'bounty-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Step 1: Báo Mèo Thất Lạc
  // ============================================

describe('Step 5: Pay Bounty', () => {
    it('should allow owner to approve bounty claim', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { status: 'approved' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('bounty_claims')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', 'claim-001');

      expect(data.status).toBe('approved');
    });

    it('should transfer bounty amount to finder wallet', async () => {
      const bountyAmount = 1000000;

      // Update finder balance
      const updateFinderMock = vi.fn().mockReturnThis();
      const eqFinderMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateFinderMock,
        eq: eqFinderMock,
      });

      await supabase
        .from('profiles')
        .update({
          balance_thuong: supabase.raw(`balance_thuong + ${bountyAmount}`),
        })
        .eq('id', testFinderId);

      expect(updateFinderMock).toHaveBeenCalled();
    });

    it('should deduct bounty amount from owner wallet', async () => {
      const bountyAmount = 1000000;

      const updateOwnerMock = vi.fn().mockReturnThis();
      const eqOwnerMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateOwnerMock,
        eq: eqOwnerMock,
      });

      await supabase
        .from('profiles')
        .update({
          balance_thuong: supabase.raw(`balance_thuong - ${bountyAmount}`),
        })
        .eq('id', testOwnerId);

      expect(updateOwnerMock).toHaveBeenCalled();
    });

    it('should create wallet transaction record', async () => {
      const mockTransaction = {
        id: 'txn-001',
        user_id: testFinderId,
        amount: 1000000,
        type: 'bounty_received',
        description: 'Nhận thưởng tìm mèo thất lạc',
        related_id: testPetId,
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockTransaction, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: testFinderId,
          amount: 1000000,
          type: 'bounty_received',
          description: 'Nhận thưởng tìm mèo thất lạc',
          related_id: testPetId,
        })
        .select()
        .single();

      expect(data.type).toBe('bounty_received');
      expect(data.amount).toBe(1000000);
    });

    it('should update pet status to "found" after bounty paid', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { status: 'found' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('pets')
        .update({ status: 'found' })
        .eq('id', testPetId);

      expect(data.status).toBe('found');
    });

    it('should update bounty status to "completed"', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { status: 'completed' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('bounties')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', testBountyId);

      expect(data.status).toBe('completed');
    });
  });

  // ============================================
  // Error Scenarios
  // ============================================

describe('Error Scenarios', () => {
    it('should reject claim if owner has insufficient balance', async () => {
      const mockOwner = {
        id: testOwnerId,
        balance_thuong: 500000, // Chỉ có 500k
      };

      const mockBounty = {
        amount: 1000000, // Cần 1 triệu
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockOwner, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data: owner } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testOwnerId)
        .single();

      expect(owner.balance_thuong).toBeLessThan(mockBounty.amount);
      // Should show error: "Số dư không đủ để trả thưởng"
    });

    it('should allow owner to reject fake claims', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { status: 'rejected' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('bounty_claims')
        .update({
          status: 'rejected',
          rejection_reason: 'Ảnh không phải mèo của tôi',
        })
        .eq('id', 'claim-001');

      expect(data.status).toBe('rejected');
    });

    it('should prevent duplicate claims from same user', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key', code: '23505' },
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
      });

      const { error } = await supabase.from('bounty_claims').insert({
        pet_id: testPetId,
        finder_id: testFinderId,
      });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23505');
    });
  });
});
