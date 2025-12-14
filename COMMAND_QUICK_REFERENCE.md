# ⚡ P2P Testing - Command Quick Reference

Print this page or bookmark it. These are the commands you'll use most often.

---

## 🚀 First Time Setup (Copy & Paste)

```bash
# 1. Install Vitest
npm install -D vitest @vitest/ui

# 2. Update package.json
# Add these 4 lines to the "scripts" section:
"test": "vitest",
"test:ui": "vitest --ui",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"

# 3. Run tests
npm test

# Expected: ✓ 36 tests passed (0.5s)
```

---

## 📊 Running Tests

### Run All Tests (Watch Mode)
```bash
npm test
```
Tests rerun automatically when you save files.

### Run All Tests Once
```bash
npm run test:run
```
Good for CI/CD pipelines.

### Run Only Unit Tests
```bash
npm test -- walletService.p2p.test.js
```

### Run Only Integration Tests
```bash
npm test -- P2P_integration.test.js
```

### Run Specific Test
```bash
npm test -- -t "should create"
```
Replace "should create" with any part of test name.

### Run with Verbose Output
```bash
npm test -- --reporter=verbose
```

---

## 📈 Coverage & Reporting

### Generate Coverage Report
```bash
npm run test:coverage
```

### View Coverage in Browser
```bash
# Windows
start coverage\index.html

# macOS
open coverage/index.html

# Linux
xdg-open coverage/index.html
```

### Run Tests with Coverage Threshold
```bash
npm test -- --coverage --coverthreshold 80
```

---

## 🖥️ Interactive UI

### Open Interactive Test UI
```bash
npm run test:ui
```
Opens http://localhost:51204 in your browser.

---

## 🐛 Troubleshooting Commands

### Clear Cache
```bash
npm test -- --clearCache
```

### Reinstall Everything
```bash
rm -rf node_modules package-lock.json
npm install
npm install -D vitest @vitest/ui
npm test
```

### Run with Longer Timeout
```bash
npm test -- --testTimeout=10000
```

---

## 📝 Test Development Commands

### Skip a Test (Add to test)
```javascript
it.skip('should do something', () => {
  // Won't run
});
```

### Run Only One Test (Add to test)
```javascript
it.only('should do something', () => {
  // Only this runs
});
```

### Stop Test on First Failure
```bash
npm test -- --bail
```

---

## 🔄 CI/CD Commands

### For GitHub Actions
```bash
npm run test:run
npm run test:coverage
```

### For GitLab CI
```bash
npm install
npm run test:run
npm run test:coverage
```

### For Jenkins
```bash
npm install -D vitest
npm run test:run
```

---

## 📊 Output Examples

### Success
```
✓ src/services/__tests__/walletService.p2p.test.js (25)
✓ src/__tests__/P2P_integration.test.js (11)

✓ 36 tests passed (0.5s)
```

### Failure
```
✗ src/services/__tests__/walletService.p2p.test.js > createWithdrawalRequestP2P > should create

Expected: 300000
Received: undefined

1 test failed (2 failed, 1 skipped, 34 passed)
```

### Coverage
```
File                | % Stmts | % Branch | % Funcs | % Lines
─────────────────────────────────────────────────────────────
walletService.js    |   85.5  |   78.2   |   92.1  |   85.1
─────────────────────────────────────────────────────────────
Total               |   85.5  |   78.2   |   92.1  |   85.1
```

---

## 🎯 Common Workflows

### Local Development
```bash
# In terminal:
npm test

# Keep it running. Tests rerun when you:
# 1. Save a test file
# 2. Save a source file it depends on
# 3. Press 'a' to run all
# 4. Press 'q' to quit
```

### Before Committing
```bash
npm run test:run
npm run test:coverage
# Check that coverage > 80%
git add .
git commit -m "Fix: ..."
```

### Debugging a Test
```bash
npm test -- -t "specific test name"
# Only runs that one test
# Easier to see output
```

### Before Deployment
```bash
npm install
npm run test:run
npm run test:coverage
# Verify no errors
# Check coverage report
# Then deploy
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| P2P_TESTING_QUICK_REFERENCE.md | Quick overview |
| P2P_TEST_EXECUTION_GUIDE.md | Detailed how-to |
| P2P_TESTING_GUIDE.md | Complete reference |
| vitest.config.js | Test configuration |

---

## 💾 File Locations

```
Test files:
• src/services/__tests__/walletService.p2p.test.js
• src/__tests__/P2P_integration.test.js

Config:
• vitest.config.js
```

---

## ✅ Expected Results

- **Total Tests:** 36
- **Pass Rate:** 100%
- **Execution Time:** < 1 second
- **Coverage:** > 80%

---

## 🆘 Emergency Help

If tests fail:
1. Run: `npm test -- --clearCache`
2. Reinstall: `rm -rf node_modules && npm install`
3. Check: `npm test`

If you get import errors:
1. Verify file paths are correct
2. Check `supabaseClient.js` exists
3. Run: `npm install`

If tests hang:
1. Press Ctrl+C to stop
2. Run: `npm test -- --testTimeout=10000`

---

## 📖 Learning Resources

- **Vitest Docs:** https://vitest.dev
- **Jest Docs:** https://jestjs.io (Vitest compatible)
- **Testing Lib:** https://testing-library.com

---

## 🎯 One-Page Reference

```
SETUP:     npm install -D vitest @vitest/ui
RUN:       npm test
COVERAGE:  npm run test:coverage
REPORT:    start coverage\index.html
HELP:      npm test -- --help
```

---

**Print this page and keep it handy!** 📋

*Last Updated: January 30, 2025*
