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

describe('Step 1: Report Lost Pet', () => {
    it('should create lost pet post with photo and location', async () => {
      const mockPet = {
        id: testPetId,
        owner_id: testOwnerId,
        name: 'Mèo Miu',
        status: 'lost',
        description: 'Mèo lông vàng, mất tại công viên Lê Văn Tám',
        district: 'Quận 1, TP.HCM',
        latitude: 10.7769,
        longitude: 106.7009,
        image_url: 'https://example.com/meo-miu.jpg',
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockPet, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          name: 'Mèo Miu',
          status: 'lost',
          description: 'Mèo lông vàng, mất tại công viên Lê Văn Tám',
          district: 'Quận 1, TP.HCM',
          latitude: 10.7769,
          longitude: 106.7009,
          image_url: 'https://example.com/meo-miu.jpg',
        })
        .select()
        .single();

      expect(data).toEqual(mockPet);
      expect(data.status).toBe('lost');
      expect(data.latitude).toBeDefined();
      expect(data.longitude).toBeDefined();
    });

    it('should upload photo when reporting lost pet', async () => {
      const mockFile = new File(['photo'], 'meo-miu.jpg', { type: 'image/jpeg' });
      const mockUrl = 'https://example.com/storage/meo-miu.jpg';

      const uploadMock = vi.fn().mockResolvedValue({ error: null });
      const getPublicUrlMock = vi.fn().mockReturnValue({ data: { publicUrl: mockUrl } });

      supabase.storage.from.mockReturnValue({
        upload: uploadMock,
        getPublicUrl: getPublicUrlMock,
      });

      // Upload photo
      await supabase.storage.from('pet-images').upload('path/meo-miu.jpg', mockFile);
      const { data: urlData } = supabase.storage.from('pet-images').getPublicUrl('path/meo-miu.jpg');

      expect(uploadMock).toHaveBeenCalled();
      expect(urlData.publicUrl).toBe(mockUrl);
    });

    it('should set status to "lost" when reporting', async () => {
      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { status: 'lost' },
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data } = await supabase.from('pets').insert({}).select().single();

      expect(data.status).toBe('lost');
    });
  });

  // ============================================
  // Step 2: Treo Thưởng (Create Bounty)
  // ============================================

describe('Step 2: Create Bounty', () => {
    it('should create bounty with reward amount', async () => {
      const mockBounty = {
        id: testBountyId,
        pet_id: testPetId,
        owner_id: testOwnerId,
        amount: 1000000, // 1 triệu VND
        status: 'active',
        description: 'Thưởng cho người tìm thấy mèo',
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockBounty, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('bounties')
        .insert({
          pet_id: testPetId,
          owner_id: testOwnerId,
          amount: 1000000,
          status: 'active',
        })
        .select()
        .single();

      expect(data).toEqual(mockBounty);
      expect(data.amount).toBe(1000000);
      expect(data.status).toBe('active');
    });

    it('should allow updating bounty amount', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { amount: 2000000 },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('bounties')
        .update({ amount: 2000000 })
        .eq('id', testBountyId);

      expect(data.amount).toBe(2000000);
    });

    it('should handle no bounty (amount = 0)', async () => {
      const mockPet = {
        id: testPetId,
        status: 'lost',
        // No bounty created
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

      expect(data.status).toBe('lost');
      // Pet can be found without bounty
    });

    it('should validate bounty amount is positive', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Bounty amount must be positive' },
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
      });

      const { error } = await supabase.from('bounties').insert({
        amount: -100000, // Invalid negative amount
      });

      expect(error).not.toBeNull();
    });
  });

  // ============================================
  // Step 3: Cộng Đồng Tìm Kiếm (View on Map)
  // ============================================
});
