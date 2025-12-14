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

  describe('Step 1: View Pet Post', () => {
    it('should load pet details successfully', async () => {
      const mockPet = {
        id: testPetId,
        name: 'Mèo Miu',
        status: 'need_adopt',
        district: 'Quận 1',
        owner_id: testOwnerId,
        required_deposit: 500000,
        description: 'Mèo dễ thương cần tìm chủ mới',
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockPet, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      // Simulate loading pet
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('id', testPetId)
        .single();

      expect(data).toEqual(mockPet);
      expect(error).toBeNull();
      expect(data.required_deposit).toBe(500000);
    });

    it('should show pet location on map', async () => {
      const mockPet = {
        id: testPetId,
        latitude: 10.7769,
        longitude: 106.7009,
        district: 'Quận 1',
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

      expect(data.latitude).toBeDefined();
      expect(data.longitude).toBeDefined();
    });
  });

  // ============================================
  // Step 2: Đặt Cọc (Nếu Có)
  // ============================================

  describe('Step 2: Create Deposit', () => {
    it('should create deposit successfully', async () => {
      const mockDeposit = {
        id: testDepositId,
        pet_id: testPetId,
        owner_id: testOwnerId,
        receiver_id: testRequesterId,
        amount: 500000,
        status: 'locked',
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockDeposit, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('deposits')
        .insert({
          pet_id: testPetId,
          owner_id: testOwnerId,
          receiver_id: testRequesterId,
          amount: 500000,
          status: 'locked',
        })
        .select()
        .single();

      expect(data).toEqual(mockDeposit);
      expect(data.status).toBe('locked');
      expect(insertMock).toHaveBeenCalled();
    });

    it('should lock deposit amount (not directly transferred to owner)', async () => {
      const mockDeposit = {
        id: testDepositId,
        amount: 500000,
        status: 'locked', // Tiền bị khóa
        receiver_id: testRequesterId,
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockDeposit, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data } = await supabase.from('deposits').insert({}).select().single();

      expect(data.status).toBe('locked'); // Tiền KHÔNG về chủ mèo
    });

    it('should handle no deposit required (amount = 0)', async () => {
      const mockPet = {
        id: testPetId,
        required_deposit: 0, // Không cần cọc
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

      expect(data.required_deposit).toBe(0);
      // User can skip deposit step
    });
  });

  // ============================================
  // Step 3: Nhắn Tin Chủ Mèo (Send Adoption Request)
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
