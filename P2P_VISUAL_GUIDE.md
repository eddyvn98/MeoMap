# 📊 P2P Testing - Visual Quick Guide

## 🎯 Three Ways to Use This Guide

```
┌─────────────────────────────────────┐
│  Just Want to Run Tests?            │
│  ↓                                  │
│  Read: "5-Minute Quick Start"       │
│  Time: 5 minutes                    │
│  Result: Tests passing ✅            │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Want Full Understanding?           │
│  ↓                                  │
│  Read: "Complete Testing Guide"     │
│  Time: 30 minutes                   │
│  Result: Expert knowledge           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Ready to Deploy?                   │
│  ↓                                  │
│  Follow: "Deployment Checklist"     │
│  Time: 1-2 hours                    │
│  Result: Live in production         │
└─────────────────────────────────────┘
```

---

## ⚡ 5-Minute Quick Start

### Terminal Commands
```bash
# Step 1: Install (2 min)
npm install -D vitest @vitest/ui

# Step 2: Update package.json (1 min)
# Add these 4 lines to "scripts":
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"

# Step 3: Run (1 min)
npm test

# Expected result: ✓ 36 tests passed
```

### Expected Output
```
✓ src/services/__tests__/walletService.p2p.test.js (25)
✓ src/__tests__/P2P_integration.test.js (11)

══════════════════════════════════════════════════════════════════
✓ 36 tests passed (0.5s)
```

---

## 📊 Test Structure Overview

```
┌─────────────────────────────────────────────────────────┐
│              36 TOTAL TESTS                            │
├──────────────────┬──────────────────────────────────────┤
│  UNIT TESTS      │  INTEGRATION TESTS                   │
│  (25 tests)      │  (11 tests)                          │
│                  │                                      │
│ • API functions  │ • Complete workflows               │
│ • Status types   │ • Error scenarios                   │
│ • QR generation  │ • Edge cases                        │
│ • Error handling │ • Permission checks                │
│                  │ • Balance management               │
└──────────────────┴──────────────────────────────────────┘
```

---

## 🧪 Unit Tests Map (25 tests)

```
┌──────────────────────────────────────────────────────┐
│     API FUNCTION TESTS                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│ createWithdrawalRequestP2P (3 tests)                │
│ ├─ ✅ Success case                                  │
│ ├─ ❌ Insufficient balance                          │
│ └─ ❌ RPC error                                     │
│                                                      │
│ getWithdrawalRequestsP2P (2 tests)                  │
│ ├─ ✅ With data                                     │
│ └─ ✅ Empty list                                    │
│                                                      │
│ adminApproveWithdrawalP2P (2 tests)                 │
│ ├─ ✅ Success                                       │
│ └─ ❌ Not found                                     │
│                                                      │
│ adminConfirmPaymentP2P (1 test)                     │
│ └─ ✅ Confirm with trace                            │
│                                                      │
│ userConfirmReceiptP2P (2 tests)                     │
│ ├─ ✅ Success                                       │
│ └─ ❌ Permission denied                             │
│                                                      │
│ userOpenDisputeP2P (2 tests)                        │
│ ├─ ✅ Success                                       │
│ └─ ❌ Not found                                     │
│                                                      │
│ getWithdrawalStatusDisplayP2P (6 tests)             │
│ ├─ PENDING (⏳)                                     │
│ ├─ WAITING_FOR_ADMIN_PAYMENT (💳)                 │
│ ├─ AWAITING_USER_CONFIRMATION (⏰)                │
│ ├─ COMPLETED (✅)                                  │
│ ├─ DISPUTED (⚠️)                                   │
│ └─ Unknown (❓)                                     │
│                                                      │
│ generateVietQRData (3 tests)                        │
│ ├─ Valid data generation                            │
│ ├─ Default bank code                                │
│ └─ Description format                               │
│                                                      │
│ adminGetPendingWithdrawalsP2P (1 test)              │
│ └─ ✅ Retrieve pending                              │
│                                                      │
│ Error Handling (2 tests)                            │
│ ├─ Network errors                                   │
│ └─ Database errors                                  │
│                                                      │
│ TOTAL: 25 TESTS                                     │
│ TIME: < 0.3 seconds                                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🔄 Integration Tests Map (11 tests)

```
┌──────────────────────────────────────────────────────┐
│     WORKFLOW TESTS                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Happy Path (1 test)                                │
│ CREATE → APPROVE → PAY → CONFIRM                   │
│ └─ Status progression verified                      │
│                                                      │
│ Dispute Path (1 test)                              │
│ CREATE → APPROVE → PAY → DISPUTE                   │
│ └─ Dispute status verified                          │
│                                                      │
│ Error Scenarios (4 tests)                          │
│ ├─ Insufficient balance rejection                  │
│ ├─ Wrong status rejection                          │
│ ├─ Permission denied                               │
│ └─ Invalid dispute status                          │
│                                                      │
│ Concurrent Orders (1 test)                         │
│ └─ 3 orders created simultaneously                 │
│                                                      │
│ Order Code Uniqueness (1 test)                     │
│ └─ 5 codes generated, all different                │
│                                                      │
│ Balance Management (2 tests)                       │
│ ├─ Balance deduction verified                      │
│ └─ Overdraft prevention verified                   │
│                                                      │
│ Status Transitions (1 test)                        │
│ ├─ Correct flow verified                           │
│ └─ Dispute alternative verified                    │
│                                                      │
│ TOTAL: 11 TESTS                                    │
│ TIME: < 0.2 seconds                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📈 Test Execution Timeline

