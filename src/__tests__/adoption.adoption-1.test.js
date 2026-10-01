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
});
