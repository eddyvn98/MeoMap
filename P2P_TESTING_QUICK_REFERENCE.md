# 🧪 P2P Testing - Quick Reference

## Files Created

### Test Files
| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `src/services/__tests__/walletService.p2p.test.js` | 500+ | 25 | Unit tests for all P2P API functions |
| `src/__tests__/P2P_integration.test.js` | 600+ | 11 | Integration tests for complete workflows |

### Configuration
| File | Purpose |
|------|---------|
| `vitest.config.js` | Vitest configuration |

### Documentation
| File | Purpose |
|------|---------|
| `P2P_TESTING_GUIDE.md` | Complete testing guide (2000+ lines) |
| `P2P_TESTING_QUICK_REFERENCE.md` | This file - quick commands |

---

## ⚡ Quick Start (3 steps)

### 1️⃣ Install Vitest
```bash
npm install -D vitest @vitest/ui
```

### 2️⃣ Update package.json
Add to `"scripts"`:
```json
{
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

### 3️⃣ Run Tests
```bash
npm test
```

---

## 🎯 Common Commands

| Command | What It Does |
|---------|--------------|
| `npm test` | Watch mode - tests rerun on file changes |
| `npm run test:run` | Run once (good for CI/CD) |
| `npm test -- walletService.p2p.test.js` | Run only unit tests |
| `npm test -- P2P_integration.test.js` | Run only integration tests |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:ui` | Open interactive UI |

---

## 📊 Test Summary

### Unit Tests (25 tests)
```
✓ createWithdrawalRequestP2P (3)
  - Success case
  - Insufficient balance
  - RPC error

✓ getWithdrawalRequestsP2P (2)
  - With data
  - Empty list

✓ adminApproveWithdrawalP2P (2)
  - Success
  - Not found

✓ adminConfirmPaymentP2P (1)
  - Confirm with trace ID

✓ userConfirmReceiptP2P (2)
  - Success
  - Permission denied

✓ userOpenDisputeP2P (2)
  - Success
  - Not found

✓ getWithdrawalStatusDisplayP2P (6)
  - PENDING
  - WAITING_FOR_ADMIN_PAYMENT
  - AWAITING_USER_CONFIRMATION
  - COMPLETED
  - DISPUTED
  - Unknown

✓ generateVietQRData (3)
  - Valid data
  - Default bank code
  - Description format

✓ adminGetPendingWithdrawalsP2P (1)

✓ Error Handling (2)
  - Network errors
  - Database errors
```

### Integration Tests (11 tests)
```
✓ Complete Happy Path (1)
  PENDING → WAITING → AWAITING → COMPLETED

✓ Dispute Path (1)
  PENDING → WAITING → AWAITING → DISPUTED

✓ Error Scenarios (4)
  - Insufficient balance
  - Wrong status
  - Permission denied
  - Invalid dispute status

✓ Multiple Orders (1)
  3 concurrent orders

✓ Order Code Uniqueness (1)
  5 unique codes

✓ Balance Management (2)
  - Balance deduction
  - Exceeding balance rejection

✓ Status Transitions (2)
  - Correct flow
  - Dispute alternative
```

---

## 🔄 Test Workflow

```
1. Create withdrawal request
   ↓
2. Admin approves
   ↓
3. Admin confirms payment with trace ID
   ↓
4. User confirms receipt
   ↓
COMPLETED ✅

OR

4. User opens dispute
   ↓
DISPUTED ⚠️
```

---

## 💡 Mock Data Examples

### User Creates Withdrawal
```javascript
{
  userId: 'user-123',
  amount: 300000,
  bankCode: 'VCB',
  accountNo: '0123456789',
  accountName: 'NGUYEN VAN A'
}

Response:
{
  success: true,
  orderCode: 'WD-20250130-000245',
  withdrawalId: 'wd-001'
}
```

### QR Code Data
```javascript
{
  accountNo: '0123456789',
  bankCode: '970416', // VCB
  amount: 300000,
  description: 'PAY WD-20250130-000245'
}
```

---

## 🎓 Understanding Mocks

Tests use **mocks** to avoid hitting real database:

```javascript
// Before test
vi.mock('../../supabaseClient');

// In test
supabase.rpc.mockResolvedValueOnce({
  data: [{ success: true, ... }],
  error: null
});

// Call function (uses mock, not real DB)
await createWithdrawalRequestP2P(...);
```

**Benefits:**
- ✅ No database needed for testing
- ✅ Fast execution (< 1 second)
- ✅ Repeatable (same results every time)
- ✅ Isolated (no side effects)

---

## 📈 Expected Output

```
✓ src/services/__tests__/walletService.p2p.test.js (25)
✓ src/__tests__/P2P_integration.test.js (11)

══════════════════════════════════════════════════════════════════
✓ 36 tests passed (0.5s)
```

---

## 🚨 Troubleshooting

### "Cannot find module" error
→ Check file paths in vi.mock() match actual files

### "RPC is not a function" error
→ Verify supabase.rpc is mocked in beforeEach

### Tests hang / timeout
→ Add `--testTimeout=10000` or check async/await syntax

### Mocks not clearing
→ Ensure `vi.clearAllMocks()` in beforeEach

---

## 📚 Full Documentation

For detailed info, see:
- **`P2P_TESTING_GUIDE.md`** - Complete testing guide (2000+ lines)
- **`P2P_WITHDRAWAL_GUIDE.md`** - Technical architecture
- **`P2P_QUICK_REFERENCE.md`** - API quick reference

---

## ✅ Checklist

- [ ] Install Vitest: `npm install -D vitest @vitest/ui`
- [ ] Update package.json scripts
- [ ] Run tests: `npm test`
- [ ] Verify all 36 tests pass
- [ ] Check coverage: `npm run test:coverage`
- [ ] Deploy SQL to Supabase
- [ ] Manual testing on `/my-wallet-p2p`
- [ ] Deploy to production! 🚀

---

## 🎯 Next Steps

1. **Now:** Run tests locally
   ```bash
   npm test
   ```

2. **Next:** Deploy database
   - Copy `P2P_WITHDRAWAL_MIGRATION.sql` to Supabase
   - Run SQL (creates 3 tables + 5 RPC functions)

3. **Then:** Manual testing
   - Create test user with 500k balance
   - Test full withdrawal flow
   - Test dispute scenario

4. **Finally:** Production deployment
   - Merge to main
   - Deploy frontend
   - Monitor logs

---

*Happy testing! 🎉*
