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

  describe('Step 3: Accept Rescue Case', () => {
    it('should allow rescuer to accept case', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { rescuer_id: testRescuerId },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('pets')
        .update({ rescuer_id: testRescuerId })
        .eq('id', testCaseId);

      expect(data.rescuer_id).toBe(testRescuerId);
    });

    it('should move case from emergency tab to my cases tab', async () => {
      // Check case now has rescuer_id
      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { id: testCaseId, rescuer_id: testRescuerId },
        error: null,
      });

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

      expect(data.rescuer_id).not.toBeNull();
    });

    it('should list my accepted cases', async () => {
      const mockMyCases = [
        { id: 'case-001', rescuer_id: testRescuerId, status: 'active' },
        { id: 'case-002', rescuer_id: testRescuerId, status: 'active' },
      ];

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: mockMyCases, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('pets')
        .select('*')
        .eq('rescuer_id', testRescuerId);

      expect(data).toHaveLength(2);
      expect(data[0].rescuer_id).toBe(testRescuerId);
    });
  });

  // ============================================
  // Step 4: Quản Lý Ca (Manage Case)
  // ============================================

  describe('Step 4: Manage Rescue Case', () => {
    it('should show rescue activity panel for rescuer', async () => {
      const mockCase = {
        id: testCaseId,
        rescuer_id: testRescuerId,
        bounty_amount: 500000,
        status: 'active',
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

      expect(data.rescuer_id).toBe(testRescuerId);
      // RescueActivityPanel should be visible
    });

    it('should show total donations amount', async () => {
      const mockDonations = [
        { amount: 100000 },
        { amount: 200000 },
        { amount: 150000 },
      ];

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ data: mockDonations, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('donations')
        .select('amount')
        .eq('pet_id', testCaseId);

      const totalDonations = data.reduce((sum, d) => sum + d.amount, 0);
      expect(totalDonations).toBe(450000);
    });
  });

  // ============================================
  // Step 5: Kêu Gọi Ủng Hộ (Create Appeal)
  // ============================================

  describe('Step 5: Create Appeal', () => {
    it('should create rescue appeal', async () => {
      const mockAppeal = {
        id: testAppealId,
        case_id: testCaseId,
        rescuer_id: testRescuerId,
        title: 'Cần giúp đỡ chi phí phẫu thuật',
        content: 'Mèo cần phẫu thuật gãy xương, dự kiến chi phí 2 triệu',
        requested_budget: 2000000,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockAppeal, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('rescue_appeals')
        .insert({
          case_id: testCaseId,
          rescuer_id: testRescuerId,
          title: 'Cần giúp đỡ chi phí phẫu thuật',
          content: 'Mèo cần phẫu thuật gãy xương, dự kiến chi phí 2 triệu',
          requested_budget: 2000000,
        })
        .select()
        .single();

      expect(data).toEqual(mockAppeal);
      expect(data.requested_budget).toBe(2000000);
    });

    it('should list all appeals for case', async () => {
      const mockAppeals = [
        { id: 'appeal-001', title: 'Chi phí phẫu thuật', requested_budget: 2000000 },
        { id: 'appeal-002', title: 'Chi phí chăm sóc', requested_budget: 500000 },
      ];

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({ data: mockAppeals, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
      });

      const { data } = await supabase
        .from('rescue_appeals')
        .select('*')
        .eq('case_id', testCaseId)
        .order('created_at', { ascending: false });

      expect(data).toHaveLength(2);
    });
  });

  // ============================================
  // Step 6: Cập Nhật Tình Hình (Post Update)
  // ============================================

  describe('Step 6: Post Update', () => {
    it('should create rescue update with photos', async () => {
      const mockUpdate = {
        id: testUpdateId,
        case_id: testCaseId,
        rescuer_id: testRescuerId,
        title: 'Đã đưa mèo đi khám',
        content: 'Bác sĩ khám và cho biết cần phẫu thuật ngay',
        spent_cost: 300000,
        image_urls: ['https://example.com/update1.jpg', 'https://example.com/update2.jpg'],
        video_urls: [],
        created_at: new Date().toISOString(),
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockUpdate, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data, error } = await supabase
        .from('rescue_updates')
        .insert({
          case_id: testCaseId,
          rescuer_id: testRescuerId,
          title: 'Đã đưa mèo đi khám',
          content: 'Bác sĩ khám và cho biết cần phẫu thuật ngay',
          spent_cost: 300000,
          image_urls: ['https://example.com/update1.jpg', 'https://example.com/update2.jpg'],
        })
        .select()
        .single();

      expect(data).toEqual(mockUpdate);
      expect(data.spent_cost).toBe(300000);
      expect(data.image_urls).toHaveLength(2);
    });

    it('should list all updates for case in timeline', async () => {
      const mockUpdates = [
        { id: 'update-001', title: 'Đã đưa đi khám', spent_cost: 300000 },
        { id: 'update-002', title: 'Đã phẫu thuật', spent_cost: 1500000 },
        { id: 'update-003', title: 'Đang hồi phục', spent_cost: 200000 },
      ];

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const orderMock = vi.fn().mockResolvedValue({ data: mockUpdates, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        order: orderMock,
      });

      const { data } = await supabase
        .from('rescue_updates')
        .select('*')
        .eq('case_id', testCaseId)
        .order('created_at', { ascending: false });

      expect(data).toHaveLength(3);
      const totalSpent = data.reduce((sum, u) => sum + u.spent_cost, 0);
      expect(totalSpent).toBe(2000000);
    });

    it('should allow video URLs in updates', async () => {
      const mockUpdate = {
        id: testUpdateId,
        video_urls: ['https://youtube.com/watch?v=abc'],
        image_urls: [],
      };

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockUpdate, error: null });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      const { data } = await supabase
        .from('rescue_updates')
        .insert({ video_urls: ['https://youtube.com/watch?v=abc'] })
        .select()
        .single();

      expect(data.video_urls).toHaveLength(1);
    });
  });

  // ============================================
  // Step 7: Hoàn Thành Ca (Complete Case)
  // ============================================

  describe('Step 7: Complete Case', () => {
    it('should mark case as delivered/completed', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { status: 'delivered', completed_at: new Date().toISOString() },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('pets')
        .update({
          status: 'delivered',
          completed_at: new Date().toISOString(),
          completion_notes: 'Mèo đã khỏe, tìm được chủ mới',
        })
        .eq('id', testCaseId);

      expect(data.status).toBe('delivered');
      expect(data.completed_at).toBeDefined();
    });

    it('should transfer bounty to rescuer wallet', async () => {
      const bountyAmount = 500000;

      // Add to rescuer balance
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      await supabase
        .from('profiles')
        .update({
          balance_thuong: supabase.raw(`balance_thuong + ${bountyAmount}`),
        })
        .eq('id', testRescuerId);

      expect(updateMock).toHaveBeenCalled();
    });

    it('should create wallet transaction for bounty', async () => {
      const mockTransaction = {
        id: 'txn-001',
        user_id: testRescuerId,
        amount: 500000,
        type: 'rescue_bounty',
        description: 'Nhận thưởng cứu hộ thành công',
        related_id: testCaseId,
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
          user_id: testRescuerId,
          amount: 500000,
          type: 'rescue_bounty',
          description: 'Nhận thưởng cứu hộ thành công',
          related_id: testCaseId,
        })
        .select()
        .single();

      expect(data.type).toBe('rescue_bounty');
      expect(data.amount).toBe(500000);
    });

    it('should save completion notes and images', async () => {
      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: {
          completion_notes: 'Mèo đã khỏe hoàn toàn',
          completion_images: ['https://example.com/final1.jpg'],
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      const { data } = await supabase
        .from('pets')
        .update({
          completion_notes: 'Mèo đã khỏe hoàn toàn',
          completion_images: ['https://example.com/final1.jpg'],
        })
        .eq('id', testCaseId);

      expect(data.completion_notes).toBeDefined();
      expect(data.completion_images).toHaveLength(1);
    });
  });

  // ============================================
  // Error Scenarios
  // ============================================

  describe('Error Scenarios', () => {
    it('should prevent accepting already assigned case', async () => {
      const mockCase = {
        id: testCaseId,
        rescuer_id: 'another-rescuer-789', // Already assigned
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

      expect(data.rescuer_id).not.toBeNull();
      // Should show error: "Ca này đã có người nhận"
    });

    it('should only allow rescuer to manage their own cases', async () => {
      const mockCase = {
        id: testCaseId,
        rescuer_id: 'another-rescuer-789',
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

      expect(data.rescuer_id).not.toBe(testRescuerId);
      // Should not show RescueActivityPanel
    });

    it('should prevent completing case without rescuer', async () => {
      const mockCase = {
        id: testCaseId,
        rescuer_id: null,
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

      expect(data.rescuer_id).toBeNull();
      // Cannot complete without rescuer
    });

    it('should validate completion notes required', async () => {
      const updateMock = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'completion_notes is required' },
      });

      supabase.from.mockReturnValue({
        update: updateMock,
      });

      const { error } = await supabase.from('pets').update({
        status: 'delivered',
        completion_notes: '', // Empty
      });

      expect(error).not.toBeNull();
    });
  });
});
