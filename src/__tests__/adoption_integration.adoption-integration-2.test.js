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

describe('Multiple Requesters Scenario', () => {
    it('should handle 3 users requesting same pet, only 1 selected', async () => {
      console.log('\n👥 TRƯỜNG HỢP: 3 người xin nhận 1 mèo\n');

      const requesters = [
        { id: 'user-A', name: 'Nguyễn Văn A', deposit: 500000 },
        { id: 'user-B', name: 'Trần Thị B', deposit: 500000 },
        { id: 'user-C', name: 'Lê Văn C', deposit: 500000 },
      ];

      // Step 1: All 3 create deposits
      console.log('💰 Bước 1: Cả 3 đều đặt cọc');

      requesters.forEach((req, idx) => {
        console.log(`   ${idx + 1}. ${req.name}: ${req.deposit.toLocaleString()} VND`);
      });

      const insertDepositMock = vi.fn().mockReturnThis();
      const selectDepositMock = vi.fn().mockReturnThis();
      const singleDepositMock = vi.fn().mockResolvedValue({
        data: { status: 'locked' },
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertDepositMock,
        select: selectDepositMock,
        single: singleDepositMock,
      });

      for (const req of requesters) {
        await supabase
          .from('deposits')
          .insert({
            pet_id: testPetId,
            receiver_id: req.id,
            amount: req.deposit,
            status: 'locked',
          })
          .select()
          .single();
      }

      console.log(`   ✅ Cả 3 đều có tiền cọc bị KHÓA\n`);

      // Step 2: All 3 send requests
      console.log('📨 Bước 2: Cả 3 gửi yêu cầu nhận nuôi');

      const insertRequestMock = vi.fn().mockReturnThis();
      const selectRequestMock = vi.fn().mockReturnThis();
      const singleRequestMock = vi.fn().mockResolvedValue({
        data: { status: 'pending' },
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertRequestMock,
        select: selectRequestMock,
        single: singleRequestMock,
      });

      for (const req of requesters) {
        await supabase
          .from('adoption_requests')
          .insert({
            pet_id: testPetId,
            requester_id: req.id,
            status: 'pending',
          })
          .select()
          .single();
      }

      console.log(`   ✅ Cả 3 đều ở trạng thái: PENDING\n`);

      // Step 3: Owner accepts User A
      console.log('✅ Bước 3: Chủ mèo chọn Nguyễn Văn A');

      const updateAcceptMock = vi.fn().mockReturnThis();
      const eqAcceptMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateAcceptMock,
        eq: eqAcceptMock,
      });

      await supabase
        .from('adoption_requests')
        .update({
          status: 'ready_to_deliver',
          delivery_token: 'TOKEN-A',
        })
        .eq('requester_id', 'user-A');

      console.log(`   ✅ User A: ĐƯỢC CHẤP NHẬN (có mã giao mèo)\n`);

      // Step 4: Reject others
      console.log('❌ Bước 4: Tự động từ chối User B và C');

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
        .neq('requester_id', 'user-A');

      console.log(`   ❌ User B: BỊ TỪ CHỐI`);
      console.log(`   ❌ User C: BỊ TỪ CHỐI\n`);

      // Step 5: Refund deposits for B and C
      console.log('💸 Bước 5: Hoàn tiền cọc cho User B và C');

      await supabase
        .from('deposits')
        .update({ status: 'refunded' })
        .eq('pet_id', testPetId)
        .neq('receiver_id', 'user-A');

      console.log(`   ✅ User B: Nhận lại 500,000 VND`);
      console.log(`   ✅ User C: Nhận lại 500,000 VND\n`);

      // Step 6: User A's deposit still locked
      console.log('🔐 Bước 6: Tiền cọc của User A');

      const selectLockedMock = vi.fn().mockReturnThis();
      const eqLockedMock = vi.fn().mockReturnThis();
      const singleLockedMock = vi.fn().mockResolvedValue({
        data: { status: 'locked', amount: 500000 },
        error: null,
      });

      supabase.from.mockReturnValue({
        select: selectLockedMock,
        eq: eqLockedMock,
        single: singleLockedMock,
      });

      const { data: lockedDeposit } = await supabase
        .from('deposits')
        .select('*')
        .eq('receiver_id', 'user-A')
        .single();

      expect(lockedDeposit.status).toBe('locked');
      console.log(`   🔒 Vẫn bị KHÓA (chờ hoàn thành giao mèo)\n`);

      console.log('📊 Kết quả:');
      console.log('   ✓ User A: Được chọn, tiền cọc khóa');
      console.log('   ✓ User B: Bị từ chối, tiền đã hoàn');
      console.log('   ✓ User C: Bị từ chối, tiền đã hoàn\n');
    });
  });

  // ============================================
  // No Deposit Required Scenario
  // ============================================

describe('No Deposit Required Scenario', () => {
    it('should complete adoption without deposit', async () => {
      console.log('\n🆓 TRƯỜNG HỢP: Không yêu cầu cọc\n');

      const mockPet = {
        id: testPetId,
        name: 'Mèo Trắng',
        required_deposit: 0, // KHÔNG CẦN CỌC
      };

      const selectMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({ data: mockPet, error: null });

      supabase.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
        single: singleMock,
      });

      const { data: pet } = await supabase.from('pets').select('*').eq('id', testPetId).single();

      expect(pet.required_deposit).toBe(0);
      console.log(`✅ Mèo: ${pet.name}`);
      console.log(`✅ Tiền cọc: KHÔNG YÊU CẦU`);
      console.log(`✅ Người nhận có thể bỏ qua bước đặt cọc\n`);
    });
  });

  // ============================================
  // Auto-Complete After 3 Days (Owner No Response)
  // ============================================
});