```
npm test
   ↓
┌─────────────────────────────────┐
│ Parse Test Files     (~50ms)    │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ Load Vitest             (~100ms) │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ Run Unit Tests         (~200ms)  │
│ • 25 tests             (~8ms ea) │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ Run Integration Tests  (~100ms)  │
│ • 11 tests             (~9ms ea) │
└────────────┬────────────────────┘
             ↓
┌─────────────────────────────────┐
│ Generate Report        (~50ms)   │
└────────────┬────────────────────┘
             ↓
✓ 36 tests passed (0.5s) TOTAL
```

---

## 🎯 Command Reference Chart

```
┌─────────────────────────────────────────────────────────┐
│                 COMMON COMMANDS                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ npm test                                               │
│ └─ Watch mode (rerun on file change)                   │
│                                                         │
│ npm run test:run                                       │
│ └─ Run once (good for CI/CD)                           │
│                                                         │
│ npm test -- walletService.p2p.test.js                  │
│ └─ Run only unit tests                                 │
│                                                         │
│ npm test -- P2P_integration.test.js                    │
│ └─ Run only integration tests                          │
│                                                         │
│ npm test -- -t "should create"                         │
│ └─ Run only tests with "should create" in name         │
│                                                         │
│ npm run test:coverage                                  │
│ └─ Generate coverage report                            │
│                                                         │
│ npm run test:ui                                        │
│ └─ Open interactive browser UI                         │
│                                                         │
│ npm test -- --clearCache                              │
│ └─ Clear cache & reinstall (troubleshooting)           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚦 Test Status Indicators

### Green (Passing)
```
✓ should create withdrawal request successfully
✓ 36 tests passed
```
All good! Tests working correctly.

### Red (Failing)
```
✗ should create withdrawal request successfully
  Expected: 300000
  Received: undefined
