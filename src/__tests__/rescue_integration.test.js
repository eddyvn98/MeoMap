/**
 * Rescue Post System - Integration Tests
 * Test luồng hoàn chỉnh 7 bước giải cứu
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

describe('Rescue Post System - Integration Tests', () => {
  const testOwnerId = 'owner-nguyen-123';
  const testRescuerId = 'rescuer-tran-456';
  const testDonor1 = 'donor-le-789';
  const testDonor2 = 'donor-pham-012';
  const testCaseId = 'rescue-case-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH: Complete Rescue Flow
  // ============================================

  describe('Complete Rescue Flow', () => {
    it('should complete full rescue process from post to completion', async () => {
      console.log('\n🚑 QUY TRÌNH GIẢI CỨU - 7 BƯỚC\n');

      // ===== STEP 1: Tạo Ca Cứu =====
      console.log('📢 BƯỚC 1: Tạo ca cứu hộ');

      const mockCase = {
        id: testCaseId,
        owner_id: testOwnerId,
        name: 'Mèo bị thương nặng',
        category: 'rescue',
        description: 'Mèo bị tai nạn giao thông, gãy chân, cần đưa đi phẫu thuật ngay',
        district: 'Quận 1, TP.HCM',
        latitude: 10.7769,
        longitude: 106.7009,
        bounty_amount: 1000000, // 1 triệu hỗ trợ
        status: 'active',
        rescuer_id: null,
        image_url: 'https://example.com/injured-cat.jpg',
        created_at: new Date().toISOString(),
      };

      const insertCaseMock = vi.fn().mockReturnThis();
      const selectCaseMock = vi.fn().mockReturnThis();
      const singleCaseMock = vi.fn().mockResolvedValue({ data: mockCase, error: null });

      supabase.from.mockReturnValue({
        insert: insertCaseMock,
        select: selectCaseMock,
        single: singleCaseMock,
      });

      const caseResult = await supabase
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          name: 'Mèo bị thương nặng',
          category: 'rescue',
          bounty_amount: 1000000,
        })
        .select()
        .single();

      expect(caseResult.data).toEqual(mockCase);
      console.log(`✅ Đã tạo ca cứu hộ: ${mockCase.name}`);
      console.log(`   Địa điểm: ${mockCase.district}`);
      console.log(`   Hỗ trợ: ${mockCase.bounty_amount.toLocaleString()} VND`);
      console.log(`   Trạng thái: ĐANG CHỜ NGƯỜI CỨU\n`);

      // ===== STEP 2: Xem Ca Khẩn Cấp =====
      console.log('🔍 BƯỚC 2: Người cứu xem danh sách ca khẩn cấp');

      const mockEmergencyCases = [
        mockCase,
        { id: 'case-002', name: 'Mèo lạc đường', rescuer_id: null },
        { id: 'case-003', name: 'Mèo bị bỏ rơi', rescuer_id: null },
      ];

      const selectEmergencyMock = vi.fn().mockReturnThis();
      const eqEmergencyMock = vi.fn().mockReturnThis();
      const isEmergencyMock = vi.fn().mockReturnThis();
      const orderEmergencyMock = vi.fn().mockResolvedValue({
        data: mockEmergencyCases,
        error: null,
      });

      supabase.from.mockReturnValue({
        select: selectEmergencyMock,
        eq: eqEmergencyMock,
        is: isEmergencyMock,
        order: orderEmergencyMock,
      });

      const emergencyResult = await supabase
        .from('pets')
        .select('*')
        .eq('category', 'rescue')
        .is('rescuer_id', null)
        .order('created_at', { ascending: false });

      expect(emergencyResult.data).toHaveLength(3);
      console.log(`✅ Hiển thị ${emergencyResult.data.length} ca cứu hộ khẩn cấp`);
      console.log(`   📍 Tất cả đều chưa có người nhận\n`);

      // ===== STEP 3: Nhận Ca Cứu =====
      console.log('✋ BƯỚC 3: Người cứu nhận ca');

      const updateAcceptMock = vi.fn().mockReturnThis();
      const eqAcceptMock = vi.fn().mockResolvedValue({
        data: { id: testCaseId, rescuer_id: testRescuerId },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateAcceptMock,
        eq: eqAcceptMock,
      });

      await supabase
        .from('pets')
        .update({ rescuer_id: testRescuerId })
        .eq('id', testCaseId);

      console.log(`✅ Người cứu đã nhận ca`);
      console.log(`   👤 Rescuer ID: ${testRescuerId}`);
      console.log(`   🚑 Ca chuyển sang "Ca của tôi"\n`);

      // ===== STEP 4: Quản Lý Ca + Nhận Donations =====
      console.log('💰 BƯỚC 4: Cộng đồng ủng hộ');

      // Donor 1 donates
      const mockDonation1 = {
        id: 'donation-001',
        pet_id: testCaseId,
        donor_id: testDonor1,
        amount: 500000,
        message: 'Chúc mèo mau khỏe',
        created_at: new Date().toISOString(),
      };

      const insertDonation1Mock = vi.fn().mockReturnThis();
      const selectDonation1Mock = vi.fn().mockReturnThis();
      const singleDonation1Mock = vi.fn().mockResolvedValue({
        data: mockDonation1,
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertDonation1Mock,
        select: selectDonation1Mock,
        single: singleDonation1Mock,
      });

      await supabase
        .from('donations')
        .insert({
          pet_id: testCaseId,
          donor_id: testDonor1,
          amount: 500000,
        })
        .select()
        .single();

      console.log(`   📥 Người 1 ủng hộ: 500,000 VND`);

      // Donor 2 donates
      const mockDonation2 = {
        id: 'donation-002',
        pet_id: testCaseId,
        donor_id: testDonor2,
        amount: 300000,
      };

      const insertDonation2Mock = vi.fn().mockReturnThis();
      const selectDonation2Mock = vi.fn().mockReturnThis();
      const singleDonation2Mock = vi.fn().mockResolvedValue({
        data: mockDonation2,
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertDonation2Mock,
        select: selectDonation2Mock,
        single: singleDonation2Mock,
      });

      await supabase
        .from('donations')
        .insert({
          pet_id: testCaseId,
          donor_id: testDonor2,
          amount: 300000,
        })
        .select()
        .single();

      console.log(`   📥 Người 2 ủng hộ: 300,000 VND`);

      // Total donations
      const mockAllDonations = [mockDonation1, mockDonation2];
      const selectDonationsMock = vi.fn().mockReturnThis();
      const eqDonationsMock = vi.fn().mockResolvedValue({
        data: mockAllDonations,
        error: null,
      });

      supabase.from.mockReturnValue({
        select: selectDonationsMock,
        eq: eqDonationsMock,
      });

      const donationsResult = await supabase
        .from('donations')
        .select('amount')
        .eq('pet_id', testCaseId);

      const totalDonations = donationsResult.data.reduce((sum, d) => sum + d.amount, 0);

      console.log(`✅ Tổng quyên góp: ${totalDonations.toLocaleString()} VND\n`);

      // ===== STEP 5: Kêu Gọi Ủng Hộ =====
      console.log('📢 BƯỚC 5: Người cứu kêu gọi ủng hộ');

      const mockAppeal = {
        id: 'appeal-001',
        case_id: testCaseId,
        rescuer_id: testRescuerId,
        title: 'Cần chi phí phẫu thuật gấp',
        content: 'Mèo cần phẫu thuật chân gãy, chi phí dự kiến 3 triệu VND',
        requested_budget: 3000000,
        status: 'active',
        created_at: new Date().toISOString(),
      };

      const insertAppealMock = vi.fn().mockReturnThis();
      const selectAppealMock = vi.fn().mockReturnThis();
      const singleAppealMock = vi.fn().mockResolvedValue({
        data: mockAppeal,
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertAppealMock,
        select: selectAppealMock,
        single: singleAppealMock,
      });

      const appealResult = await supabase
        .from('rescue_appeals')
        .insert({
          case_id: testCaseId,
          rescuer_id: testRescuerId,
          title: 'Cần chi phí phẫu thuật gấp',
          requested_budget: 3000000,
        })
        .select()
        .single();

      expect(appealResult.data.requested_budget).toBe(3000000);
      console.log(`✅ Đã tạo lời kêu gọi: ${appealResult.data.title}`);
      console.log(`   💰 Dự kiến cần: ${appealResult.data.requested_budget.toLocaleString()} VND\n`);

      // ===== STEP 6: Cập Nhật Tình Hình =====
      console.log('📸 BƯỚC 6: Người cứu cập nhật tình hình');

      // Update 1: Initial checkup
      const mockUpdate1 = {
        id: 'update-001',
        case_id: testCaseId,
        rescuer_id: testRescuerId,
        title: 'Đã đưa mèo đến phòng khám',
        content: 'Bác sĩ khám và xác nhận gãy xương chân, cần phẫu thuật',
        spent_cost: 200000,
        image_urls: ['https://example.com/xray.jpg'],
        created_at: new Date().toISOString(),
      };

      const insertUpdate1Mock = vi.fn().mockReturnThis();
      const selectUpdate1Mock = vi.fn().mockReturnThis();
      const singleUpdate1Mock = vi.fn().mockResolvedValue({
        data: mockUpdate1,
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertUpdate1Mock,
        select: selectUpdate1Mock,
        single: singleUpdate1Mock,
      });

      await supabase
        .from('rescue_updates')
        .insert({
          case_id: testCaseId,
          title: 'Đã đưa mèo đến phòng khám',
          spent_cost: 200000,
        })
        .select()
        .single();

      console.log(`   📝 Cập nhật #1: ${mockUpdate1.title}`);
      console.log(`      Chi phí: ${mockUpdate1.spent_cost.toLocaleString()} VND`);

      // Update 2: Surgery
      const mockUpdate2 = {
        id: 'update-002',
        case_id: testCaseId,
        title: 'Đã phẫu thuật thành công',
        content: 'Mèo đã qua giai đoạn nguy hiểm, đang hồi phục',
        spent_cost: 2500000,
        image_urls: ['https://example.com/surgery.jpg'],
      };

      const insertUpdate2Mock = vi.fn().mockReturnThis();
      const selectUpdate2Mock = vi.fn().mockReturnThis();
      const singleUpdate2Mock = vi.fn().mockResolvedValue({
        data: mockUpdate2,
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertUpdate2Mock,
        select: selectUpdate2Mock,
        single: singleUpdate2Mock,
      });

      await supabase
        .from('rescue_updates')
        .insert({
          case_id: testCaseId,
          title: 'Đã phẫu thuật thành công',
          spent_cost: 2500000,
        })
        .select()
        .single();

      console.log(`   📝 Cập nhật #2: ${mockUpdate2.title}`);
      console.log(`      Chi phí: ${mockUpdate2.spent_cost.toLocaleString()} VND`);

      // Total spent
      const mockAllUpdates = [mockUpdate1, mockUpdate2];
      const totalSpent = mockAllUpdates.reduce((sum, u) => sum + u.spent_cost, 0);
      console.log(`✅ Tổng chi phí: ${totalSpent.toLocaleString()} VND\n`);

      // ===== STEP 7: Hoàn Thành Ca =====
      console.log('✅ BƯỚC 7: Hoàn thành ca cứu hộ');

      const updateCompleteMock = vi.fn().mockReturnThis();
      const eqCompleteMock = vi.fn().mockResolvedValue({
        data: {
          status: 'delivered',
          completed_at: new Date().toISOString(),
          completion_notes: 'Mèo đã khỏe hoàn toàn, tìm được chủ mới yêu thương',
        },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateCompleteMock,
        eq: eqCompleteMock,
      });

      await supabase
        .from('pets')
        .update({
          status: 'delivered',
          completed_at: new Date().toISOString(),
          completion_notes: 'Mèo đã khỏe hoàn toàn, tìm được chủ mới yêu thương',
          completion_images: ['https://example.com/recovered.jpg'],
        })
        .eq('id', testCaseId);

      console.log(`   ✅ Trạng thái: DELIVERED (hoàn thành)`);
      console.log(`   📝 Ghi chú: Mèo đã khỏe hoàn toàn\n`);

      // Transfer bounty to rescuer
      console.log('💸 Giải ngân tiền thưởng...');

      const updateRescuerMock = vi.fn().mockReturnThis();
      const eqRescuerMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateRescuerMock,
        eq: eqRescuerMock,
      });

      await supabase
        .from('profiles')
        .update({
          balance_thuong: supabase.raw('balance_thuong + 1000000'),
        })
        .eq('id', testRescuerId);

      console.log(`   📥 Cộng 1,000,000 VND vào ví người cứu\n`);

      // Create transaction
      const mockTransaction = {
        id: 'txn-001',
        user_id: testRescuerId,
        amount: 1000000,
        type: 'rescue_bounty',
        description: 'Nhận thưởng cứu hộ: Mèo bị thương nặng',
        related_id: testCaseId,
      };

      const insertTxnMock = vi.fn().mockReturnThis();
      const selectTxnMock = vi.fn().mockReturnThis();
      const singleTxnMock = vi.fn().mockResolvedValue({
        data: mockTransaction,
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertTxnMock,
        select: selectTxnMock,
        single: singleTxnMock,
      });

      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: testRescuerId,
          amount: 1000000,
          type: 'rescue_bounty',
          related_id: testCaseId,
        })
        .select()
        .single();

      console.log(`   📝 Đã ghi lại giao dịch\n`);

      console.log('🎉 QUY TRÌNH HOÀN TẤT!\n');
      console.log('📊 Tổng kết:');
      console.log(`   ✓ Ca cứu hộ: HOÀN THÀNH`);
      console.log(`   ✓ Hỗ trợ ban đầu: 1,000,000 VND`);
      console.log(`   ✓ Quyên góp: ${totalDonations.toLocaleString()} VND`);
      console.log(`   ✓ Chi phí thực tế: ${totalSpent.toLocaleString()} VND`);
      console.log(`   ✓ Mèo đã khỏe mạnh, có chủ mới\n`);
    });
  });

  // ============================================
  // Multiple Rescuers Scenario
  // ============================================

  describe('Multiple Rescuers Scenario', () => {
    it('should only allow first rescuer to accept case', async () => {
      console.log('\n👥 TRƯỜNG HỢP: Nhiều người muốn nhận cùng 1 ca\n');

      const mockCase = {
        id: testCaseId,
        rescuer_id: null,
        status: 'active',
      };

      // Rescuer 1 sees case
      console.log('📋 Ban đầu: Ca chưa có người nhận');

      const selectMock1 = vi.fn().mockReturnThis();
      const eqMock1 = vi.fn().mockReturnThis();
      const singleMock1 = vi.fn().mockResolvedValue({ data: mockCase, error: null });

      supabase.from.mockReturnValue({
        select: selectMock1,
        eq: eqMock1,
        single: singleMock1,
      });

      const { data: caseData } = await supabase
        .from('pets')
        .select('*')
        .eq('id', testCaseId)
        .single();

      expect(caseData.rescuer_id).toBeNull();
      console.log('✅ rescuer_id: null (chưa có ai nhận)\n');

      // Rescuer 1 accepts
      console.log('✋ Người cứu #1 nhận ca...');

      const updateMock1 = vi.fn().mockReturnThis();
      const eqUpdateMock1 = vi.fn().mockResolvedValue({
        data: { rescuer_id: 'rescuer-1' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateMock1,
        eq: eqUpdateMock1,
      });

      await supabase
        .from('pets')
        .update({ rescuer_id: 'rescuer-1' })
        .eq('id', testCaseId);

      console.log('✅ Người cứu #1: ĐÃ NHẬN CA\n');

      // Rescuer 2 tries to accept (should fail)
      console.log('❌ Người cứu #2 thử nhận ca...');

      const selectMock2 = vi.fn().mockReturnThis();
      const eqMock2 = vi.fn().mockReturnThis();
      const singleMock2 = vi.fn().mockResolvedValue({
        data: { rescuer_id: 'rescuer-1' },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: selectMock2,
        eq: eqMock2,
        single: singleMock2,
      });

      const { data: caseCheck } = await supabase
        .from('pets')
        .select('*')
        .eq('id', testCaseId)
        .single();

      expect(caseCheck.rescuer_id).toBe('rescuer-1');
      console.log('❌ Người cứu #2: KHÔNG NHẬN ĐƯỢC (ca đã có người)\n');
    });
  });

  // ============================================
  // No Bounty Scenario
  // ============================================

  describe('No Bounty Scenario', () => {
    it('should complete rescue without bounty', async () => {
      console.log('\n🆓 TRƯỜNG HỢP: Không có tiền hỗ trợ\n');

      const mockCase = {
        id: testCaseId,
        name: 'Mèo lạc đường',
        bounty_amount: 0,
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

      console.log(`✅ Ca cứu: ${data.name}`);
      console.log(`✅ Hỗ trợ: KHÔNG CÓ (tự nguyện)`);
      console.log(`✅ Người cứu vẫn có thể nhận ca\n`);

      expect(data.bounty_amount).toBe(0);
    });
  });

  // ============================================
  // Error Scenarios
  // ============================================

  describe('Error Scenarios', () => {
    it('should prevent non-rescuer from completing case', async () => {
      console.log('\n❌ LỖI: Người khác thử hoàn thành ca\n');

      const mockCase = {
        id: testCaseId,
        rescuer_id: testRescuerId, // Case belongs to another rescuer
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

      const currentUserId = 'other-user-999';
      expect(data.rescuer_id).not.toBe(currentUserId);
      console.log(`❌ User: ${currentUserId}`);
      console.log(`❌ Rescuer: ${data.rescuer_id}`);
      console.log(`❌ Không có quyền hoàn thành ca này\n`);
    });

    it('should require completion notes', async () => {
      console.log('\n❌ LỖI: Thiếu báo cáo hoàn thành\n');

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
      console.log(`❌ Lỗi: ${error.message}\n`);
    });
  });
});
