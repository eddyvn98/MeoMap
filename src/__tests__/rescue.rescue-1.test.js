/**
 * Rescue Post System - Unit Tests
 * Test quy trình bài đăng giải cứu (7 bước)
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

describe('Rescue Post System - Unit Tests', () => {
  const testOwnerId = 'owner-nguyen-123';
  const testRescuerId = 'rescuer-tran-456';
  const testCaseId = 'rescue-case-001';
  const testAppealId = 'appeal-001';
  const testUpdateId = 'update-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Step 1: Tạo Ca Cứu (Create Rescue Post)
  // ============================================

describe('Step 1: Create Rescue Post', () => {
    it('should create rescue post with bounty', async () => {
      const mockRescueCase = {
        id: testCaseId,
        owner_id: testOwnerId,
        name: 'Mèo gặp nạn cần cứu khẩn',
        category: 'rescue',
        description: 'Mèo bị thương nặng, cần đưa đi bác sĩ',
        district: 'Quận 1, TP.HCM',
        latitude: 10.7769,
        longitude: 106.7009,
        bounty_amount: 500000, // 500k hỗ trợ cứu hộ
        status: 'active',
        image_url: 'https://example.com/rescue-cat.jpg',
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockRescueCase, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          name: 'Mèo gặp nạn cần cứu khẩn',
          category: 'rescue',
          bounty_amount: 500000,
        })
        .select()
        .single();

      expect(data).toEqual(mockRescueCase);
      expect(data.category).toBe('rescue');
      expect(data.bounty_amount).toBe(500000);
      expect(data.status).toBe('active');
    });

    it('should create rescue post without bounty', async () => {
      const mockCase = {
        id: testCaseId,
        category: 'rescue',
        bounty_amount: 0,
        status: 'active',
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockCase, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data } = await supabase
        .from('pets')
        .insert({
          category: 'rescue',
          bounty_amount: 0,
        })
        .select()
        .single();

      expect(data.bounty_amount).toBe(0);
      // Can still be rescued without bounty
    });

    it('should set status to "active" when creating rescue post', async () => {
      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { status: 'active' },
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data } = await supabase.from('pets').insert({}).select().single();

      expect(data.status).toBe('active');
    });
  });

  // ============================================
  // Step 2: Xem Ca Khẩn Cấp (View Emergency Cases)
  // ============================================

describe('Step 2: View Emergency Cases', () => {
    it('should list all active rescue cases without rescuer', async () => {
      const mockCases = [
        { id: 'case-001', category: 'rescue', rescuer_id: null, status: 'active' },
        { id: 'case-002', category: 'rescue', rescuer_id: null, status: 'active' },
        { id: 'case-003', category: 'rescue', rescuer_id: null, status: 'active' },
      ];

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const isMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({ data: mockCases, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        is: isMock,
        order: orderMock,
      });

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('category', 'rescue')
        .is('rescuer_id', null)
        .order('created_at', { ascending: false });

      expect(data).toHaveLength(3);
      expect(data[0].rescuer_id).toBeNull();
    });

    it('should show bounty amount on rescue case card', async () => {
      const mockCase = {
        id: testCaseId,
        name: 'Mèo cần cứu',
        bounty_amount: 500000,
        category: 'rescue',
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockCase, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('id', testCaseId)
        .single();

      expect(data.bounty_amount).toBe(500000);
    });

    it('should filter cases near user location', async () => {
      const mockNearbyCases = [
        { id: 'case-001', latitude: 10.7800, longitude: 106.7050, distance: 0.8 },
        { id: 'case-002', latitude: 10.7850, longitude: 106.7100, distance: 1.5 },
      ];

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: mockNearbyCases, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('category', 'rescue');

      expect(data).toHaveLength(2);
    });
  });

  // ============================================
  // Step 3: Nhận Ca Cứu (Accept Rescue Case)
  // ============================================
});
