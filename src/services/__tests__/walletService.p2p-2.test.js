/**
 * P2P Withdrawal System - Unit Tests
 * Tests for walletService.js P2P functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createWithdrawalRequestP2P,
  getWithdrawalRequestsP2P,
  userConfirmReceiptP2P,
  userOpenDisputeP2P,
  adminGetPendingWithdrawalsP2P,
  adminApproveWithdrawalP2P,
  adminConfirmPaymentP2P,
  getWithdrawalStatusDisplayP2P,
  generateVietQRData,
} from '../walletService';
import { supabase } from '../../supabaseClient';

// Mock Supabase
vi.mock('../../supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('P2P Withdrawal Service - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // CREATE WITHDRAWAL REQUEST TESTS
  // ============================================

describe('userConfirmReceiptP2P', () => {
    it('should confirm receipt successfully', async () => {
      const mockResponse = {
        data: [{
          success: true,
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const result = await userConfirmReceiptP2P('wd-123', 'user-456');

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith(
        'user_confirm_receipt_p2p',
        expect.objectContaining({
          p_withdrawal_id: 'wd-123',
          p_user_id: 'user-456',
        })
      );
    });

    it('should reject if user does not own withdrawal', async () => {
      const mockResponse = {
        data: [{
          success: false,
          error: 'Không có quyền xác nhận lệnh này',
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const result = await userConfirmReceiptP2P('wd-123', 'wrong-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('quyền');
    });
  });

  // ============================================
  // USER OPEN DISPUTE TESTS
  // ============================================

describe('userOpenDisputeP2P', () => {
    it('should open dispute successfully', async () => {
      const mockResponse = {
        data: [{
          success: true,
          dispute_id: 'dispute-789',
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const result = await userOpenDisputeP2P(
        'wd-123',
        'user-456',
        'Chưa nhận được tiền'
      );

      expect(result.success).toBe(true);
      expect(result.disputeId).toBe('dispute-789');
    });

    it('should reject if withdrawal not found', async () => {
      const mockResponse = {
        data: [{
          success: false,
          dispute_id: null,
          error: 'Lệnh rút không tồn tại',
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const result = await userOpenDisputeP2P(
        'invalid-id',
        'user-456',
        'Chưa nhận được tiền'
      );

      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // STATUS DISPLAY TESTS
  // ============================================

describe('getWithdrawalStatusDisplayP2P', () => {
    it('should return correct display for PENDING status', () => {
      const result = getWithdrawalStatusDisplayP2P('PENDING');
      expect(result.text).toBe('Chờ duyệt');
      expect(result.color).toContain('yellow');
      expect(result.icon).toBe('⏳');
    });

    it('should return correct display for WAITING_FOR_ADMIN_PAYMENT status', () => {
      const result = getWithdrawalStatusDisplayP2P('WAITING_FOR_ADMIN_PAYMENT');
      expect(result.text).toBe('Admin đang chuyển');
      expect(result.color).toContain('blue');
      expect(result.icon).toBe('💳');
    });

    it('should return correct display for AWAITING_USER_CONFIRMATION status', () => {
      const result = getWithdrawalStatusDisplayP2P('AWAITING_USER_CONFIRMATION');
      expect(result.text).toBe('Chờ bạn xác nhận');
      expect(result.color).toContain('purple');
      expect(result.icon).toBe('⏰');
    });

    it('should return correct display for COMPLETED status', () => {
      const result = getWithdrawalStatusDisplayP2P('COMPLETED');
      expect(result.text).toBe('Hoàn thành');
      expect(result.color).toContain('green');
      expect(result.icon).toBe('✅');
    });

    it('should return correct display for DISPUTED status', () => {
      const result = getWithdrawalStatusDisplayP2P('DISPUTED');
      expect(result.text).toBe('Tranh chấp');
      expect(result.color).toContain('red');
      expect(result.icon).toBe('⚠️');
    });

    it('should handle unknown status', () => {
      const result = getWithdrawalStatusDisplayP2P('UNKNOWN_STATUS');
      expect(result.text).toBe('UNKNOWN_STATUS');
      expect(result.icon).toBe('❓');
    });
  });

  // ============================================
  // QR CODE DATA TESTS
  // ============================================

describe('generateVietQRData', () => {
    it('should generate valid QR data', () => {
      const result = generateVietQRData('0123456789', '970416', 300000, 'WD-20250130-000245');

      expect(result.accountNo).toBe('0123456789');
      expect(result.bankCode).toBe('970416');
      expect(result.amount).toBe(300000);
      expect(result.description).toContain('WD-20250130-000245');
    });

    it('should use default bank code if not provided', () => {
      const result = generateVietQRData('0123456789', null, 300000, 'WD-20250130-000245');

      expect(result.bankCode).toBe('970416'); // VietCombank default
    });

    it('should format description correctly', () => {
      const result = generateVietQRData('0123456789', '970416', 300000, 'WD-20250130-000245');

      expect(result.description).toBe('PAY WD-20250130-000245');
    });
  });

  // ============================================
  // ADMIN GET PENDING TESTS
  // ============================================

describe('adminGetPendingWithdrawalsP2P', () => {
    it('should retrieve pending withdrawals', async () => {
      const mockPending = [
        {
          id: 'wd-001',
          order_code: 'WD-20250130-000245',
          amount: 300000,
          status: 'PENDING',
        },
      ];

      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            order: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce({
                data: mockPending,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await adminGetPendingWithdrawalsP2P('PENDING');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.requests)).toBe(true);
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
});
