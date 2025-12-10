#!/bin/bash

# 🧪 WALLET FLOW TEST SUITE
# Script để kiểm tra tất cả luồng ví cá nhân
# Chạy trong Supabase SQL Editor hoặc terminal với psql

# ================================================================
# TEST 1: Kiểm tra structure bảng + RPC functions
# ================================================================

echo "🔍 TEST 1: Kiểm tra structure"
echo "================================"

# Check bảng profiles có wallet_credit
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='profiles' AND column_name='wallet_credit';

# Check bảng deposits có wallet_used, cash_amount
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='deposits' AND column_name IN ('wallet_used', 'cash_amount');

# Check bảng wallet_transactions tồn tại
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'wallet_transactions'
) as wallet_transactions_exists;

# Check RPC functions tồn tại
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'increase_wallet_credit'
) as increase_exists,
EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'decrease_wallet_credit'
) as decrease_exists;

# ================================================================
# TEST 2: Kiểm tra logic increase_wallet_credit
# ================================================================

echo ""
echo "🧪 TEST 2: Kiểm tra increase_wallet_credit"
echo "================================================"

-- Lấy một user test
WITH user_test AS (
  SELECT id FROM auth.users LIMIT 1
)
-- Kiểm tra wallet trước
SELECT 
  p.id,
  p.wallet_credit as wallet_before
FROM profiles p
WHERE p.id = (SELECT id FROM user_test)
LIMIT 1;

-- Sau khi gọi increase (lưu ý: test trên data thật, cẩn thận!)
-- CALL increase_wallet_credit('USER_ID', 50000, 'refund_deposit', 'DEPOSIT_ID', 'Hoàn cọc test');

-- Kiểm tra sau
SELECT 
  p.id,
  p.wallet_credit as wallet_after
FROM profiles p
WHERE p.id = (SELECT id FROM (SELECT id FROM auth.users LIMIT 1) AS user_test)
LIMIT 1;

# Check transaction logs
SELECT 
  user_id,
  type,
  amount,
  deposit_id,
  note,
  created_at
FROM wallet_transactions
ORDER BY created_at DESC
LIMIT 10;

# ================================================================
# TEST 3: Kiểm tra logic decrease_wallet_credit
# ================================================================

echo ""
echo "🧪 TEST 3: Kiểm tra decrease_wallet_credit"
echo "================================================"

-- Lấy một deposit của user
SELECT 
  d.id,
  d.receiver_id,
  d.amount,
  d.wallet_used,
  d.cash_amount,
  p.wallet_credit
FROM deposits d
JOIN profiles p ON p.id = d.receiver_id
WHERE d.wallet_used > 0
LIMIT 1;

-- Sau khi gọi decrease
-- CALL decrease_wallet_credit('USER_ID', 50000, 'use_for_deposit', 'DEPOSIT_ID', 'Test decrease');

-- Check transaction logs
SELECT 
  user_id,
  type,
  amount,
  deposit_id,
  note,
  created_at
FROM wallet_transactions
WHERE type = 'use_for_deposit'
ORDER BY created_at DESC
LIMIT 10;

# ================================================================
# TEST 4: Kiểm tra split ví + tiền mặt logic
# ================================================================

echo ""
echo "🧪 TEST 4: Kiểm tra split ví + tiền mặt"
echo "=========================================="

-- Kiểm tra các deposit có split chính xác
SELECT 
  d.id,
  d.amount,
  d.wallet_used,
  d.cash_amount,
  (d.wallet_used + d.cash_amount) as total_calculated,
  CASE 
    WHEN d.amount = (d.wallet_used + d.cash_amount) THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as validation
FROM deposits d
WHERE d.status IN ('locked', 'pending', 'confirmed')
ORDER BY d.created_at DESC
LIMIT 20;

# ================================================================
# TEST 5: Kiểm tra hoàn tiền logic
# ================================================================

echo ""
echo "🧪 TEST 5: Kiểm tra hoàn tiền"
echo "==============================="

-- Kiểm tra deposit đã hủy và transaction hoàn
SELECT 
  d.id,
  d.amount,
  d.receiver_id,
  d.delivery_status,
  wt.type,
  wt.amount as refund_amount,
  wt.created_at,
  CASE 
    WHEN d.amount = wt.amount AND wt.type = 'refund_deposit' THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as validation
FROM deposits d
LEFT JOIN wallet_transactions wt ON wt.deposit_id = d.id AND wt.type = 'refund_deposit'
WHERE d.delivery_status = 'cancelled_no_trade'
ORDER BY d.updated_at DESC
LIMIT 20;

# ================================================================
# TEST 6: Kiểm tra tính toán tiền cọc theo uy tín
# ================================================================

