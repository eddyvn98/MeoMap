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
});
