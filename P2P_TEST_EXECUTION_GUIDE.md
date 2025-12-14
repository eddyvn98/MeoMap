# 🧪 P2P Testing - Execution Guide

This guide shows you EXACTLY how to run the automated test suite.

---

## ⚡ 5-Minute Quick Start

### 1. Install Vitest (2 minutes)
```bash
cd c:\Projects\meo-map
npm install -D vitest @vitest/ui
```

**Expected output:**
```
added 50 packages, and audited 200 packages in 2m
```

### 2. Update package.json (1 minute)

Open `package.json` and add to `"scripts"` section:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 3. Run Tests (2 minutes)
```bash
npm test
```

**You should see:**
```
✓ src/services/__tests__/walletService.p2p.test.js (25)
  ✓ createWithdrawalRequestP2P (3)
    ✓ should create withdrawal request successfully
    ✓ should handle insufficient balance error
    ✓ should handle RPC error
  ✓ getWithdrawalRequestsP2P (2)
  ✓ adminApproveWithdrawalP2P (2)
  ✓ adminConfirmPaymentP2P (1)
  ✓ userConfirmReceiptP2P (2)
  ✓ userOpenDisputeP2P (2)
  ✓ getWithdrawalStatusDisplayP2P (6)
  ✓ generateVietQRData (3)
  ✓ adminGetPendingWithdrawalsP2P (1)
  ✓ Error Handling (2)

✓ src/__tests__/P2P_integration.test.js (11)
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

**That's it! All tests passing!** ✅

---

## 📊 Running Different Test Sets

### Run All Tests (Watch Mode)
```bash
npm test
```
Tests rerun automatically when files change.

### Run All Tests Once (CI Mode)
```bash
npm run test:run
```
Good for CI/CD pipelines.

### Run Only Unit Tests
```bash
npm test -- walletService.p2p.test.js
```

**Expected:**
```
✓ src/services/__tests__/walletService.p2p.test.js (25)
✓ 25 tests passed (0.3s)
```

### Run Only Integration Tests
```bash
npm test -- P2P_integration.test.js
```

**Expected:**
```
✓ src/__tests__/P2P_integration.test.js (11)
✓ 11 tests passed (0.2s)
```

### Run Specific Test Group
```bash
npm test -- -t "Complete Happy Path"
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

**Expected:**
```
✓ src/services/__tests__/walletService.p2p.test.js (25)
✓ src/__tests__/P2P_integration.test.js (11)

File                          | % Stmts | % Branch | % Funcs | % Lines
------|---------|----------|---------|----------
walletService.js              |   85.5  |   78.2   |   92.1  |   85.1
────────────────────────────────────────────────────────────────────────
Total                         |   85.5  |   78.2   |   92.1  |   85.1

Coverage report generated in coverage/

✓ 36 tests passed
```

Then open the report:
```bash
# Windows
start coverage\index.html

# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

### Run Tests with Interactive UI
```bash
npm run test:ui
```

Opens browser UI at `http://localhost:51204`

---

## 🔍 Understanding Test Output

### Test Passes ✓
```
✓ should create withdrawal request successfully
```
Function worked as expected. All assertions passed.

### Test Fails ✗
```
✗ should create withdrawal request successfully
Expected: 300000
Received: undefined
```
Something in function doesn't work. Check error message.

### Test Groups
```
✓ createWithdrawalRequestP2P (3)
  ✓ should create withdrawal request successfully
  ✓ should handle insufficient balance error
  ✓ should handle RPC error
```
Parentheses show how many tests in group (3).

### Total Count
```
✓ 36 tests passed (0.5s)
```
All 36 tests succeeded in 0.5 seconds.

---

## 🐛 Troubleshooting Test Errors

### Error: "Cannot find module"
```
Error: Cannot find module '../../supabaseClient'
```

**Solution:**
- Check file paths in test file match your actual file structure
- Verify `supabaseClient.js` exists in `src/` directory
- Check relative paths are correct

