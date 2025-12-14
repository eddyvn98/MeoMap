# P2P Testing Guide

## 📋 Overview

This guide covers automated testing for the P2P Withdrawal System. All tests are written using **Vitest**, a modern test framework that works perfectly with Vite.

---

## 🗂️ Test Files

### 1. **Unit Tests** → `src/services/__tests__/walletService.p2p.test.js`
Tests individual API functions in isolation:
- ✅ Create withdrawal requests
- ✅ Admin approvals
- ✅ Payment confirmations
- ✅ Receipt confirmations
- ✅ Dispute opening
- ✅ Status display
- ✅ QR code generation
- ✅ Error handling

**Run:** `npm test -- walletService.p2p.test.js`

### 2. **Integration Tests** → `src/__tests__/P2P_integration.test.js`
Tests complete workflows and multi-step scenarios:
- ✅ Full happy path (create → approve → pay → confirm)
- ✅ Dispute path (create → approve → pay → dispute)
- ✅ Error scenarios (insufficient balance, permission denied)
- ✅ Multiple concurrent orders
- ✅ Order code uniqueness
- ✅ Balance deduction mechanics
- ✅ Status state transitions

**Run:** `npm test -- P2P_integration.test.js`

---

## 🚀 Installation & Setup

### Step 1: Install Vitest
```bash
npm install -D vitest @vitest/ui
```

### Step 2: Update package.json
Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Step 3: Verify Installation
```bash
npm test -- --version
```

---

## 📊 Running Tests

### Run All Tests
```bash
npm test
```
This starts Vitest in **watch mode** - tests rerun automatically when files change.

### Run Tests Once (CI Mode)
```bash
npm run test:run
```
Good for CI/CD pipelines.

### Run Specific Test File
```bash
npm test -- walletService.p2p.test.js
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```
Generates HTML coverage report in `coverage/` folder.

### Run with Interactive UI
```bash
npm run test:ui
```
Opens browser UI at http://localhost:51204 (or similar).

---

## 🧪 Test Structure

Both test files use this structure:

```javascript
describe('Feature Group', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = someFunction(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

---

## 📝 Unit Tests Details

### Test File: `walletService.p2p.test.js` (500+ lines)

#### 1. **createWithdrawalRequestP2P** Tests (3 tests)
```javascript
✅ should create withdrawal request successfully
   - Input: userId, amount (300000), bank, accountNo, accountName
   - Mock: RPC returns {success: true, order_code: "WD-..."}
   - Verify: Result has orderCode, balance deducted

❌ should handle insufficient balance error
   - Input: amount > user balance
   - Mock: RPC returns error
   - Verify: Error message contains "Số dư không đủ"

❌ should handle RPC error
   - Input: valid request
   - Mock: RPC throws exception
   - Verify: Error caught and returned gracefully
```

#### 2. **getWithdrawalRequestsP2P** Tests (2 tests)
```javascript
✅ should retrieve withdrawals with data
   - Input: userId
   - Mock: RPC returns array of orders
   - Verify: Returns orders with all fields

✅ should return empty array when no withdrawals
   - Input: userId with no orders
   - Mock: RPC returns empty array
   - Verify: Returns []
```

#### 3. **Admin Operations** Tests (3 tests)
```javascript
✅ adminApproveWithdrawalP2P
   - Input: withdrawalId, adminId
   - Mock: RPC success
   - Verify: Status changes to WAITING_FOR_ADMIN_PAYMENT

✅ adminConfirmPaymentP2P
   - Input: withdrawalId, traceId, description, timestamp
   - Mock: RPC success
   - Verify: Status changes to AWAITING_USER_CONFIRMATION

✅ adminGetPendingWithdrawalsP2P
   - Input: none
   - Mock: RPC returns pending orders
   - Verify: Returns array of PENDING orders
```

#### 4. **User Operations** Tests (4 tests)
```javascript
✅ userConfirmReceiptP2P success
   - Input: withdrawalId, userId
   - Mock: RPC success
   - Verify: Status changes to COMPLETED

✅ userConfirmReceiptP2P permission denied
   - Input: different userId
   - Mock: RPC returns permission error
   - Verify: Error message contains "quyền"

✅ userOpenDisputeP2P success
   - Input: withdrawalId, userId, reason
   - Mock: RPC success
   - Verify: Status changes to DISPUTED

✅ userOpenDisputeP2P not found
   - Input: invalid withdrawalId
   - Mock: RPC returns not found
   - Verify: Error contains "không tìm thấy"
```

#### 5. **Status Display** Tests (6 tests)
Each status type is tested:
```javascript
✅ PENDING → ⏳ (yellow)
✅ WAITING_FOR_ADMIN_PAYMENT → 💳 (blue)
✅ AWAITING_USER_CONFIRMATION → ⏰ (purple)
✅ COMPLETED → ✅ (green)
✅ DISPUTED → ⚠️ (red)
✅ Unknown status → ❓ (gray)
```

#### 6. **QR Code Generation** Tests (3 tests)
```javascript
✅ should generate VietQR data correctly
   - Input: accountNo, amount, description
   - Verify: accountNo, bankCode (970416), amount, description formatted

✅ should use default bank code if not provided
   - Input: amount, description (no bankCode)
   - Verify: Uses VCB (970416)

✅ should format description as "PAY {orderCode}"
   - Input: any description
   - Verify: Output = "PAY WD-20250130-000245"
```

#### 7. **Error Handling** Tests (2 tests)
```javascript
❌ should handle network errors gracefully
   - Mock: RPC throws network error
   - Verify: {success: false, error: "..."}

❌ should handle database constraint errors
   - Mock: RPC returns constraint violation
   - Verify: {success: false, error: "..."}
