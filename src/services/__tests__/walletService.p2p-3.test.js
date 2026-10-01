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
