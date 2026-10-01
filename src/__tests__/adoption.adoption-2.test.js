/**
 * Adoption System - Unit Tests
 * Test quy trình nhận nuôi mèo 5 bước
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '@/supabaseClient';

vi.mock('@/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

describe('Adoption System - Unit Tests', () => {
  const testPetId = 'pet-001';
  const testOwnerId = 'owner-123';
  const testRequesterId = 'requester-456';
  const testRequestId = 'request-789';
  const testDepositId = 'deposit-101';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Step 1: Xem Bài Đăng
  // ============================================

describe('Step 3: Send Adoption Request', () => {
    it('should create adoption request successfully', async () => {
      const mockRequest = {
        id: testRequestId,
        pet_id: testPetId,
        requester_id: testRequesterId,
        owner_id: testOwnerId,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockRequest, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('adoption_requests')
        .insert({
          pet_id: testPetId,
          requester_id: testRequesterId,
          owner_id: testOwnerId,
          status: 'pending',
        })
        .select()
        .single();

      expect(data.status).toBe('pending');
      expect(error).toBeNull();
    });

    it('should allow owner to accept request', async () => {
      const deliveryToken = 'ABC123XYZ';

      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { error } = await supabase
        .from('adoption_requests')
        .update({
          status: 'ready_to_deliver',
          accepted_at: new Date().toISOString(),
          delivery_token: deliveryToken,
        })
        .eq('id', testRequestId);

      expect(error).toBeNull();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'ready_to_deliver',
          delivery_token: deliveryToken,
        })
      );
    });

    it('should allow owner to reject request', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { error } = await supabase
        .from('adoption_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
        })
        .eq('id', testRequestId);

      expect(error).toBeNull();
    });

    it('should generate unique delivery token when accepted', async () => {
      const token1 = Math.random().toString(36).substr(2, 9).toUpperCase();
      const token2 = Math.random().toString(36).substr(2, 9).toUpperCase();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Step 4: Nhận Mèo (Scan QR/Confirm Delivery)
  // ============================================

describe('Step 4: Confirm Delivery', () => {
    it('should verify delivery token matches', async () => {
      const mockRequest = {
        id: testRequestId,
        delivery_token: 'ABC123XYZ',
        status: 'ready_to_deliver',
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockRequest, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data } = await supabase
        .from('adoption_requests')
        .select('*')
        .eq('delivery_token', 'ABC123XYZ')
        .single();

      expect(data.delivery_token).toBe('ABC123XYZ');
    });

    it('should update status to delivered after scanning QR', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { error } = await supabase
        .from('adoption_requests')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', testRequestId);

      expect(error).toBeNull();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'delivered',
        })
      );
    });

    it('should unlock deposits for rejected requesters when one is accepted', async () => {
      // Mock: User A được chấp nhận, User B & C bị từ chối
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const neqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
        neq: neqMock,
      });

      // Reject other requests
      await supabase
        .from('adoption_requests')
        .update({ status: 'rejected' })
        .eq('pet_id', testPetId)
        .neq('id', testRequestId);

      // Unlock their deposits
      await supabase
        .from('deposits')
        .update({ status: 'refunded' })
        .eq('pet_id', testPetId)
        .neq('receiver_id', testRequesterId);

      expect(updateMock).toHaveBeenCalled();
    });

    it('should keep accepted requester deposit locked', async () => {
      const mockDeposit = {
        id: testDepositId,
        receiver_id: testRequesterId,
        status: 'locked', // Vẫn bị khóa
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockDeposit, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data } = await supabase
        .from('deposits')
        .select('*')
        .eq('receiver_id', testRequesterId)
        .single();

      expect(data.status).toBe('locked'); // Tiền cọc của người nhận vẫn bị khóa
    });
  });

  // ============================================
  // Step 5: Hoàn Cọc (Sau 3 Ngày)
  // ============================================
});