echo ""
echo "🧪 TEST 6: Kiểm tra tính tiền cọc theo uy tín"
echo "=============================================="

-- Kiểm tra user xấu (bad_trades >= 1)
WITH user_reputation AS (
  SELECT 
    user_id,
    bad_trades,
    good_trades
  FROM user_reputation
  WHERE bad_trades >= 1
)
SELECT 
  d.receiver_id,
  ur.bad_trades,
  MIN(d.amount) as min_deposit,
  MAX(d.amount) as max_deposit,
  AVG(d.amount) as avg_deposit,
  COUNT(*) as total_deposits
FROM deposits d
JOIN user_reputation ur ON ur.user_id = d.receiver_id
WHERE d.status IN ('locked', 'pending', 'confirmed')
GROUP BY d.receiver_id, ur.bad_trades
ORDER BY ur.bad_trades DESC;

# ================================================================
# TEST 7: Kiểm tra balance consistency
# ================================================================

echo ""
echo "🧪 TEST 7: Kiểm tra balance consistency"
echo "========================================"

-- Kiểm tra wallet_credit = tổng refund - tổng use
WITH wallet_calc AS (
  SELECT 
    user_id,
    COALESCE(SUM(CASE WHEN type = 'refund_deposit' THEN amount ELSE 0 END), 0) as total_refund,
    COALESCE(SUM(CASE WHEN type = 'use_for_deposit' THEN -amount ELSE 0 END), 0) as total_use,
    COALESCE(SUM(CASE WHEN type = 'top_up' THEN amount ELSE 0 END), 0) as total_topup
  FROM wallet_transactions
  GROUP BY user_id
)
SELECT 
  p.id,
  p.wallet_credit as current_balance,
  wc.total_refund,
  wc.total_use,
  wc.total_topup,
  (wc.total_refund + wc.total_use + wc.total_topup) as calculated_balance,
  CASE 
    WHEN p.wallet_credit = (wc.total_refund + wc.total_use + wc.total_topup) THEN '✅ PASS'
    ELSE '❌ FAIL - Sai lệch: ' || (p.wallet_credit - (wc.total_refund + wc.total_use + wc.total_topup))
  END as validation
FROM profiles p
LEFT JOIN wallet_calc wc ON wc.user_id = p.id
WHERE p.wallet_credit > 0 OR wc.total_refund > 0
ORDER BY p.updated_at DESC;

# ================================================================
# TEST 8: Kiểm tra RLS policies
# ================================================================

echo ""
echo "🧪 TEST 8: Kiểm tra RLS policies"
echo "=================================="

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'wallet_transactions'
ORDER BY policyname;

# ================================================================
# TEST 9: Kiểm tra data integrity
# ================================================================

echo ""
echo "🧪 TEST 9: Kiểm tra data integrity"
echo "===================================="

-- Kiểm tra không có wallet_used > amount
SELECT 
  COUNT(*) as invalid_count,
  'wallet_used > amount' as error_type
FROM deposits
WHERE wallet_used > amount AND wallet_used IS NOT NULL
UNION ALL
-- Kiểm tra cash_amount âm
SELECT 
  COUNT(*),
  'cash_amount < 0'
FROM deposits
WHERE cash_amount < 0 AND cash_amount IS NOT NULL
UNION ALL
-- Kiểm tra wallet_used + cash_amount != amount (cho những deposit có both)
SELECT 
  COUNT(*),
  'wallet_used + cash_amount != amount'
FROM deposits
WHERE wallet_used IS NOT NULL 
  AND cash_amount IS NOT NULL
  AND (wallet_used + cash_amount) != amount;

# ================================================================
# TEST 10: Kiểm tra user không thể see transaction của user khác
# ================================================================

echo ""
echo "🧪 TEST 10: Kiểm tra RLS - User isolation"
echo "=========================================="

-- Chạy query này với hai user khác nhau
-- User 1 sẽ chỉ thấy transaction của mình

SELECT 
  id,
  user_id,
  type,
  amount,
  created_at
FROM wallet_transactions
-- WHERE user_id = current_user_id (tự động qua RLS)
LIMIT 10;

# ================================================================
# CLEANUP (nếu cần)
# ================================================================

echo ""
echo "🧹 CLEANUP - Ghi chú:"
echo "====================="
echo ""
echo "Nếu cần reset data test, sử dụng:"
echo ""
echo "-- Reset user test:"
echo "UPDATE profiles SET wallet_credit = 0 WHERE id = 'USER_ID';"
echo ""
echo "-- Delete test deposits:"
echo "DELETE FROM deposits WHERE id IN ('DEPOSIT_IDS');"
echo ""
echo "-- Delete test transactions:"
echo "DELETE FROM wallet_transactions WHERE user_id = 'USER_ID';"