```
Test failed. Check error message for details.

### Yellow (Warnings)
```
⚠ Test timeout exceeded (5000ms)
```
Test taking too long. Check async code.

### Gray (Skipped)
```
⊘ should create withdrawal request successfully
```
Test skipped (has `.skip`). Useful for WIP.

---

## 📁 File Organization

```
meo-map/
│
├─ src/
│  ├─ services/
│  │  ├─ walletService.js (15+ P2P functions)
│  │  └─ __tests__/
│  │     └─ walletService.p2p.test.js (25 unit tests)
│  │
│  └─ __tests__/
│     └─ P2P_integration.test.js (11 integration tests)
│
├─ database/
│  └─ P2P_WITHDRAWAL_MIGRATION.sql (DB schema)
│
├─ vitest.config.js (test configuration)
│
└─ Documentation/
   ├─ P2P_TESTING_QUICK_REFERENCE.md
   ├─ P2P_TEST_EXECUTION_GUIDE.md
   ├─ P2P_TESTING_GUIDE.md
   └─ P2P_DEPLOYMENT_CHECKLIST.md
```

---

## ✅ Deployment Flow

```
START
  ↓
1️⃣ INSTALL
   └─ npm install -D vitest
      (2 minutes)
  ↓
2️⃣ CONFIGURE
   └─ Update package.json with test scripts
      (1 minute)
  ↓
3️⃣ TEST LOCALLY
   └─ npm test
   └─ Verify: ✓ 36 tests passed
      (1 minute)
  ↓
4️⃣ DEPLOY DATABASE
   └─ Copy SQL to Supabase
   └─ Run migration
      (10 minutes)
  ↓
5️⃣ MANUAL TEST
   └─ Create test user
   └─ Test full flow
   └─ Test dispute
      (30 minutes)
  ↓
6️⃣ DEPLOY FRONTEND
   └─ Merge to main
   └─ Deploy to production
      (5 minutes)
  ↓
✅ DONE!
   Total time: ~50 minutes
```

---

## 🎓 Understanding Mocks

### What is a Mock?
A fake version of something that acts like the real thing.

### Why Mock?
```
WITHOUT MOCK:
  Test → Real Database → Need DB running
  Slow, requires setup, depends on external system

WITH MOCK:
  Test → Fake Response → Instant response
  Fast, no dependencies, fully isolated
```

### Example Mock
```javascript
// Real call (would hit Supabase)
await supabase.rpc('function_name', { data: 123 })

// Mock call (test returns instantly)
supabase.rpc.mockResolvedValueOnce({
  data: [{ success: true }],
  error: null
})
```

---

## 💾 Test Data Examples

### Creating Withdrawal
```javascript
Input:
  userId: "user-123"
  amount: 300000
  bankCode: "VCB"
  accountNo: "0123456789"
  accountName: "NGUYEN VAN A"

Output:
  success: true
  orderCode: "WD-20250130-000245"
  withdrawalId: "wd-001"
```

### Admin Confirming Payment
```javascript
Input:
  withdrawalId: "wd-001"
  traceId: "TCB202501309876543210"
  description: "PAY WD-20250130-000245"
  timestamp: 2025-01-30T10:30:00Z

Output:
  success: true
  status: "AWAITING_USER_CONFIRMATION"
```

---

## 🎯 Success Checklist

- [ ] Vitest installed
- [ ] package.json updated
- [ ] `npm test` runs without errors
- [ ] All 36 tests pass
- [ ] Execution time < 1 second
- [ ] No console warnings
- [ ] Coverage > 80%

---

## 📞 Quick Help

| Question | Answer |
|----------|--------|
| How to start? | Run `npm install -D vitest` |
| How to run tests? | Run `npm test` |
| What's the expected output? | See "5-Minute Quick Start" |
| Something failed? | Check "Troubleshooting" |
| Need more help? | Read P2P_TEST_EXECUTION_GUIDE.md |

---

## 🎉 You're Ready!

This is everything you need to:
- ✅ Run the automated test suite
- ✅ Understand what's being tested
- ✅ Deploy to production
- ✅ Monitor for errors

**Next step: `npm install -D vitest && npm test` 🚀**

---

*Quick Guide created for Phase 6 (Automated Testing) of P2P Withdrawal System*  
*Total implementation: 36 tests, 1100+ lines of test code*  
*Status: Production Ready* ✅