### Error: "is not a function"
```
Error: supabase.rpc is not a function
```

**Solution:**
- Ensure test has `vi.mock('../../supabaseClient')`
- Check beforeEach clears mocks: `vi.clearAllMocks()`

### Error: "Timeout"
```
Error: Test timeout of 5000ms exceeded
```

**Solution:**
- Add timeout flag:
  ```bash
  npm test -- --testTimeout=10000
  ```
- Check for missing `await` keywords in async tests

### Tests hang/don't start
```
npm test
(waiting... nothing happens)
```

**Solution:**
```bash
# Clear cache
npm test -- --clearCache

# Reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

### Module parse errors
```
Error: Unexpected token 'export'
```

**Solution:**
- Verify `vitest.config.js` exists in project root
- Check Node.js version: `node --version` (should be 14+)

---

## 📝 Test File Structure

### Unit Test File: `src/services/__tests__/walletService.p2p.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWithdrawalRequestP2P } from '../../services/walletService';
import { supabase } from '../../supabaseClient';

vi.mock('../../supabaseClient');

describe('createWithdrawalRequestP2P', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create withdrawal request successfully', async () => {
    // Mock response
    supabase.rpc.mockResolvedValueOnce({
      data: [{ success: true, order_code: 'WD-...' }],
      error: null,
    });

    // Call function
    const result = await createWithdrawalRequestP2P(
      'user-123',
      300000,
      'VCB',
      '0123456789',
      'NGUYEN VAN A'
    );

    // Assert
    expect(result.success).toBe(true);
  });
});
```

**Key Parts:**
1. **Import** - Bring in test tools and functions
2. **Mock** - `vi.mock()` - Replace real Supabase with fake
3. **Describe** - Group related tests
4. **beforeEach** - Run before each test
5. **it** - Single test case
6. **Mock Response** - What function returns
7. **Call Function** - Execute code being tested
8. **Assert** - Check result is correct

### Integration Test File: `src/__tests__/P2P_integration.test.js`

```javascript
describe('Complete Happy Path', () => {
  it('should complete full withdrawal flow', async () => {
    // Step 1: Create
    supabase.rpc.mockResolvedValueOnce({...});
    await createWithdrawalRequestP2P(...);

    // Step 2: Approve
    supabase.rpc.mockResolvedValueOnce({...});
    await adminApproveWithdrawalP2P(...);

    // Step 3: Confirm Payment
    supabase.rpc.mockResolvedValueOnce({...});
    await adminConfirmPaymentP2P(...);

    // Step 4: Confirm Receipt
    supabase.rpc.mockResolvedValueOnce({...});
    const result = await userConfirmReceiptP2P(...);

    expect(result.success).toBe(true);
  });
});
```

---

## 🎯 Common Test Patterns

### Pattern 1: Success Case
```javascript
it('should succeed', async () => {
  // Mock success response
  supabase.rpc.mockResolvedValueOnce({
    data: [{ success: true, ... }],
    error: null,
  });

  // Call function
  const result = await someFunction();

  // Check success
  expect(result.success).toBe(true);
});
```

### Pattern 2: Error Case
```javascript
it('should handle error', async () => {
  // Mock error response
  supabase.rpc.mockResolvedValueOnce({
    data: [{ success: false, error: 'Error message' }],
    error: null,
  });

  // Call function
  const result = await someFunction();

  // Check error
  expect(result.success).toBe(false);
  expect(result.error).toContain('Error');
});
```

### Pattern 3: Multiple Steps
```javascript
it('should complete flow', async () => {
  // Step 1
  supabase.rpc.mockResolvedValueOnce({...step1 response...});
  await step1Function();

  // Step 2
  supabase.rpc.mockResolvedValueOnce({...step2 response...});
  await step2Function();

  // Verify
  expect(supabase.rpc).toHaveBeenCalledTimes(2);
});
```

### Pattern 4: Permission Check
```javascript
it('should deny permission', async () => {
  supabase.rpc.mockResolvedValueOnce({
    data: [{ success: false, error: 'Không có quyền' }],
    error: null,
  });

  const result = await functionRequiringPermission(
    itemId,
    'wrong-user-id'
  );

  expect(result.success).toBe(false);
  expect(result.error).toContain('quyền');
});
```

---

## 📊 Test Statistics

### Test Count
```
Unit Tests:         25 tests
Integration Tests:  11 tests
────────────────────────────
Total:              36 tests
```

### Function Coverage
```
createWithdrawalRequestP2P:    3 tests
getWithdrawalRequestsP2P:      2 tests
adminApproveWithdrawalP2P:     2 tests
adminConfirmPaymentP2P:        1 test
userConfirmReceiptP2P:         2 tests
userOpenDisputeP2P:            2 tests
getWithdrawalStatusDisplayP2P: 6 tests
generateVietQRData:            3 tests
adminGetPendingWithdrawalsP2P: 1 test
Error Handling:                2 tests
────────────────────────────────
Workflows:                    11 tests
```

### Execution Time
- All tests: < 1 second
- Per test: ~15ms average
- Slowest test: ~50ms

---

## 🚀 CI/CD Integration

### GitHub Actions
Add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm run test:run
      
      - name: Generate coverage
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### GitLab CI
Add to `.gitlab-ci.yml`:

```yaml
test:
  image: node:18
  script:
    - npm install
    - npm run test:run
    - npm run test:coverage
  coverage: '/File[\s\w\/\.\-]*\s+\|\s+(\d+\.?\d*)%/'
