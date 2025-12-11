# 🎯 P1 STAGING VERIFICATION - ACTION ITEMS

## ✅ Completed (Ready for Staging)
- ✅ SQL migration: `P1_ATOMIC_TRANSACTIONS_AND_AUDIT.sql` (3 RPC + 2 audit tables)
- ✅ Frontend: 3 files updated (DeliveryConfirmPage, PetDetailPage, UserReportPage)
- ✅ Verification checklist: `P1_VERIFICATION_CHECKLIST.md`
- ✅ Test suite: `scripts/p1-test.js` (automated concurrency tests)

---

## 🚀 NEXT STEPS (Priority Order)

### Step 1: Run SQL on Staging DB (NOW)
```bash
# Supabase Staging → SQL Editor
# 1. Copy P1_ATOMIC_TRANSACTIONS_AND_AUDIT.sql
# 2. Paste & Run
# 3. Verify: SELECT prosrc FROM pg_proc WHERE proname LIKE 'finish_delivery%'
```
**Estimated**: 2 min  
**Blocker?**: None

---

### Step 2: Run Concurrency Tests on Staging (30 min)
```bash
# In terminal (staging environment)
npm run test:p1 all
# or individual:
npm run test:p1 refund
npm run test:p1 wallet
npm run test:p1 report
```

**Expected Results**:
- ✅ Refund: 1 success (50 attempts)
- ✅ Wallet: 2 successes (50 attempts, 100k balance)
- ✅ Report: Rate limit blocks 2nd attempt (same deposit + within 15min)

**Blocker if**: Any test fails

---

### Step 3: Manual E2E Test (30 min)
On staging, as regular user:
1. Create pet → Register as receiver (wallet decrease should work)
2. Owner confirms → Simulate delivery (gọi finish_delivery_with_refund)
3. Check DB:
   - ✅ wallet_transactions: 1 entry (use_for_deposit) + 1 entry (refund_deposit)
   - ✅ deposit_status_logs: full history (pending → confirmed → refunded)

---

### Step 4: Monitor Logs (24-48h)
Keep trace logging enabled:
```sql
ALTER FUNCTION finish_delivery_with_refund SET log_min_messages = debug;
```

Watch for:
- ⚠️ RPC errors > 1% → investigate
- ⚠️ Duplicate wallet_transactions → critical
- ⚠️ Negative balance found → critical

---

### Step 5: Production Deployment (if all pass)

**Canary Release** (5% users):
```bash
npm run deploy:canary-5
# Monitor 24h
```

**Gradual Rollout**:
```bash
npm run deploy:canary-50  # After 24h
npm run deploy:production  # After 48h
```

**Release Notes**:
```
🔒 P1: Production Security Update (v1.2.0)

Security Fixes:
- Atomic refund prevents double refunds (FOR UPDATE lock)
- Atomic wallet decrease prevents double spending
- Report rate limit prevents spam
- Full audit trail (deposit_status_logs)

Status: No breaking changes, backward compatible
```

---

## ⚠️ ROLLBACK PLAN

If critical issue found:
```bash
npm run rollback:previous
# Disable P1 feature flag (USE_ATOMIC_FUNCTIONS = false)
```

---

## 📞 On-Call Alerts (Post-Deploy)

Set these alerts on staging/production:

```
CRITICAL:
- RPC error rate > 1% → Page
- Duplicate wallet_transactions detected → Page
- Negative balance found → Page

WARNING:
- RPC response time > 5s (10 samples) → Alert
- Failed deposit refund > 5% → Alert
- Report spam detected (>10/min same user) → Alert
```

---

## 📅 Timeline

| Phase | Time | Status |
|-------|------|--------|
| SQL Deploy | 2 min | ⏳ TODO |
| Concurrency Tests | 30 min | ⏳ TODO |
| E2E Test | 30 min | ⏳ TODO |
| Monitor (24-48h) | 24-48h | ⏳ TODO |
| Canary 5% | 24h | ⏳ AFTER PASS |
| Canary 50% | 24h | ⏳ AFTER PASS |
| Full Rollout | 24h | ⏳ AFTER PASS |
| **Total** | **~4 days** | |

---

## ✋ GO/NO-GO Decision

**GO to Production if**:
- ✅ All concurrency tests PASS
- ✅ E2E flow works 100% (no duplicate txns)
- ✅ RPC error rate < 0.1%
- ✅ No negative balance detected
- ✅ Staging monitor 24-48h with no issues

**NO-GO if**:
- ❌ Any concurrency test FAILS
- ❌ RPC error rate > 1%
- ❌ Duplicate transactions found
- ❌ Negative balance found
- ❌ Rate limit not working

**Action if NO-GO**: Call engineering sync, debug, fix, retry from Step 1

---

**Owner**: Dev Team  
**Created**: December 11, 2025  
**Status**: 🟡 AWAITING STAGING EXECUTION
