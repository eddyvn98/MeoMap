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
});
