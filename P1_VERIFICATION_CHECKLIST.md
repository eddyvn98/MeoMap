# ✅ P1 Verification Checklist - Staging & Production

**Status**: 🔴 STAGING VERIFICATION IN PROGRESS  
**Target**: Production deployment after all checks pass  

---

## 🚨 MUST-CHECK (Before Staging)

### ✓ RPC Exists & Has FOR UPDATE Lock
```bash
# Run on Supabase SQL Editor (staging DB)
SELECT prosrc FROM pg_proc WHERE proname = 'finish_delivery_with_refund';
SELECT prosrc FROM pg_proc WHERE proname = 'atomic_decrease_wallet';
SELECT prosrc FROM pg_proc WHERE proname = 'can_submit_report';
```
**Expected**: All 3 RPC functions exist, prosrc contains "FOR UPDATE"  
**Status**: ⏳ PENDING

---

### ✓ Frontend Calls RPC with Correct Payload
**File**: `DeliveryConfirmPage.jsx` (line 67-119)
```javascript
// Verify this call exists:
await supabase.rpc('finish_delivery_with_refund', {
  p_deposit_id: deposit.id,
  p_user_id: currentUser.id
});
```
**Status**: ✅ DONE (code reviewed)

**File**: `PetDetailPage.jsx` (line 473-498)
```javascript
// Verify this call exists:
await supabase.rpc('atomic_decrease_wallet', {
  p_user_id: currentUser.id,
  p_amount: walletUsed,
  p_reason: 'Dùng ví để đặt cọc nhận mèo.',
  p_related_id: deposit.id,
  p_related_type: 'deposit'
});
```
**Status**: ✅ DONE (code reviewed)

**File**: `UserReportPage.jsx` (line 72-96)
```javascript
// Verify this call exists:
await supabase.rpc('can_submit_report', {
  p_deposit_id: deposit.id,
  p_user_id: currentUserId
});
```
**Status**: ✅ DONE (code reviewed)

---

### ✓ Verify Log Tables Exist
```sql
-- Run on Supabase
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deposit_status_logs');
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_action_logs');
```
**Expected**: true, true  
**Status**: ⏳ PENDING

---

## 🧪 TEST PHASE (Run on Staging Database)

### Test 1: Concurrency - Refund (CRITICAL)
**Kịch bản**: 50 concurrent requests gọi `finish_delivery_with_refund` cho cùng 1 deposit

**Script**:
```bash
# Run on staging
npm run test:concurrency-refund
# hoặc manual: curl loop 50 lần
```

**Verify**:
```sql
SELECT COUNT(*) as refund_count, 
       SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as status_refunded
FROM wallet_transactions 
WHERE type = 'refund_deposit' AND related_id = '<test_deposit_id>';

SELECT status, COUNT(*) 
FROM deposit_status_logs 
WHERE deposit_id = '<test_deposit_id>' 
GROUP BY status;
```

**Expected**:
- `refund_count` = 1 (exactly 1 refund)
- `status_refunded` = 1
- deposit_status_logs has 2 entries: `pending → refunded`

**Status**: ⏳ TODO

---

### Test 2: Concurrency - Wallet Decrease (CRITICAL)
**Kịch bản**: 50 concurrent requests trừ ví từ 1 user, tổng trừ > balance

**Setup**: User có 100,000 đ, mỗi request trừ 50,000 đ (tổng = 2,500,000 đ)

**Script**:
```bash
npm run test:concurrency-wallet
```

**Verify**:
```sql
SELECT wallet_credit FROM profiles WHERE id = '<test_user_id>';
SELECT COUNT(*) as success_count 
FROM wallet_transactions 
WHERE user_id = '<test_user_id>' AND type = 'use_for_deposit';

SELECT COUNT(*) as failed_count FROM <error_log>
WHERE error LIKE '%Insufficient balance%';
```

**Expected**:
- `wallet_credit` = 100,000 - (2 × 50,000) = 0 (only 2 succeeded)
- `success_count` = 2 (not 50)
- `failed_count` = 48 (rejected with "Insufficient balance")

**Status**: ⏳ TODO

---

### Test 3: Rate Limit - Report Spam (HIGH)
**Kịch bản**: 
1. Submit báo cáo cho deposit A lần 1 → ✅ OK
2. Submit báo cáo cho deposit A lần 2 (same user) → ❌ Block
3. Submit báo cáo cho deposit B trong 1 phút → ❌ Block (rate limit 1/15min)

**Script**:
```bash
npm run test:report-rate-limit
```

**Verify**:
```sql
SELECT COUNT(*) as report_count 
FROM adoption_reports 
WHERE deposit_id = '<test_deposit_a>' AND reporter_id = '<test_user_id>';

SELECT COUNT(*) as report_per_user 
FROM adoption_reports 
WHERE reporter_id = '<test_user_id>' AND created_at > now() - INTERVAL '15 minutes';
```

