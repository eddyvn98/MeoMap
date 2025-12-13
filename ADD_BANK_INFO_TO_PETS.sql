-- Add bank account information fields to pets table
-- This allows pet owners (rescue case owners) to provide bank account info
-- for people to donate directly

ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS bank_qr_code_url TEXT;

COMMENT ON COLUMN pets.bank_account_number IS 'Số tài khoản ngân hàng của chủ ca/người cứu';
COMMENT ON COLUMN pets.bank_account_name IS 'Tên chủ tài khoản ngân hàng';
COMMENT ON COLUMN pets.bank_name IS 'Tên ngân hàng';
COMMENT ON COLUMN pets.bank_qr_code_url IS 'URL ảnh QR code thanh toán ngân hàng';
