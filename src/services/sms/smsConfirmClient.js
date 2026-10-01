// ================================================================
// API Endpoint for Android SMS Auto-Confirmation
// This endpoint is called by Android app when SMS is received
// ================================================================

import { supabase } from '../supabaseClient';

/**
 * Confirm topup payment from Android SMS reader
 * Called by Android app when bank SMS notification is received
 * 
 * @param {string} orderCode - Order code from SMS (TU123456)
 * @param {number} amount - Amount from SMS
 * @param {string} transactionId - Transaction ID from SMS (optional)
 * @param {string} smsContent - Full SMS content for logging
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
export async function confirmTopupFromSMS(orderCode, amount, transactionId = null, smsContent = null, apiKey = null) {
  try {
    // 1. Validate API key (simple auth)
    const validApiKey = import.meta.env.VITE_SMS_CONFIRM_API_KEY || 'your-secret-api-key';
    if (apiKey !== validApiKey) {
      return {
        success: false,
        error: 'Invalid API key',
      };
    }

    // 2. Validate order code format (now: TU123456)
    if (!orderCode || !orderCode.match(/^TU\d{6}$/)) {
      return {
        success: false,
        error: 'Invalid order code format (expected: TU123456)',
      };
    }

    // 3. Validate amount
    if (!amount || amount < 10000) {
      return {
        success: false,
        error: 'Invalid amount',
      };
    }

    // 4. Verify topup order and get user_id
    const { data: verifyData, error: verifyError } = await supabase.rpc('verify_topup_order', {
      p_order_code: orderCode,
    });

    if (verifyError || !verifyData || !verifyData[0]) {
      return {
        success: false,
        error: 'Topup request not found',
      };
    }

    const topupInfo = verifyData[0];
    const userId = topupInfo.user_id;
    const expectedAmount = topupInfo.amount;
    const status = topupInfo.status;

    // 5. Check if already confirmed
    if (status === 'success') {
      return {
        success: true,
        message: 'Topup already confirmed',
        alreadyConfirmed: true,
      };
    }

    // 6. Verify amount matches (allow ±1000 tolerance for bank fees)
    if (Math.abs(expectedAmount - amount) > 1000) {
      return {
        success: false,
        error: `Amount mismatch: Expected ${expectedAmount}, Got ${amount}`,
      };
    }

    // 7. Call confirm_topup_payment function with user_id verification
    const { data: confirmData, error: confirmError } = await supabase.rpc('confirm_topup_payment', {
      p_order_code: orderCode,
      p_user_id: userId, // NEW: Verify user_id matches order_code (one-time use per user)
      p_transaction_id: transactionId || `SMS_${Date.now()}`,
      p_payment_description: smsContent ? `Nạp tiền qua SMS - ${smsContent.substring(0, 100)}` : 'Nạp tiền qua chuyển khoản ngân hàng',
    });

    if (confirmError) {
      console.error('Error confirming topup:', confirmError);
      return {
        success: false,
        error: confirmError.message || 'Failed to confirm topup',
      };
    }

    const result = confirmData[0];
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Confirmation failed',
      };
    }

    // 8. Return success
    return {
      success: true,
      message: 'Topup confirmed successfully',
      topupId: result.topup_id,
      amount: result.amount,
      newBalance: result.new_balance_coc,
    };
  } catch (error) {
    console.error('Error in confirmTopupFromSMS:', error);
    return {
      success: false,
      error: error.message || 'Internal server error',
    };
  }
}

/**
 * Get topup request by order code (for verification)
 * @param {string} orderCode - Order code
 * @param {string} apiKey - API key for authentication
 * @returns {Promise<{success: boolean, topup?: object, error?: string}>}
 */
export async function getTopupByOrderCode(orderCode, apiKey = null) {
  try {
    // Validate API key
    const validApiKey = import.meta.env.VITE_SMS_CONFIRM_API_KEY || 'your-secret-api-key';
    if (apiKey !== validApiKey) {
      return {
        success: false,
        error: 'Invalid API key',
      };
    }

    const { data, error } = await supabase
      .from('topup_requests')
      .select('*')
      .eq('order_code', orderCode)
      .single();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      topup: data,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ================================================================
// Express.js Endpoint Example (for backend server)
// ================================================================

/*
// Add this to your Express server (e.g., server.js or api/sms-confirm.js)

import express from 'express';
import { confirmTopupFromSMS, getTopupByOrderCode } from './services/smsConfirmService.js';

const app = express();
app.use(express.json());

// POST /api/sms-confirm - Confirm topup from SMS
app.post('/api/sms-confirm', async (req, res) => {
  const { orderCode, amount, transactionId, smsContent, apiKey } = req.body;

  const result = await confirmTopupFromSMS(
    orderCode,
    amount,
    transactionId,
    smsContent,
    apiKey
  );

  if (result.success) {
    return res.json(result);
  } else {
    return res.status(400).json(result);
  }
});

// GET /api/topup/:orderCode - Get topup info
app.get('/api/topup/:orderCode', async (req, res) => {
  const { orderCode } = req.params;
  const apiKey = req.headers['x-api-key'];

  const result = await getTopupByOrderCode(orderCode, apiKey);

  if (result.success) {
    return res.json(result);
  } else {
    return res.status(404).json(result);
  }
});

app.listen(3000, () => {
  console.log('SMS confirm API running on port 3000');
});
*/

// ================================================================
// Supabase Edge Function Example
// ================================================================

/*
// Create this file: supabase/functions/sms-confirm/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