```

---

## 🔄 Integration Tests Details

### Test File: `P2P_integration.test.js` (600+ lines)

#### 1. **Complete Happy Path** (1 test)
```
User creates order
    ↓
Admin approves (moves to WAITING_FOR_ADMIN_PAYMENT)
    ↓
Admin confirms payment (moves to AWAITING_USER_CONFIRMATION)
    ↓
User confirms receipt (moves to COMPLETED) ✅
```

#### 2. **Dispute Path** (1 test)
```
User creates order
    ↓
Admin approves
    ↓
Admin confirms payment
    ↓
User opens dispute (moves to DISPUTED) ⚠️
```

#### 3. **Error Scenarios** (4 tests)
- ❌ Insufficient balance rejection
- ❌ Wrong status approval rejection
- ❌ Permission denied confirmation
- ❌ Invalid dispute status

#### 4. **Multiple Orders** (1 test)
Creates 3 concurrent withdrawal orders and verifies:
- All succeed
- All have unique order codes
- All have different withdrawal IDs

#### 5. **Order Code Uniqueness** (1 test)
Creates 5 orders for same user and verifies:
- All order codes are different
- Format: WD-20250130-{sequence}

#### 6. **Balance Management** (2 tests)
```
Test 1: Balance deduction on creation
  Initial: 500,000 VND
  Order: 300,000 VND
  After: 200,000 VND ✅

Test 2: Second order rejected if exceeds remaining
  After first order: 200,000 VND remaining
  Second order request: 300,000 VND
  Result: REJECTED ❌
```

#### 7. **Status State Transitions** (2 tests)
```
Correct flow:
  PENDING
    ↓
  WAITING_FOR_ADMIN_PAYMENT (admin approves)
    ↓
  AWAITING_USER_CONFIRMATION (admin confirms payment)
    ↓
  COMPLETED (user confirms)
  
Alternative from AWAITING_USER_CONFIRMATION:
  AWAITING_USER_CONFIRMATION
    ↓
  DISPUTED (user opens dispute)
```

---

## 🎯 Expected Test Results

Running both test files should produce:

```
✓ walletService.p2p.test.js (25 tests)
  ✓ createWithdrawalRequestP2P (3)
  ✓ getWithdrawalRequestsP2P (2)
  ✓ adminApproveWithdrawalP2P (2)
  ✓ adminConfirmPaymentP2P (1)
  ✓ userConfirmReceiptP2P (2)
  ✓ userOpenDisputeP2P (2)
  ✓ getWithdrawalStatusDisplayP2P (6)
  ✓ generateVietQRData (3)
  ✓ adminGetPendingWithdrawalsP2P (1)
  ✓ Error Handling (2)

✓ P2P_integration.test.js (11 tests)
  ✓ Complete Happy Path (1)
  ✓ Dispute Path (1)
  ✓ Error Scenarios (4)
  ✓ Multiple Orders (1)
  ✓ Order Code Uniqueness (1)
  ✓ Balance Management (2)
  ✓ Status State Transitions (2)

══════════════════════════════════════════════════════════════════════════════
✓ 36 tests passed (0.5s)
```

---

## 🔧 Troubleshooting

### Tests don't run
```bash
# Clear cache and reinstall
npm install
npm test -- --clearCache
```

### Import errors
- Make sure `walletService.js` has all functions exported
- Check that `supabaseClient.js` exists
- Verify relative paths match your file structure

### Mock errors
- Ensure `vi.mock()` paths match actual files
- Clear mocks between tests with `vi.clearAllMocks()`
- Check that Supabase RPC function names match

### Timeout errors
```bash
npm test -- --testTimeout=10000
```

---

## 📈 Coverage Report

View detailed coverage:
```bash
npm run test:coverage
open coverage/index.html  # macOS
# or
start coverage/index.html # Windows
```

This shows:
- Line coverage (all code executed)
- Branch coverage (all if/else paths)
- Function coverage (all functions called)
- Statement coverage (all statements executed)

---

## 🎓 Key Testing Concepts Used

### 1. **Mocking**
```javascript
vi.mock('../../supabaseClient'); // Mock module
supabase.rpc.mockResolvedValueOnce({...}); // Mock specific call
```

### 2. **Test Organization**
```javascript
describe('Feature'); // Test suite
it('should do X'); // Individual test
beforeEach(() => {}); // Setup before each test
```

### 3. **Assertions**
```javascript
expect(result).toBe(true);
expect(error).toContain('message');
expect(calls).toHaveBeenCalledTimes(3);
```

### 4. **Async Testing**
```javascript
it('should wait for async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBe(expected);
});
```

---

## 📚 Next Steps

1. **Install dependencies**
   ```bash
   npm install -D vitest @vitest/ui
   ```

2. **Run unit tests**
   ```bash
   npm test -- walletService.p2p.test.js
   ```

3. **Run integration tests**
   ```bash
   npm test -- P2P_integration.test.js
   ```

4. **Deploy to Supabase**
   - Run SQL migration: [P2P_WITHDRAWAL_MIGRATION.sql](../database/P2P_WITHDRAWAL_MIGRATION.sql)
   - Creates 3 tables + 5 RPC functions

5. **Manual testing**
   - Create test user with 500,000 VND balance
   - Navigate to `/my-wallet-p2p`
   - Create withdrawal order
   - Test admin approval flow

---

## 🚀 CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run Tests
  run: npm run test:run

- name: Generate Coverage
  run: npm run test:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

---

## 📞 Support

For issues or questions:
1. Check test output for detailed error messages
2. Review test file comments for expected behavior
3. Verify mock data matches your actual data structure
4. Check Supabase RPC function signatures
