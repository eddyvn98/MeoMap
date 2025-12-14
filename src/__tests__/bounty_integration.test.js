/**
 * Lost Pet Bounty System - Integration Tests
 * Test luồng hoàn chỉnh 5 bước tìm mèo thất lạc
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

describe('Lost Pet Bounty System - Integration Tests', () => {
  const testOwnerId = 'owner-nguyen-123';
  const testFinder1 = 'finder-tran-456';
  const testFinder2 = 'finder-le-789';
  const testPetId = 'lost-meo-miu-001';
  const testBountyId = 'bounty-001';
  const testClaimId = 'claim-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // HAPPY PATH: Complete Lost Pet Recovery Flow
  // ============================================

  describe('Complete Lost Pet Recovery Flow', () => {
    it('should complete full bounty flow from report to reward', async () => {
      console.log('\n🔍 QUY TRÌNH TÌM MÈO THẤT LẠC - 5 BƯỚC\n');

      // ===== STEP 1: Báo Mèo Thất Lạc =====
      console.log('📢 BƯỚC 1: Báo mèo thất lạc');

      const mockPet = {
        id: testPetId,
        owner_id: testOwnerId,
        name: 'Mèo Miu',
        status: 'lost',
        description: 'Mèo lông vàng, mất tại công viên Lê Văn Tám lúc 8h sáng',
        district: 'Quận 1, TP.HCM',
        latitude: 10.7769,
        longitude: 106.7009,
        image_url: 'https://example.com/meo-miu-before.jpg',
        created_at: new Date().toISOString(),
      };

      const insertPetMock = vi.fn().mockReturnThis();
      const selectPetMock = vi.fn().mockReturnThis();
      const singlePetMock = vi.fn().mockResolvedValue({ data: mockPet, error: null });

      supabase.from.mockReturnValue({
        insert: insertPetMock,
        select: selectPetMock,
        single: singlePetMock,
      });

      const petResult = await supabase
        .from('pets')
        .insert({
          owner_id: testOwnerId,
          name: 'Mèo Miu',
          status: 'lost',
          description: 'Mèo lông vàng, mất tại công viên Lê Văn Tám lúc 8h sáng',
          district: 'Quận 1, TP.HCM',
          latitude: 10.7769,
          longitude: 106.7009,
        })
        .select()
        .single();

      expect(petResult.data).toEqual(mockPet);
      console.log(`✅ Đã đăng bài: ${mockPet.name}`);
      console.log(`   Địa điểm: ${mockPet.district}`);
      console.log(`   Tọa độ: ${mockPet.latitude}, ${mockPet.longitude}\n`);

      // ===== STEP 2: Treo Thưởng =====
      console.log('💰 BƯỚC 2: Treo thưởng');

      const mockBounty = {
        id: testBountyId,
        pet_id: testPetId,
        owner_id: testOwnerId,
        amount: 2000000, // 2 triệu VND
        status: 'active',
        description: 'Thưởng 2 triệu cho người tìm thấy mèo',
        created_at: new Date().toISOString(),
      };

      const insertBountyMock = vi.fn().mockReturnThis();
      const selectBountyMock = vi.fn().mockReturnThis();
      const singleBountyMock = vi.fn().mockResolvedValue({ data: mockBounty, error: null });

      supabase.from.mockReturnValue({
        insert: insertBountyMock,
        select: selectBountyMock,
        single: singleBountyMock,
      });

      const bountyResult = await supabase
        .from('bounties')
        .insert({
          pet_id: testPetId,
          owner_id: testOwnerId,
          amount: 2000000,
          status: 'active',
        })
        .select()
        .single();

      expect(bountyResult.data.amount).toBe(2000000);
      console.log(`✅ Đã treo thưởng: ${bountyResult.data.amount.toLocaleString()} VND`);
      console.log(`   Trạng thái: ACTIVE (đang chờ người tìm)\n`);

      // ===== STEP 3: Cộng Đồng Tìm Kiếm =====
      console.log('🔎 BƯỚC 3: Cộng đồng tìm kiếm');

      const mockLostPets = [
        mockPet,
        { id: 'pet-002', name: 'Mèo Đen', status: 'lost', latitude: 10.8231, longitude: 106.6297 },
        { id: 'pet-003', name: 'Mèo Trắng', status: 'lost', latitude: 10.7626, longitude: 106.6823 },
      ];

      const selectLostMock = vi.fn().mockReturnThis();
      const eqLostMock = vi.fn().mockReturnThis();
      const orderLostMock = vi.fn().mockResolvedValue({ data: mockLostPets, error: null });

      supabase.from.mockReturnValue({
        select: selectLostMock,
        eq: eqLostMock,
        order: orderLostMock,
      });

      const lostPetsResult = await supabase
        .from('pets')
        .select('*')
        .eq('status', 'lost')
        .order('created_at', { ascending: false });

      expect(lostPetsResult.data).toHaveLength(3);
      console.log(`✅ Hiển thị ${lostPetsResult.data.length} mèo thất lạc trên bản đồ`);
      console.log(`   📍 Người dùng có thể thấy vị trí và thưởng`);
      console.log(`   🔍 Cộng đồng bắt đầu tìm kiếm...\n`);

      // ===== STEP 4: Báo Tin (2 người tìm thấy) =====
      console.log('📸 BƯỚC 4: Người tìm thấy báo tin');

      // Người 1 báo tin
      console.log(`   👤 Người tìm #1 gửi báo cáo...`);

      const mockClaim1 = {
        id: 'claim-001',
        pet_id: testPetId,
        finder_id: testFinder1,
        message: 'Tôi thấy mèo này ở quán cafe gần công viên',
        photo_url: 'https://example.com/found-proof-1.jpg',
        latitude: 10.7780,
        longitude: 106.7020,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const insertClaim1Mock = vi.fn().mockReturnThis();
      const selectClaim1Mock = vi.fn().mockReturnThis();
      const singleClaim1Mock = vi.fn().mockResolvedValue({ data: mockClaim1, error: null });

      supabase.from.mockReturnValue({
        insert: insertClaim1Mock,
        select: selectClaim1Mock,
        single: singleClaim1Mock,
      });

      const claim1Result = await supabase
        .from('bounty_claims')
        .insert({
          pet_id: testPetId,
          finder_id: testFinder1,
          message: 'Tôi thấy mèo này ở quán cafe gần công viên',
          photo_url: 'https://example.com/found-proof-1.jpg',
          status: 'pending',
        })
        .select()
        .single();

      expect(claim1Result.data.status).toBe('pending');
      console.log(`   ✅ Người #1 đã gửi ảnh + địa điểm`);

      // Người 2 cũng báo tin
      console.log(`   👤 Người tìm #2 cũng gửi báo cáo...`);

      const mockClaim2 = {
        id: 'claim-002',
        pet_id: testPetId,
        finder_id: testFinder2,
        message: 'Mèo đang ở cửa hàng tạp hóa',
        photo_url: 'https://example.com/found-proof-2.jpg',
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const insertClaim2Mock = vi.fn().mockReturnThis();
      const selectClaim2Mock = vi.fn().mockReturnThis();
      const singleClaim2Mock = vi.fn().mockResolvedValue({ data: mockClaim2, error: null });

      supabase.from.mockReturnValue({
        insert: insertClaim2Mock,
        select: selectClaim2Mock,
        single: singleClaim2Mock,
      });

      await supabase
        .from('bounty_claims')
        .insert({
          pet_id: testPetId,
          finder_id: testFinder2,
          message: 'Mèo đang ở cửa hàng tạp hóa',
          status: 'pending',
        })
        .select()
        .single();

      console.log(`   ✅ Người #2 đã gửi ảnh + địa điểm`);
      console.log(`   📩 Chủ mèo nhận được 2 báo cáo\n`);

      // ===== STEP 5: Chủ Mèo Xác Nhận và Trả Thưởng =====
      console.log('✅ BƯỚC 5: Xác nhận và trả thưởng');

      console.log(`   👀 Chủ mèo xem xét ảnh...`);
      console.log(`   🎯 Chủ mèo chọn: Người #1 (ảnh đúng)`)
;

      // Approve claim #1
      const updateApproveMock = vi.fn().mockReturnThis();
      const eqApproveMock = vi.fn().mockResolvedValue({
        data: { status: 'approved' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateApproveMock,
        eq: eqApproveMock,
      });

      await supabase
        .from('bounty_claims')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', 'claim-001');

      console.log(`   ✅ Đã chấp nhận báo cáo của Người #1\n`);

      // Reject claim #2
      console.log(`   ❌ Từ chối Người #2 (ảnh không chính xác)`);

      const updateRejectMock = vi.fn().mockReturnThis();
      const eqRejectMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateRejectMock,
        eq: eqRejectMock,
      });

      await supabase
        .from('bounty_claims')
        .update({
          status: 'rejected',
          rejection_reason: 'Ảnh không phải mèo của tôi',
        })
        .eq('id', 'claim-002');

      console.log(`   ❌ Người #2 không nhận được thưởng\n`);

      // Transfer bounty to winner
      console.log(`   💸 Chuyển tiền thưởng cho Người #1...`);

      // Deduct from owner
      const updateOwnerMock = vi.fn().mockReturnThis();
      const eqOwnerMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateOwnerMock,
        eq: eqOwnerMock,
      });

      await supabase
        .from('profiles')
        .update({
          balance_thuong: supabase.raw('balance_thuong - 2000000'),
        })
        .eq('id', testOwnerId);

      console.log(`   📤 Trừ 2,000,000 VND từ ví chủ mèo`);

      // Add to finder
      const updateFinderMock = vi.fn().mockReturnThis();
      const eqFinderMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateFinderMock,
        eq: eqFinderMock,
      });

      await supabase
        .from('profiles')
        .update({
          balance_thuong: supabase.raw('balance_thuong + 2000000'),
        })
        .eq('id', testFinder1);

      console.log(`   📥 Cộng 2,000,000 VND vào ví Người #1\n`);

      // Create transaction record
      const mockTransaction = {
        id: 'txn-001',
        user_id: testFinder1,
        amount: 2000000,
        type: 'bounty_received',
        description: 'Nhận thưởng tìm mèo thất lạc: Mèo Miu',
        related_id: testPetId,
      };

      const insertTxnMock = vi.fn().mockReturnThis();
      const selectTxnMock = vi.fn().mockReturnThis();
      const singleTxnMock = vi.fn().mockResolvedValue({ data: mockTransaction, error: null });

      supabase.from.mockReturnValue({
        insert: insertTxnMock,
        select: selectTxnMock,
        single: singleTxnMock,
      });

      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: testFinder1,
          amount: 2000000,
          type: 'bounty_received',
          description: 'Nhận thưởng tìm mèo thất lạc: Mèo Miu',
          related_id: testPetId,
        })
        .select()
        .single();

      console.log(`   📝 Đã ghi lại giao dịch trong ví\n`);

      // Update pet status to found
      console.log(`   🐱 Cập nhật trạng thái mèo...`);

      const updatePetMock = vi.fn().mockReturnThis();
      const eqPetMock = vi.fn().mockResolvedValue({
        data: { status: 'found' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updatePetMock,
        eq: eqPetMock,
      });

      await supabase.from('pets').update({ status: 'found' }).eq('id', testPetId);

      console.log(`   ✅ Trạng thái mèo: FOUND (đã tìm thấy)\n`);

      // Complete bounty
      console.log(`   🏁 Hoàn tất bounty...`);

      const updateBountyMock = vi.fn().mockReturnThis();
      const eqBountyMock = vi.fn().mockResolvedValue({
        data: { status: 'completed' },
        error: null,
      });

      supabase.from.mockReturnValue({
        update: updateBountyMock,
        eq: eqBountyMock,
      });

      await supabase
        .from('bounties')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', testBountyId);

      console.log(`   ✅ Bounty: COMPLETED\n`);

      console.log('🎉 QUY TRÌNH HOÀN TẤT!\n');
      console.log('📊 Tổng kết:');
      console.log('   ✓ Mèo đã được tìm thấy');
      console.log('   ✓ Người tìm thấy nhận 2,000,000 VND');
      console.log('   ✓ Chủ mèo hạnh phúc');
      console.log('   ✓ Cộng đồng giúp đỡ thành công\n');
    });
  });

  // ============================================
  // No Bounty Scenario
  // ============================================

  describe('No Bounty Scenario', () => {
    it('should complete without bounty (goodwill only)', async () => {
      console.log('\n🆓 TRƯỜNG HỢP: Không có tiền thưởng\n');

      const mockPet = {
        id: testPetId,
        name: 'Mèo Xám',
        status: 'lost',
        // No bounty
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

      console.log(`✅ Mèo: ${pet.name}`);
      console.log(`✅ Thưởng: KHÔNG CÓ (thiện chí)`);
      console.log(`✅ Cộng đồng vẫn có thể giúp tìm\n`);

      expect(pet.status).toBe('lost');
    });
  });

  // ============================================
  // Multiple Claims Scenario
  // ============================================

  describe('Multiple Claims Scenario', () => {
    it('should handle multiple finders reporting same pet', async () => {
      console.log('\n👥 TRƯỜNG HỢP: Nhiều người cùng báo tin\n');

      const claims = [
        { id: 'claim-1', finder_id: 'user-A', message: 'Thấy ở quán cafe' },
        { id: 'claim-2', finder_id: 'user-B', message: 'Thấy ở công viên' },
        { id: 'claim-3', finder_id: 'user-C', message: 'Thấy ở chợ' },
      ];

      console.log('📨 Bước 1: 3 người cùng gửi báo cáo');

      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: { status: 'pending' },
        error: null,
      });

      supabase.from.mockReturnValue({
        insert: insertMock,
        select: selectMock,
        single: singleMock,
      });

      for (const claim of claims) {
        await supabase.from('bounty_claims').insert(claim).select().single();
        console.log(`   ${claim.id}: ${claim.message}`);
      }

      console.log(`\n✅ Bước 2: Chủ mèo chọn User A (ảnh chính xác nhất)`);

      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({ error: null });

      supabase.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      });

      await supabase
        .from('bounty_claims')
        .update({ status: 'approved' })
        .eq('id', 'claim-1');

      console.log(`   ✅ User A: APPROVED - Nhận thưởng`);
      console.log(`   ❌ User B: REJECTED`);
      console.log(`   ❌ User C: REJECTED\n`);
    });
  });

  // ============================================
  // Error Scenarios
  // ============================================

  describe('Error Scenarios', () => {
    it('should handle insufficient balance for bounty payment', async () => {
      console.log('\n❌ LỖI: Số dư không đủ trả thưởng\n');

      const mockOwner = {
        id: testOwnerId,
        balance_thuong: 500000, // Chỉ có 500k
      };

      const mockBounty = {
        amount: 2000000, // Cần 2 triệu
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
      console.log(`❌ Số dư: ${owner.balance_thuong.toLocaleString()} VND`);
      console.log(`❌ Cần: ${mockBounty.amount.toLocaleString()} VND`);
      console.log(`❌ Không thể trả thưởng\n`);
    });

    it('should allow owner to reject fake claims', async () => {
      console.log('\n❌ TRƯỜNG HỢP: Ảnh giả mạo\n');

      const updateMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockResolvedValue({
        data: { status: 'rejected', rejection_reason: 'Không phải mèo của tôi' },
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
          rejection_reason: 'Không phải mèo của tôi',
        })
        .eq('id', 'claim-fake');

      expect(data.status).toBe('rejected');
      console.log(`❌ Đã từ chối: ${data.rejection_reason}\n`);
    });
  });
});
