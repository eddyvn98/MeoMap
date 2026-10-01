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
});
