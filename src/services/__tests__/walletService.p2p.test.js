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

  describe('createWithdrawalRequestP2P', () => {
    it('should create withdrawal request successfully', async () => {
      const mockResponse = {
        data: [{
          success: true,
          order_code: 'WD-20250130-000245',
          withdrawal_id: 'wd-123',
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const result = await createWithdrawalRequestP2P(
        'user-123',
        300000,
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );

      expect(result.success).toBe(true);
      expect(result.orderCode).toBe('WD-20250130-000245');
      expect(result.withdrawalId).toBe('wd-123');
      expect(supabase.rpc).toHaveBeenCalledWith(
        'create_withdrawal_request_p2p',
        expect.objectContaining({
          p_user_id: 'user-123',
          p_amount: 300000,
          p_bank_name: 'VCB',
        })
      );
    });

    it('should handle insufficient balance error', async () => {
      const mockResponse = {
        data: [{
          success: false,
          order_code: null,
          withdrawal_id: null,
          error: 'Số dư không đủ',
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const result = await createWithdrawalRequestP2P(
        'user-123',
        1000000,
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Số dư không đủ');
    });

    it('should handle RPC error', async () => {
      const mockError = new Error('Database error');
      supabase.rpc.mockRejectedValueOnce(mockError);

      const result = await createWithdrawalRequestP2P(
        'user-123',
        300000,
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================
  // GET WITHDRAWAL REQUESTS TESTS
  // ============================================

  describe('getWithdrawalRequestsP2P', () => {
    it('should retrieve user withdrawal requests', async () => {
      const mockRequests = [
        {
          id: 'wd-001',
          order_code: 'WD-20250130-000245',
          amount: 300000,
          status: 'COMPLETED',
          bank_account: '0123456789',
        },
        {
          id: 'wd-002',
          order_code: 'WD-20250130-000246',
          amount: 500000,
          status: 'PENDING',
          bank_account: '9876543210',
        },
      ];

      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            order: vi.fn().mockResolvedValueOnce({
              data: mockRequests,
              error: null,
            }),
          }),
        }),
      });

      const result = await getWithdrawalRequestsP2P('user-123');

      expect(result.success).toBe(true);
      expect(Array.isArray(result.requests)).toBe(true);
    });

    it('should handle empty requests list', async () => {
      supabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            order: vi.fn().mockResolvedValueOnce({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const result = await getWithdrawalRequestsP2P('user-123');

      expect(result.success).toBe(true);
      expect(result.requests).toEqual([]);
    });
  });

  // ============================================
  // ADMIN APPROVE WITHDRAWAL TESTS
  // ============================================

  describe('adminApproveWithdrawalP2P', () => {
    it('should approve withdrawal successfully', async () => {
      const mockResponse = {
        data: [{
          success: true,
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const result = await adminApproveWithdrawalP2P('wd-123', 'admin-456');

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith(
        'admin_approve_withdrawal_p2p',
        expect.objectContaining({
          p_withdrawal_id: 'wd-123',
          p_admin_id: 'admin-456',
        })
      );
    });

    it('should reject approval if withdrawal not found', async () => {
      const mockResponse = {
        data: [{
          success: false,
          error: 'Lệnh rút không tồn tại',
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const result = await adminApproveWithdrawalP2P('invalid-id', 'admin-456');

      expect(result.success).toBe(false);
      expect(result.error).toContain('không tồn tại');
    });
  });

  // ============================================
  // ADMIN CONFIRM PAYMENT TESTS
  // ============================================

  describe('adminConfirmPaymentP2P', () => {
    it('should confirm payment with trace ID', async () => {
      const mockResponse = {
        data: [{
          success: true,
          error: null,
        }],
        error: null,
      };

      supabase.rpc.mockResolvedValueOnce(mockResponse);

      const transferTime = new Date();
      const result = await adminConfirmPaymentP2P(
        'wd-123',
        'TCB202501309876543210',
        'PAY WD-20250130-000245',
        transferTime
      );

      expect(result.success).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith(
        'admin_confirm_payment_p2p',
        expect.objectContaining({
          p_withdrawal_id: 'wd-123',
          p_trace_id: 'TCB202501309876543210',
          p_transfer_content: 'PAY WD-20250130-000245',
        })
      );
    });
  });

  // ============================================
  // USER CONFIRM RECEIPT TESTS
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

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network request failed');
      supabase.rpc.mockRejectedValueOnce(networkError);

      const result = await createWithdrawalRequestP2P(
        'user-123',
        300000,
        'VCB',
        '0123456789',
        'NGUYEN VAN A'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = { message: 'Database constraint violation' };
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });

      const result = await adminApproveWithdrawalP2P('wd-123', 'admin-456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
