/**
 * VietQR Service - Generate QR code for bank transfer
 * Creates QR code with bank account, amount, and order code
 */

/**
 * Generate VietQR URL
 * Uses real bank account with VietQR API
 * @param {string} bankCode - Bank BIN code (e.g., '970410' for Techcombank)
 * @param {string} accountNumber - Bank account number
 * @param {number} amount - Transfer amount (VND)
 * @param {string} orderCode - Order code (e.g., '123456')
 * @returns {string} VietQR URL
 */
export function generateVietQRUrl(bankCode, accountNumber, amount, orderCode) {
  // Create VietQR API link using real bank account
  // Format: https://qr.sepay.vn/img?bank=970410&acc=19073263957014&amount=100000&des=123456
  const baseUrl = 'https://qr.sepay.vn/img';
  
  const params = new URLSearchParams({
    bank: bankCode,
    acc: accountNumber.trim(),
    amount: amount.toString(),
    des: orderCode,
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Generate QR code using alternative provider (qr-server.com)
 * Better for fallback if sepay API down
 * @param {string} vietqrUrl - The sepay VietQR URL
 * @returns {string} QR code image URL
 */
export function generateQRImage(vietqrUrl) {
  const qrApiUrl = 'https://api.qrserver.com/v1/create-qr-code/';
  
  const params = new URLSearchParams({
    size: '300x300',
    data: vietqrUrl,
    margin: '10',
    format: 'png',
  });
  
  return `${qrApiUrl}?${params.toString()}`;
}

/**
 * Get bank code by bank name
 * @param {string} bankName - Bank name (Techcombank, Vietcombank, ACB, etc)
 * @returns {string} Bank BIN code
 */
export function getBankCode(bankName) {
  const bankCodes = {
    // Major banks
    'techcombank': '970410',
    'tcb': '970410',
    'vietcombank': '970436',
    'vcb': '970436',
    'acb': '970416',
    'agribank': '970405',
    'bidv': '970418',
    'mb': '970422',
    'mbb': '970422',
    'ocb': '970448',
    'sacombank': '970426',
    'scb': '970429',
    'smartbank': '970400',
    'vib': '970441',
    'vbb': '970441',
    'vpbank': '970438',
    'vpb': '970438',
    'eximbank': '970428',
    'msb': '970426',
    // Add more as needed
  };
  
  const normalized = bankName.toLowerCase().replace(/\s+/g, '');
  return bankCodes[normalized] || '970436'; // Default to VCB if not found
}

/**
 * Generate complete QR code data for topup
 * Creates QR code with actual bank transfer data
 * @param {object} topupInfo - Topup information
 * @returns {Promise<{vietqrUrl: string, qrImageUrl: string}>}
 */
export async function generateTopupQRCode(topupInfo) {
  const {
    orderCode,        // e.g., 'TU123456'
    amount,           // e.g., 100000
    bankName,         // e.g., 'Techcombank'
    accountNumber,    // e.g., '1234567890'
  } = topupInfo;
  
  try {
    // 1. Get bank code
    const bankCode = getBankCode(bankName);
    
    // 2. Generate VietQR URL - This returns a link to qr.sepay.vn
    const vietqrUrl = generateVietQRUrl(bankCode, accountNumber, amount, orderCode);
    
    // 3. Create QR code by encoding the VietQR URL itself
    // This way when user scans, they get the VietQR link which handles the transfer
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(vietqrUrl)}&margin=10`;
    
    return {
      success: true,
      vietqrUrl,        // The actual VietQR link that user will scan
      qrImageUrl,       // The QR code image to display
      bankCode,
    };
  } catch (error) {
    console.error('Error generating QR code:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Verify VietQR link is valid
 * @param {string} vietqrUrl - VietQR URL to verify
 * @returns {Promise<boolean>}
 */
export async function verifyVietQRLink(vietqrUrl) {
  try {
    const response = await fetch(vietqrUrl, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Parse VietQR URL to extract information
 * @param {string} vietqrUrl - VietQR URL
 * @returns {object} Parsed data
 */
export function parseVietQRUrl(vietqrUrl) {
  try {
    const url = new URL(vietqrUrl, 'https://qr.sepay.vn');
    return {
      account: url.searchParams.get('acc'),
      bank: url.searchParams.get('bank'),
      amount: url.searchParams.get('amount'),
      description: url.searchParams.get('des'),
    };
  } catch (error) {
    return null;
  }
}

// Bank BIN codes reference
export const BANK_CODES = {
  'Techcombank': '970410',
  'Vietcombank': '970436',
  'ACB': '970416',
  'Agribank': '970405',
  'BIDV': '970418',
  'MB Bank': '970422',
  'OCB': '970448',
  'Sacombank': '970426',
  'SCB': '970429',
  'Smartbank': '970400',
  'VIB': '970441',
  'VPBank': '970438',
  'Eximbank': '970428',
  'MSB': '970426',
};

export default {
  generateVietQRUrl,
  generateQRImage,
  generateTopupQRCode,
  getBankCode,
  verifyVietQRLink,
  parseVietQRUrl,
  BANK_CODES,
};
