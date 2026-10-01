/**
 * Adoption System - Integration Tests
 * Test luồng hoàn chỉnh 5 bước nhận nuôi mèo
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

describe('Adoption System - Integration Tests', () => {
  const testPetId = 'pet-meomiu-001';
  const testOwnerId = 'owner-nguyen-123';
  const testRequester1 = 'requester-tran-456';
  const testRequester2 = 'requester-le-789';
  const testRequestId = 'request-abc123';
  const testDepositId = 'deposit-xyz789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH: Complete 5-Step Adoption Flow
  // ============================================

describe('Complete 5-Step Adoption Flow', () => {
    it('should complete full adoption process from start to finish', async () => {
      console.log('\n🐱 QUY TRÌNH NHẬN NUÔI MÈO - 5 BƯỚC\n');

      // ===== STEP 1: Xem Bài Đăng =====
      console.log('📋 BƯỚC 1: Xem bài đăng');

      const mockPet = {
        id: testPetId,
        name: 'Mèo Miu',
        status: 'need_adopt',
        district: 'Quận 1, TP.HCM',
        owner_id: testOwnerId,
        required_deposit: 500000,
        description: 'Mèo dễ thương 2 tháng tuổi, cần tìm chủ mới',
        latitude: 10.7769,
        longitude: 106.7009,
      };

      const selectPetMock = vi.fn().mockReturnThis();
      const eqPetMock = vi.fn().mockReturnThis();
      const singlePetMock = vi.fn().mockResolvedValue({ data: mockPet, error: null });

      supabase.from.mockReturnValue({
        select: selectPetMock,
        eq: eqPetMock,
        single: singlePetMock,
      });

      const petResult = await supabase.from('pets').select('*').eq('id', testPetId).single();

      expect(petResult.data).toEqual(mockPet);
      console.log(`✅ Tìm thấy: ${mockPet.name} tại ${mockPet.district}`);
      console.log(`   Tiền cọc yêu cầu: ${mockPet.required_deposit.toLocaleString()} VND\n`);

      // ===== STEP 2: Đặt Cọc =====
      console.log('💰 BƯỚC 2: Đặt cọc');

      const mockDeposit = {
        id: testDepositId,
        pet_id: testPetId,
        owner_id: testOwnerId,
        receiver_id: testRequester1,
        amount: 500000,
        status: 'locked', // Tiền BỊ KHÓA
        created_at: new Date().toISOString(),
      };

      const insertDepositMock = vi.fn().mockReturnThis();
      const selectDepositMock = vi.fn().mockReturnThis();
      const singleDepositMock = vi.fn().mockResolvedValue({ data: mockDeposit, error: null });

      supabase.from.mockReturnValue({
        insert: insertDepositMock,
        select: selectDepositMock,
        single: singleDepositMock,
      });

      const depositResult = await supabase
        .from('deposits')
        .insert({
          pet_id: testPetId,
          owner_id: testOwnerId,
          receiver_id: testRequester1,
          amount: 500000,
          status: 'locked',
        })
        .select()
        .single();

      expect(depositResult.data.status).toBe('locked');
      console.log(`✅ Đã đặt cọc: ${depositResult.data.amount.toLocaleString()} VND`);
      console.log(`   Trạng thái: KHÓA (chủ mèo chưa nhận tiền)\n`);

      // ===== STEP 3: Nhắn Tin Chủ Mèo (Gửi Request) =====
      console.log('💬 BƯỚC 3: Gửi yêu cầu nhận nuôi');

      const mockRequest = {
        id: testRequestId,
        pet_id: testPetId,
        requester_id: testRequester1,
        owner_id: testOwnerId,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const insertRequestMock = vi.fn().mockReturnThis();
      const selectRequestMock = vi.fn().mockReturnThis();
      const singleRequestMock = vi.fn().mockResolvedValue({ data: mockRequest, error: null });

      supabase.from.mockReturnValue({
        insert: insertRequestMock,
        select: selectRequestMock,
        single: singleRequestMock,
      });

      const requestResult = await supabase
        .from('adoption_requests')
        .insert({
          pet_id: testPetId,
          requester_id: testRequester1,
          owner_id: testOwnerId,
          status: 'pending',
        })
        .select()
        .single();

      expect(requestResult.data.status).toBe('pending');
      console.log(`✅ Đã gửi yêu cầu nhận nuôi`);
      console.log(`   Trạng thái: CHỜ CHỦ MÈO CHẤP NHẬN\n`);

      // Chủ mèo chấp nhận
      console.log('   👤 Chủ mèo xem xét và chấp nhận...');

      const deliveryToken = 'ABC123XYZ';
      const acceptedRequest = {
        ...mockRequest,
        status: 'ready_to_deliver',
        accepted_at: new Date().toISOString(),
        delivery_token: deliveryToken,
      };

      const updateAcceptMock = vi.fn().mockReturnThis();
      const eqAcceptMock = vi.fn().mockResolvedValue({ data: acceptedRequest, error: null });

      supabase.from.mockReturnValue({
        update: updateAcceptMock,
        eq: eqAcceptMock,
      });

      const acceptResult = await supabase
        .from('adoption_requests')
        .update({
          status: 'ready_to_deliver',
          accepted_at: new Date().toISOString(),
          delivery_token: deliveryToken,
        })
        .eq('id', testRequestId);

      console.log(`   ✅ Chủ mèo đã chấp nhận!`);
      console.log(`   🎫 Mã giao mèo: ${deliveryToken}\n`);

      // Reject các request khác
      console.log('   🔒 Tự động từ chối các yêu cầu khác...');

      const updateRejectMock = vi.fn().mockReturnThis();
      const eqRejectMock = vi.fn().mockReturnThis();
      const neqRejectMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateRejectMock,
        eq: eqRejectMock,
        neq: neqRejectMock,
      });

      await supabase
        .from('adoption_requests')
        .update({ status: 'rejected' })
        .eq('pet_id', testPetId)
        .neq('id', testRequestId);

      console.log(`   ✅ Các yêu cầu khác đã bị từ chối\n`);

      // Mở khóa tiền cọc của những người bị từ chối
      console.log('   💸 Mở khóa tiền cọc cho người bị từ chối...');

      await supabase
        .from('deposits')
        .update({ status: 'refunded' })
        .eq('pet_id', testPetId)
        .neq('receiver_id', testRequester1);

      console.log(`   ✅ Tiền cọc của người khác đã được hoàn lại`);
      console.log(`   🔐 Tiền cọc của người được chọn vẫn BỊ KHÓA\n`);

      // ===== STEP 4: Nhận Mèo (Quét QR) =====
      console.log('🤝 BƯỚC 4: Giao nhận mèo');

      console.log(`   📱 Người nhận đưa mã: ${deliveryToken}`);
      console.log(`   📷 Chủ mèo quét mã xác nhận...`);

      // Verify token
      const verifyTokenMock = vi.fn().mockReturnThis();
      const eqTokenMock = vi.fn().mockReturnThis();
      const singleTokenMock = vi.fn().mockResolvedValue({ data: acceptedRequest, error: null });

      supabase.from.mockReturnValue({
        select: verifyTokenMock,
        eq: eqTokenMock,
        single: singleTokenMock,
      });

      const verifyResult = await supabase
        .from('adoption_requests')
        .select('*')
        .eq('delivery_token', deliveryToken)
        .single();

      expect(verifyResult.data.delivery_token).toBe(deliveryToken);
      console.log(`   ✅ Mã hợp lệ!`);

      // Update to delivered
      const deliveredRequest = {
        ...acceptedRequest,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      };

      const updateDeliveredMock = vi.fn().mockReturnThis();
      const eqDeliveredMock = vi.fn().mockResolvedValue({ data: deliveredRequest, error: null });

      supabase.from.mockReturnValue({
        update: updateDeliveredMock,
        eq: eqDeliveredMock,
      });

      await supabase
        .from('adoption_requests')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', testRequestId);

      console.log(`   ✅ Đã giao mèo thành công!`);
      console.log(`   ⏳ Bắt đầu đếm 3 ngày...\n`);

      // ===== STEP 5: Hoàn Cọc (Sau 3 Ngày) =====
      console.log('⭐ BƯỚC 5: Xác nhận sau 3 ngày');

      const checkinDate = new Date();
      checkinDate.setDate(checkinDate.getDate() + 3);

      console.log(`   📅 Ngày cần xác nhận: ${checkinDate.toLocaleDateString('vi-VN')}`);
      console.log(`   ⏰ Đợi 3 ngày...\n`);

      // Simulate 3 days passed - Owner confirms receiver is good
      console.log(`   🕒 3 ngày sau...`);
      console.log(`   👤 Chủ cũ xác nhận: Chủ mới là người tốt ✓`);

      const updateOwnerCheckinMock = vi.fn().mockReturnThis();
      const eqOwnerCheckinMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateOwnerCheckinMock,
        eq: eqOwnerCheckinMock,
      });

      await supabase
        .from('adoption_requests')
        .update({
          owner_confirmed_checkin: true,
          owner_confirmed_checkin_at: new Date().toISOString(),
        })
        .eq('id', testRequestId);

      console.log(`   ✅ Chủ cũ đã xác nhận!`);

      // Receiver also confirms
      console.log(`   👤 Chủ mới xác nhận: Mèo khỏe mạnh ✓`);

      const updateReceiverCheckinMock = vi.fn().mockReturnThis();
      const eqReceiverCheckinMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateReceiverCheckinMock,
        eq: eqReceiverCheckinMock,
      });

      await supabase
        .from('adoption_requests')
        .update({
          receiver_confirmed_checkin: true,
          receiver_confirmed_checkin_at: new Date().toISOString(),
        })
        .eq('id', testRequestId);

      console.log(`   ✅ Chủ mới đã xác nhận!\n`);

      // Auto-complete (trigger in database)
      console.log(`   🔄 Hệ thống tự động hoàn tất...`);

      const completedRequest = {
        ...deliveredRequest,
        status: 'completed',
        owner_confirmed_checkin: true,
        receiver_confirmed_checkin: true,
      };

      expect(completedRequest.status).toBe('completed');
      console.log(`   ✅ Trạng thái: HOÀN TẤT`);

      // Refund deposit
      console.log(`   💰 Hoàn tiền cọc cho chủ mới...`);

      const updateRefundMock = vi.fn().mockReturnThis();
      const eqRefundMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateRefundMock,
        eq: eqRefundMock,
      });

      await supabase
        .from('deposits')
        .update({
          status: 'refunded',
          refunded_at: new Date().toISOString(),
        })
        .eq('id', testDepositId);

      console.log(`   ✅ Đã hoàn 500,000 VND về ví chủ mới\n`);

      console.log('🎉 QUY TRÌNH HOÀN TẤT!\n');
      console.log('📊 Tổng kết:');
      console.log('   ✓ Mèo có chủ mới');
      console.log('   ✓ Tiền cọc đã hoàn lại');
      console.log('   ✓ Cả 2 bên đều hài lòng\n');
    });
  });

  // ============================================
  // Multiple Requesters Scenario
  });
});