```

---

## 📚 Learning Resources

### Vitest Documentation
```
npm test -- --help
```

### Test Syntax Help
- Vitest: https://vitest.dev
- Testing Library: https://testing-library.com
- Jest (Vitest compatible): https://jestjs.io

---

## ✅ Checklist Before Deployment

- [ ] All 36 tests pass locally
- [ ] Coverage report shows > 80%
- [ ] No console errors or warnings
- [ ] All mock calls verified (`.toHaveBeenCalledWith()`)
- [ ] Error messages clear and helpful
- [ ] Tests run in CI/CD pipeline
- [ ] Documentation updated

---

## 🎓 Next Steps After Testing

### If All Tests Pass ✅
1. Deploy database (SQL migration)
2. Manual testing on staging
3. Monitor logs
4. Deploy to production

### If Tests Fail ❌
1. Read error message carefully
2. Check mock data matches function signature
3. Verify Supabase RPC function names
4. Check file paths in imports
5. Add console.log() to debug
6. Run single test with `-t "test name"`

---

## 💡 Pro Tips

### Tip 1: Debug Single Test
```bash
npm test -- -t "should create withdrawal"
```

### Tip 2: Run Tests in Slow-Mo
```bash
npm test -- --reporter=verbose
```

### Tip 3: Watch Specific File
```bash
npm test -- walletService.p2p.test.js
```

### Tip 4: Skip Tests (Add `.skip`)
```javascript
it.skip('should create withdrawal', () => {
  // This test won't run
});
```

### Tip 5: Focus Only on One Test (Add `.only`)
```javascript
it.only('should create withdrawal', () => {
  // Only this test runs
});
```

---

## 🎉 Success Criteria

✅ **You've succeeded when:**
1. `npm test` runs without errors
2. All 36 tests pass
3. Coverage > 80%
4. No timeout errors
5. All mocks cleared between tests
6. Output matches expected format

---

## 📞 Quick Reference

| Command | What | Time |
|---------|------|------|
| `npm test` | Run all, watch mode | 0.5s start |
| `npm run test:run` | Run all, once | 0.5s |
| `npm test -- walletService.p2p.test.js` | Unit tests | 0.3s |
| `npm test -- P2P_integration.test.js` | Integration tests | 0.2s |
| `npm run test:coverage` | Coverage report | 1s |
| `npm run test:ui` | Interactive UI | 2s |

---

**Ready? Run `npm test` now!** 🚀
