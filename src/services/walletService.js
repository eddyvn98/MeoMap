/**
 * Wallet service public API.
 *
 * Implementation is split by domain under ./wallet to keep modules focused
 * and below the project 300-line limit while preserving existing imports.
 */
import * as balance from './wallet/balanceService';
import * as legacyWithdrawal from './wallet/legacyWithdrawalService';
import * as walletQueries from './wallet/walletQueryService';
import * as p2pWithdrawal from './wallet/p2pWithdrawalService';
import * as vouchers from './wallet/voucherService';
import * as store from './wallet/storeService';
import * as topup from './wallet/topupService';

export * from './wallet/balanceService';
export * from './wallet/legacyWithdrawalService';
export * from './wallet/walletQueryService';
export * from './wallet/p2pWithdrawalService';
export * from './wallet/voucherService';
export * from './wallet/storeService';
export * from './wallet/topupService';

export default {
  ...balance,
  ...legacyWithdrawal,
  ...walletQueries,
  ...p2pWithdrawal,
  ...vouchers,
  ...store,
  ...topup,
};
