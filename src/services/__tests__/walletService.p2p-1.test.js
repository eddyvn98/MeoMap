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
});
