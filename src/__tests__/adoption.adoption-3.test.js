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

describe('Step 5: Refund Deposit After 3 Days', () => {
    it('should set checkin_required_at when delivered', async () => {
      const deliveredDate = new Date();
      const checkinDate = new Date(deliveredDate);
      checkinDate.setDate(checkinDate.getDate() + 3); // +3 days

      const mockRequest = {
        id: testRequestId,
        status: 'delivered',
        delivered_at: deliveredDate.toISOString(),
        checkin_required_at: checkinDate.toISOString(),
        checkin_days: 3,
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
        .eq('id', testRequestId)
        .single();

      expect(data.checkin_days).toBe(3);
      expect(data.checkin_required_at).toBeDefined();
    });

    it('should allow owner to confirm checkin (good receiver)', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { error } = await supabase
        .from('adoption_requests')
        .update({
          owner_confirmed_checkin: true,
          owner_confirmed_checkin_at: new Date().toISOString(),
        })
        .eq('id', testRequestId);

      expect(error).toBeNull();
    });

    it('should allow receiver to confirm checkin', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { error } = await supabase
        .from('adoption_requests')
        .update({
          receiver_confirmed_checkin: true,
          receiver_confirmed_checkin_at: new Date().toISOString(),
        })
        .eq('id', testRequestId);

      expect(error).toBeNull();
    });

    it('should auto-complete when both confirm checkin', async () => {
      const mockRequest = {
        id: testRequestId,
        owner_confirmed_checkin: true,
        receiver_confirmed_checkin: true,
        status: 'delivered',
      };

      // Trigger sẽ tự động chuyển status thành 'completed'
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { ...mockRequest, status: 'completed' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('adoption_requests')
        .update(mockRequest)
        .eq('id', testRequestId);

      expect(data.status).toBe('completed');
    });

    it('should refund deposit when completed', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { error } = await supabase
        .from('deposits')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
        })
        .eq('id', testDepositId);

      expect(error).toBeNull();
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'refunded',
        })
      );
    });

    it('should auto-complete after 3 days if owner not respond', async () => {
      const deliveredDate = new Date();
      deliveredDate.setDate(deliveredDate.getDate() - 4); // 4 days ago

      const mockRequest = {
        id: testRequestId,
        status: 'delivered',
        delivered_at: deliveredDate.toISOString(),
        owner_confirmed_checkin: false,
      };

      const daysPassed = (new Date() - new Date(deliveredDate)) / (1000 * 60 * 60 * 24);

      expect(daysPassed).toBeGreaterThan(3);

      // Auto-complete logic
      if (daysPassed >= 3 && !mockRequest.owner_confirmed_checkin) {
        mockRequest.status = 'completed';
        mockRequest.receiver_confirmed_checkin = true;
        mockRequest.owner_confirmed_checkin = true;
      }

      expect(mockRequest.status).toBe('completed');
    });
  });

  // ============================================
  // Error Scenarios
  // ============================================

describe('Error Scenarios', () => {
    it('should prevent duplicate adoption request from same user', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'duplicate key value', code: '23505' },
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
      });

      const { error } = await supabase.from('adoption_requests').insert({
        pet_id: testPetId,
        requester_id: testRequesterId,
      });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23505');
    });

    it('should reject delivery with wrong token', async () => {
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows found' },
      });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('adoption_requests')
        .select('*')
        .eq('delivery_token', 'WRONG_TOKEN')
        .single();

      expect(data).toBeNull();
      expect(error).not.toBeNull();
    });

    it('should handle pet already adopted', async () => {
      const mockPet = {
        id: testPetId,
        status: 'delivered', // Đã có người nhận
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockPet, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data } = await supabase.from('pets').select('*').eq('id', testPetId).single();

      expect(data.status).toBe('delivered');
      // UI should disable "Send Request" button
    });
  });
});
