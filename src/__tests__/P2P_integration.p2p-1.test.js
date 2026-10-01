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
});
