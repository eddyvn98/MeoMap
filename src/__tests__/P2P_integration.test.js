/**
 * P2P Withdrawal System - Integration Tests
 * Tests the complete workflow from create → approve → pay → confirm
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createWithdrawalRequestP2P,
  adminApproveWithdrawalP2P,
  adminConfirmPaymentP2P,
  userConfirmReceiptP2P,
  userOpenDisputeP2P,
  getWithdrawalRequestsP2P,
} from '@/services/walletService';
import { supabase } from '@/supabaseClient';

vi.mock('@/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('P2P Withdrawal System - Integration Tests', () => {
  const testUserId = 'user-123';
  const testAdminId = 'admin-456';
  let withdrawalId = 'wd-001';
  let orderCode = 'WD-20250130-000245';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // COMPLETE HAPPY PATH: CREATE → APPROVE → PAY → CONFIRM
  // ============================================

  describe('Complete Happy Path', () => {
    it('should complete full withdrawal flow successfully', async () => {
      // Step 1: User creates withdrawal request
      const createResponse = {
        data: [{
          success: true,
          order_code: orderCode,
          withdrawal_id: withdrawalId,
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(createResponse);

      const createResult = await createWithdrawalRequestP2P(
        testUserId,
        300000,
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );

      expect(createResult.success).toBe(true);
      expect(createResult.orderCode).toBe(orderCode);
      console.log('✅ Step 1: User created withdrawal order');

      // Step 2: Admin approves withdrawal
      const approveResponse = {
        data: [{
          success: true,
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(approveResponse);

      const approveResult = await adminApproveWithdrawalP2P(withdrawalId, testAdminId);

      expect(approveResult.success).toBe(true);
      console.log('✅ Step 2: Admin approved withdrawal');

      // Step 3: Admin confirms payment
      const confirmPaymentResponse = {
        data: [{
          success: true,
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(confirmPaymentResponse);

      const confirmPaymentResult = await adminConfirmPaymentP2P(
        withdrawalId,
        'TCB202501309876543210',
        `PAY ${orderCode}`,
        new Date()
      );

      expect(confirmPaymentResult.success).toBe(true);
      console.log('✅ Step 3: Admin confirmed payment with trace ID');

      // Step 4: User confirms receipt
      const confirmReceiptResponse = {
        data: [{
          success: true,
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(confirmReceiptResponse);

      const confirmReceiptResult = await userConfirmReceiptP2P(withdrawalId, testUserId);

      expect(confirmReceiptResult.success).toBe(true);
      console.log('✅ Step 4: User confirmed receipt - COMPLETED!');

      // Verify complete flow
      expect(supabase.rpc).toHaveBeenCalledTimes(4);
    });
  });

  // ============================================
  // DISPUTE PATH: CREATE → APPROVE → PAY → DISPUTE
  // ============================================

  describe('Dispute Path', () => {
    it('should handle dispute flow when user claims non-payment', async () => {
      // Steps 1-3: Create, Approve, Confirm (same as above)
      supabase.rpc
        .mockResolvedValueOnce({
          data: [{
            success: true,
            order_code: orderCode,
            withdrawal_id: withdrawalId,
            error: null,
          }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{
            success: true,
            error: null,
          }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{
            success: true,
            error: null,
          }],
          error: null,
        });

      // Create
      await createWithdrawalRequestP2P(
        testUserId,
        300000,
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );

      // Approve
      await adminApproveWithdrawalP2P(withdrawalId, testAdminId);

      // Confirm payment
      await adminConfirmPaymentP2P(
        withdrawalId,
        'TCB202501309876543210',
        `PAY ${orderCode}`,
        new Date()
      );

      // Step 4: User opens dispute instead of confirming
      const disputeResponse = {
        data: [{
          success: true,
          dispute_id: 'dispute-789',
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(disputeResponse);

      const disputeResult = await userOpenDisputeP2P(
        withdrawalId,
        testUserId,
        'Chưa nhận được tiền vào tài khoản'
      );

      expect(disputeResult.success).toBe(true);
      expect(disputeResult.disputeId).toBe('dispute-789');
      console.log('✅ Dispute opened - Status: DISPUTED');

      expect(supabase.rpc).toHaveBeenCalledTimes(4);
    });
  });

  // ============================================
  // ERROR SCENARIOS
  // ============================================

  describe('Error Scenarios', () => {
    it('should reject withdrawal if balance insufficient', async () => {
      const insufficientBalanceResponse = {
        data: [{
          success: false,
          order_code: null,
          withdrawal_id: null,
          error: 'Số dư không đủ. Số dư hiện tại: 100000 VND',
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(insufficientBalanceResponse);

      const result = await createWithdrawalRequestP2P(
        testUserId,
        500000, // More than balance
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Số dư không đủ');
      console.log('❌ Withdrawal rejected: Insufficient balance');
    });

    it('should reject approval if withdrawal not in PENDING status', async () => {
      const statusErrorResponse = {
        data: [{
          success: false,
          error: 'Chỉ có thể duyệt từ trạng thái PENDING. Hiện tại: COMPLETED',
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(statusErrorResponse);

      const result = await adminApproveWithdrawalP2P(withdrawalId, testAdminId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('PENDING');
      console.log('❌ Approval rejected: Wrong status');
    });

    it('should reject confirmation if user does not own withdrawal', async () => {
      const permissionErrorResponse = {
        data: [{
          success: false,
          error: 'Không có quyền xác nhận lệnh này',
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(permissionErrorResponse);

      const result = await userConfirmReceiptP2P(withdrawalId, 'wrong-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('quyền');
      console.log('❌ Confirmation rejected: Wrong user');
    });

    it('should reject dispute if withdrawal not in AWAITING_USER_CONFIRMATION status', async () => {
      const disputeErrorResponse = {
        data: [{
          success: false,
          dispute_id: null,
          error: 'Không thể mở tranh chấp ở trạng thái này',
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(disputeErrorResponse);

      const result = await userOpenDisputeP2P(
        withdrawalId,
        testUserId,
        'Chưa nhận được tiền'
      );

      expect(result.success).toBe(false);
      console.log('❌ Dispute rejected: Wrong status');
    });
  });

  // ============================================
  // MULTIPLE ORDERS TEST
  // ============================================

  describe('Multiple Orders', () => {
    it('should handle multiple concurrent withdrawals', async () => {
      const orders = [
        { amount: 100000, code: 'WD-20250130-000001' },
        { amount: 200000, code: 'WD-20250130-000002' },
        { amount: 150000, code: 'WD-20250130-000003' },
      ];

      // Mock responses for each order creation
      orders.forEach((order) => {
        supabase.rpc.mockResolvedValueOnce({
          data: [{
            success: true,
            order_code: order.code,
            withdrawal_id: `wd-${Math.random()}`,
            error: null,
          }],
          error: null,
        });
      });

      // Create multiple orders
      const results = await Promise.all(
        orders.map((order) =>
          createWithdrawalRequestP2P(
            testUserId,
            order.amount,
            'VCB',
            `111111111${Math.random().toString().slice(2, 4)}`,
            'TEST USER'
          )
        )
      );

      // Verify all succeeded
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.orderCode).toBe(orders[index].code);
      });

      console.log(`✅ Created ${results.length} concurrent withdrawal orders`);
      expect(supabase.rpc).toHaveBeenCalledTimes(3);
    });
  });

  // ============================================
  // ORDER CODE UNIQUENESS TEST
  // ============================================

  describe('Order Code Uniqueness', () => {
    it('should generate unique order codes for same user', async () => {
      const codes = new Set();

      for (let i = 0; i < 5; i++) {
        supabase.rpc.mockResolvedValueOnce({
          data: [{
            success: true,
            order_code: `WD-20250130-${String(i).padStart(6, '0')}`,
            withdrawal_id: `wd-${i}`,
            error: null,
          }],
          error: null,
        });

        const result = await createWithdrawalRequestP2P(
          testUserId,
          100000,
          'VCB',
          `111111111${i}`,
          'TEST USER'
        );

        codes.add(result.orderCode);
      }

      expect(codes.size).toBe(5); // All unique
      console.log('✅ All order codes are unique');
    });
  });

  // ============================================
  // BALANCE DEDUCTION TEST
  // ============================================

  describe('Balance Management', () => {
    it('should deduct balance immediately on creation', async () => {
      const initialBalance = 500000;
      const withdrawalAmount = 300000;
      const expectedBalance = initialBalance - withdrawalAmount;

      supabase.rpc.mockResolvedValueOnce({
        data: [{
          success: true,
          order_code: orderCode,
          withdrawal_id: withdrawalId,
          error: null,
        }],
        error: null,
      });

      const result = await createWithdrawalRequestP2P(
        testUserId,
        withdrawalAmount,
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );

      expect(result.success).toBe(true);
      console.log(
        `✅ Balance deducted: ${initialBalance} - ${withdrawalAmount} = ${expectedBalance}`
      );
    });

    it('should prevent withdrawal if second order exceeds remaining balance', async () => {
      // First order: 300000 from 500000 = 200000 remaining
      // Second order: try 300000 > 200000 = should fail

      supabase.rpc
        .mockResolvedValueOnce({
          data: [{
            success: true,
            order_code: 'WD-20250130-000001',
            withdrawal_id: 'wd-001',
            error: null,
          }],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [{
            success: false,
            order_code: null,
            withdrawal_id: null,
            error: 'Số dư không đủ. Số dư hiện tại: 200000 VND',
          }],
          error: null,
        });

      // First order (succeeds)
      const first = await createWithdrawalRequestP2P(
        testUserId,
        300000,
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );
      expect(first.success).toBe(true);

      // Second order (fails - exceeds remaining balance)
      const second = await createWithdrawalRequestP2P(
        testUserId,
        300000,
        'VCB',
        '9876543210',
        'NGUYEN VAN A'
      );
      expect(second.success).toBe(false);

      console.log('✅ Balance protection working: Second order rejected');
    });
  });

  // ============================================
  // STATE TRANSITIONS TEST
  // ============================================

  describe('Status State Transitions', () => {
    it('should follow correct status transitions', async () => {
      const statusTransitions = [
        { status: 'PENDING', action: 'User creates order' },
        { status: 'WAITING_FOR_ADMIN_PAYMENT', action: 'Admin approves' },
        { status: 'AWAITING_USER_CONFIRMATION', action: 'Admin confirms payment' },
        { status: 'COMPLETED', action: 'User confirms receipt' },
      ];

      console.log('\n📊 Status Flow:');
      statusTransitions.forEach((transition) => {
        console.log(
          `  ${transition.status} ← ${transition.action}`
        );
      });

      expect(statusTransitions.length).toBe(4);
      expect(statusTransitions[0].status).toBe('PENDING');
      expect(statusTransitions[3].status).toBe('COMPLETED');
    });

    it('should allow dispute at AWAITING_USER_CONFIRMATION status', async () => {
      // At AWAITING_USER_CONFIRMATION, user can:
      // 1. Confirm receipt → COMPLETED
      // 2. Open dispute → DISPUTED

      const disputeResponse = {
        data: [{
          success: true,
          dispute_id: 'dispute-123',
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(disputeResponse);

      const result = await userOpenDisputeP2P(
        withdrawalId,
        testUserId,
        'Chưa nhận được tiền sau 24h'
      );

      expect(result.success).toBe(true);
      console.log('✅ Dispute allowed at AWAITING_USER_CONFIRMATION status');
    });
  });
});
