#!/usr/bin/env node
/**
 * P1 Concurrency Test Suite
 * Run concurrency tests for P1 production security
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// Test 1: Concurrency Refund (50 concurrent calls to finish_delivery_with_refund)
// ============================================================================
async function testConcurrencyRefund() {
  console.log('\n🧪 Test 1: Concurrency Refund');
  console.log('Simulating 50 concurrent calls to finish_delivery_with_refund...\n');

  try {
    // Setup: Create test deposit
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }

    // Create test deposit (pending_return status)
    const { data: testDeposit, error: createErr } = await supabase
      .from('deposits')
      .insert({
        pet_id: '00000000-0000-0000-0000-000000000001', // test pet
        receiver_id: user.id,
        owner_id: user.id,
        amount: 50000,
        status: 'pending_return',
        delivery_status: 'pending'
      })
      .select()
      .single();

    if (createErr || !testDeposit) {
      console.error('❌ Failed to create test deposit:', createErr);
      return;
    }

    console.log(`✅ Test deposit created: ${testDeposit.id}`);
    console.log(`   Amount: ${testDeposit.amount}đ`);

    // Run 50 concurrent RPC calls
    const promises = [];
    for (let i = 0; i < 50; i++) {
      const promise = supabase
        .rpc('finish_delivery_with_refund', {
          p_deposit_id: testDeposit.id,
          p_user_id: user.id
        })
        .then((result, idx = i) => ({
          index: idx,
          success: !result.error,
          data: result.data,
          error: result.error?.message
        }));
      promises.push(promise);
    }

    const results = await Promise.all(promises);

    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n📊 Results:`);
    console.log(`   Successful: ${successful.length}/50`);
    console.log(`   Failed: ${failed.length}/50`);

    if (successful.length === 1) {
      console.log('✅ PASS: Exactly 1 refund succeeded (atomic behavior)');
    } else {
      console.log(`❌ FAIL: Expected 1 success, got ${successful.length}`);
    }

    // Verify in DB
    const { data: walletTxns } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('related_id', testDeposit.id)
      .eq('type', 'refund_deposit');

    console.log(`\n   Wallet transactions (refund_deposit): ${walletTxns?.length || 0}`);
    if (walletTxns?.length === 1) {
      console.log('✅ PASS: Exactly 1 refund transaction in DB');
    } else {
      console.log(`❌ FAIL: Expected 1 transaction, found ${walletTxns?.length}`);
    }

    // Cleanup
    await supabase
      .from('deposits')
      .delete()
      .eq('id', testDeposit.id);

    console.log('\n✅ Test 1 complete\n');
  } catch (err) {
    console.error('❌ Test 1 error:', err.message);
  }
}

// ============================================================================
// Test 2: Concurrency Wallet Decrease (50 concurrent calls, user balance = 100k)
// ============================================================================
async function testConcurrencyWallet() {
  console.log('\n🧪 Test 2: Concurrency Wallet Decrease');
  console.log('Simulating 50 concurrent calls to atomic_decrease_wallet...\n');

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }

    // Set user balance to 100,000
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ wallet_credit: 100000 })
      .eq('id', user.id);

    if (updateErr) {
      console.error('❌ Failed to set wallet:', updateErr);
      return;
    }

    console.log(`✅ Test wallet set to 100,000đ for user ${user.id}`);

    // Run 50 concurrent RPC calls (each trying to decrease by 50,000)
    const promises = [];
    for (let i = 0; i < 50; i++) {
      const promise = supabase
        .rpc('atomic_decrease_wallet', {
          p_user_id: user.id,
          p_amount: 50000,
          p_reason: `Test concurrent decrease ${i}`,
          p_related_id: null,
          p_related_type: 'test'
        })
        .then((result, idx = i) => ({
          index: idx,
          success: result.data?.success || false,
          balance_after: result.data?.balance_after,
          error: result.error?.message || result.data?.error
        }));
      promises.push(promise);
    }

    const results = await Promise.all(promises);

    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n📊 Results:`);
    console.log(`   Successful: ${successful.length}/50`);
    console.log(`   Failed: ${failed.length}/50`);

    if (successful.length === 2) {
      console.log('✅ PASS: Exactly 2 decreases succeeded (100k / 50k = 2)');
    } else {
      console.log(`❌ FAIL: Expected 2 successes, got ${successful.length}`);
    }

    // Verify final balance in DB
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_credit')
      .eq('id', user.id)
      .single();

    console.log(`\n   Final wallet balance: ${profile?.wallet_credit || 'ERROR'}đ`);
    if (profile?.wallet_credit === 0) {
      console.log('✅ PASS: Balance is exactly 0 (100k - 2×50k)');
    } else {
      console.log(`❌ FAIL: Expected balance 0, got ${profile?.wallet_credit}`);
    }

    // Check wallet transactions
    const { data: txns } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'use_for_deposit')
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`\n   Wallet transactions created: ${txns?.length || 0}`);
    if (txns?.length === 2) {
      console.log('✅ PASS: Exactly 2 transactions logged');
    } else {
      console.log(`❌ FAIL: Expected 2 transactions, found ${txns?.length}`);
    }

    console.log('\n✅ Test 2 complete\n');
  } catch (err) {
    console.error('❌ Test 2 error:', err.message);
  }
}

// ============================================================================
// Test 3: Rate Limit Report (spam same deposit & across deposits)
// ============================================================================
async function testReportRateLimit() {
  console.log('\n🧪 Test 3: Report Rate Limit');
  console.log('Testing rate limit on report spam...\n');

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Not authenticated');
      return;
    }

    // Test 1: Same deposit, same user
    console.log('Test 3.1: Same deposit, same user (should fail on 2nd)');
    
    // Create test deposit
    const { data: deposit1 } = await supabase
      .from('deposits')
      .insert({
        pet_id: '00000000-0000-0000-0000-000000000001',
        receiver_id: user.id,
        owner_id: user.id,
        amount: 50000,
        status: 'delivered'
      })
      .select()
      .single();

    // Try report 1st time
    const check1 = await supabase.rpc('can_submit_report', {
      p_deposit_id: deposit1.id,
      p_user_id: user.id
    });

    console.log(`  Attempt 1: ${check1.data.allowed ? '✅ ALLOWED' : '❌ BLOCKED'}`);

    // Insert report
    await supabase.from('adoption_reports').insert({
      deposit_id: deposit1.id,
      pet_id: deposit1.pet_id,
      reporter_id: user.id,
      target_id: user.id,
      reason_category: 'test',
      reason_detail: 'test report'
    });

    // Try report 2nd time (same deposit)
    const check2 = await supabase.rpc('can_submit_report', {
      p_deposit_id: deposit1.id,
      p_user_id: user.id
    });

    console.log(`  Attempt 2 (same deposit): ${!check2.data.allowed ? '✅ BLOCKED' : '❌ ALLOWED (should be blocked)'}`);

    // Test 2: Different deposit, within 15 min (should fail)
    console.log('\nTest 3.2: Different deposit, within 15 min (should fail)');

    const { data: deposit2 } = await supabase
      .from('deposits')
      .insert({
        pet_id: '00000000-0000-0000-0000-000000000002',
        receiver_id: user.id,
        owner_id: user.id,
        amount: 50000,
        status: 'delivered'
      })
      .select()
      .single();

    const check3 = await supabase.rpc('can_submit_report', {
      p_deposit_id: deposit2.id,
      p_user_id: user.id
    });

    console.log(`  Attempt 3 (different deposit, <15min): ${!check3.data.allowed ? '✅ BLOCKED' : '❌ ALLOWED (rate limited)'}`);

    if (check3.data.retry_after_seconds) {
      console.log(`  Retry after: ${Math.ceil(check3.data.retry_after_seconds)} seconds`);
    }

    // Cleanup
    await supabase.from('deposits').delete().eq('id', deposit1.id);
    await supabase.from('deposits').delete().eq('id', deposit2.id);

    console.log('\n✅ Test 3 complete\n');
  } catch (err) {
    console.error('❌ Test 3 error:', err.message);
  }
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('P1 CONCURRENCY & SECURITY TEST SUITE');
  console.log('='.repeat(60));

  const testName = process.argv[2];

  if (testName === 'refund') {
    await testConcurrencyRefund();
  } else if (testName === 'wallet') {
    await testConcurrencyWallet();
  } else if (testName === 'report') {
    await testReportRateLimit();
  } else if (testName === 'all') {
    await testConcurrencyRefund();
    await testConcurrencyWallet();
    await testReportRateLimit();
  } else {
    console.log(`
Usage: node p1-test.js [test-name]

Options:
  refund    - Test concurrent refund calls
  wallet    - Test concurrent wallet decrease
  report    - Test report rate limiting
  all       - Run all tests

Example:
  node p1-test.js all
    `);
  }

  console.log('='.repeat(60));
  console.log('Done');
  console.log('='.repeat(60));
}

main().catch(console.error);
