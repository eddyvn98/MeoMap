# 🗑️ SQL FILES CLEANUP

## Chỉ giữ 2 files SQL:
- ✅ RUN_ON_SUPABASE.sql (migration chính)
- ✅ FINAL_CLEANUP_ADOPTION.sql (cleanup bảng dư thừa)

## Xóa các files cũ/dư thừa:
- ❌ SIMPLE_MIGRATION.sql
- ❌ SUPABASE_MIGRATION_SIMPLE.sql
- ❌ CLEANUP_MIGRATION.sql
- ❌ CLEANUP_DUPLICATE_TABLES.sql
- ❌ ADD_MAX_DEPOSIT_COLUMN.sql
- ❌ ADD_CHECKIN_COLUMNS.sql
- ❌ ADD_WALLET_COLUMNS_TO_DEPOSITS.sql
- ❌ WALLET_TRANSACTIONS_MIGRATION.sql
- ❌ REPUTATION_SCORE_MIGRATION.sql
- ❌ QUICK_SQL_SETUP.sql
- ❌ ADOPTION_REQUESTS_MIGRATION.sql
- ❌ ADOPTION_REPORTS_MIGRATION.sql

## Cách làm:
1. Xóa tất cả files trên (cgiữ 2 files chính)
2. Chạy trên Supabase:
   - Bước 1: RUN_ON_SUPABASE.sql
   - Bước 2: FINAL_CLEANUP_ADOPTION.sql
3. Done!

## Nếu dùng PowerShell:
```powershell
cd c:\Projects\meo-map

# Xóa 12 files cũ
Remove-Item SIMPLE_MIGRATION.sql
Remove-Item SUPABASE_MIGRATION_SIMPLE.sql
Remove-Item CLEANUP_MIGRATION.sql
Remove-Item CLEANUP_DUPLICATE_TABLES.sql
Remove-Item ADD_MAX_DEPOSIT_COLUMN.sql
Remove-Item ADD_CHECKIN_COLUMNS.sql
Remove-Item ADD_WALLET_COLUMNS_TO_DEPOSITS.sql
Remove-Item WALLET_TRANSACTIONS_MIGRATION.sql
Remove-Item REPUTATION_SCORE_MIGRATION.sql
Remove-Item QUICK_SQL_SETUP.sql
Remove-Item ADOPTION_REQUESTS_MIGRATION.sql
Remove-Item ADOPTION_REPORTS_MIGRATION.sql

# Kiểm tra
ls *.sql

# Kết quả: Chỉ còn RUN_ON_SUPABASE.sql và FINAL_CLEANUP_ADOPTION.sql
```