**Expected**:
- `report_count` = 1 (only 1 for deposit A)
- `report_per_user` = 1 (max 1 per 15 min)

**Status**: ⏳ TODO

---

### Test 4: E2E Flow (Full Adoption Cycle)
**Flow**:
1. User A tạo pet → post (owner_id = A)
2. User B xem → đăng ký nhận (trừ ví 50k) → ✅ Verify wallet decreased
3. User A xác nhận → deposit status = "confirmed"
4. User A & B gặp → User A xác nhận giao (click QR) → ✅ Verify hoàn cọc
5. Verify log: 
   - `wallet_transactions` có 1 entry "use_for_deposit" (B trừ ví)
   - `wallet_transactions` có 1 entry "refund_deposit" (hoàn cọc cho A)
   - `deposit_status_logs` có full history: pending → confirmed → refunded

**Status**: ⏳ TODO

---

### Test 5: Error Handling (Recovery)
**Kịch bản**: Simulate RPC error → UI không tự update → Show error + retry

**Simulate**:
- Kill DB connection mid-RPC
- Timeout on RPC call (>5s)
- RPC throws exception

**Verify**: 
```javascript
// In browser console:
// 1. Balance NOT changed in UI
// 2. Error message displayed
// 3. User can retry
```

**Status**: ⏳ TODO

---

## 📊 Log & Monitoring (24-48h Post-Deploy)

### Trace Logging
```sql
-- Enable trace on RPC calls
ALTER FUNCTION finish_delivery_with_refund SET log_min_messages = debug;
ALTER FUNCTION atomic_decrease_wallet SET log_min_messages = debug;
```

### Key Metrics to Monitor
```sql
-- Query every 1 hour during first 48h
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_calls,
  SUM(CASE WHEN prosrc LIKE '%error%' THEN 1 ELSE 0 END) as rpc_errors,
  SUM(CASE WHEN status != 'success' THEN 1 ELSE 0 END) as failed_txn
FROM pg_stat_statements
WHERE query LIKE '%finish_delivery_with_refund%'
  OR query LIKE '%atomic_decrease_wallet%'
GROUP BY hour
ORDER BY hour DESC;

-- Check for duplicate wallet_transactions (shouldn't exist)
SELECT related_id, COUNT(*) as cnt 
FROM wallet_transactions 
WHERE type = 'use_for_deposit' 
GROUP BY related_id 
HAVING COUNT(*) > 1;

-- Check for negative balance (shouldn't exist)
SELECT id, wallet_credit 
FROM profiles 
WHERE wallet_credit < 0;
```

**Alert Thresholds**:
- RPC error rate > 1% → Page on-call
- Duplicate transactions detected → Page on-call
- Negative balance found → Critical alert

---

## ✅ Sign-Off Checklist

### Before Staging
- [ ] SQL migration ran successfully (RPC + tables created)
- [ ] 3 RPC functions exist with FOR UPDATE
- [ ] All 3 frontend files updated + code review passed

### Staging (72 hours)
- [ ] Concurrency test - Refund: PASS
- [ ] Concurrency test - Wallet: PASS
- [ ] Rate limit test - Report: PASS
- [ ] E2E flow: PASS
- [ ] Error handling: PASS
- [ ] No duplicate transactions in logs
- [ ] No negative balances
- [ ] RPC error rate < 0.1%

### Production Deployment
- [ ] Canary release (5% users) + monitor 24h
- [ ] Canary release (50% users) + monitor 24h
- [ ] Full rollout (100%) + monitor 24h
- [ ] Release notes published
- [ ] Post-mortem meeting (if any issues)

---

## 🚀 Next Steps (if all tests PASS)

1. **Canary Release**
   ```bash
   # Deploy to 5% of users
   npm run deploy:canary-5
   # Monitor for 24h
   ```

2. **Gradual Rollout**
   ```bash
   # After 24h: 50%
   npm run deploy:canary-50
   # After 48h: 100%
   npm run deploy:production
   ```

3. **Release Notes** (example)
   ```
   ## P1: Production Security Update (v1.2.0)
   
   ### Security Fixes
   - ✅ Atomic refund: prevents double refunds (race condition)
   - ✅ Atomic wallet decrease: prevents double spending
   - ✅ Report rate limit: prevents spam
   - ✅ Full audit trail: deposit_status_logs + admin_action_logs
   
   ### Breaking Changes
   - None (backward compatible)
   
   ### Monitoring
   - RPC error rate < 0.1%
   - No duplicate wallet_transactions
   - No negative balances
   ```

---

## 📞 Rollback Plan (if issues detected)

```bash
# Quick rollback to previous version
npm run rollback:previous

# Disable P1 RPC (stop using atomic functions)
# Set feature flag: USE_ATOMIC_FUNCTIONS = false
# Frontend will fallback to old logic (non-atomic)
```

---

**Last Updated**: December 11, 2025  
**Owner**: Dev Team  
**Status**: 🟡 AWAITING STAGING TESTS
