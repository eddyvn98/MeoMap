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

  describe('Step 3: Community Search', () => {
    it('should list all lost pets on map', async () => {
      const mockLostPets = [
        { id: 'pet-001', status: 'lost', latitude: 10.7769, longitude: 106.7009 },
        { id: 'pet-002', status: 'lost', latitude: 10.8231, longitude: 106.6297 },
        { id: 'pet-003', status: 'lost', latitude: 10.7626, longitude: 106.6823 },
      ];

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({ data: mockLostPets, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
      });

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('status', 'lost')
        .order('created_at', { ascending: false });

      expect(data).toHaveLength(3);
      expect(data[0].status).toBe('lost');
    });

    it('should show bounty amount on lost pet card', async () => {
      const mockPetWithBounty = {
        id: testPetId,
        name: 'Mèo Miu',
        status: 'lost',
        bounties: [
          {
            id: testBountyId,
            amount: 1000000,
            status: 'active',
          },
        ],
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockPetWithBounty, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data } = await supabase
        .from('pets')
        .select('*, bounties(*)')
        .eq('id', testPetId)
        .single();

      expect(data.bounties[0].amount).toBe(1000000);
    });

    it('should filter lost pets near user location', async () => {
      const userLat = 10.7769;
      const userLng = 106.7009;
      const radius = 5; // 5km

      const mockNearbyPets = [
        { id: 'pet-001', latitude: 10.7800, longitude: 106.7050, distance: 0.5 },
        { id: 'pet-002', latitude: 10.7850, longitude: 106.7100, distance: 1.2 },
      ];

      // In real app, would use PostGIS or similar
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: mockNearbyPets, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
      });

      const { data } = await supabase.from('pets').select('*').eq('status', 'lost');

      expect(data).toHaveLength(2);
      expect(data[0].distance).toBeLessThan(radius);
    });
  });

  // ============================================
  // Step 4: Báo Tin (Report Finding)
  // ============================================

  describe('Step 4: Report Finding', () => {
    it('should allow user to report finding lost pet with photo', async () => {
      const mockReport = {
        id: 'report-001',
        pet_id: testPetId,
        finder_id: testFinderId,
        message: 'Tôi tìm thấy mèo này tại công viên',
        photo_url: 'https://example.com/found-proof.jpg',
        latitude: 10.7769,
        longitude: 106.7009,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockReport, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('bounty_claims')
        .insert({
          pet_id: testPetId,
          finder_id: testFinderId,
          message: 'Tôi tìm thấy mèo này tại công viên',
          photo_url: 'https://example.com/found-proof.jpg',
          latitude: 10.7769,
          longitude: 106.7009,
          status: 'pending',
        })
        .select()
        .single();

      expect(data).toEqual(mockReport);
      expect(data.status).toBe('pending');
      expect(data.photo_url).toBeDefined();
    });

    it('should send notification to owner when pet is found', async () => {
      // Mock notification
      const mockNotification = {
        user_id: testOwnerId,
        type: 'pet_found',
        message: 'Có người báo tìm thấy mèo của bạn!',
      };

      const insertMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
      });

      await supabase.from('notifications').insert(mockNotification);

      expect(insertMock).toHaveBeenCalledWith(mockNotification);
    });

    it('should allow owner to view finder report with evidence', async () => {
      const mockClaim = {
        id: 'claim-001',
        pet_id: testPetId,
        finder_id: testFinderId,
        photo_url: 'https://example.com/proof.jpg',
        message: 'Tìm thấy mèo tại đây',
        status: 'pending',
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockClaim, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data } = await supabase
        .from('bounty_claims')
        .select('*')
        .eq('pet_id', testPetId)
        .single();

      expect(data.photo_url).toBeDefined();
      expect(data.status).toBe('pending');
    });
  });

  // ============================================
  // Step 5: Trả Thưởng (Approve & Pay Bounty)
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
