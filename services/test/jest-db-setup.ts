/**
 * Test *.db-spec.ts chạy SQL thật trên Postgres: các chỗ dễ đua nhau (trả tiền coach, đặt lịch,
 * refresh token) mock Prisma không kiểm được.
 *
 * Cần một DB RIÊNG đã chạy migration (KHÔNG dùng DB dev: test xóa dữ liệu):
 *   createdb nihongo_fix_test
 *   DATABASE_URL=postgresql://…/nihongo_fix_test npx prisma migrate deploy   (trong packages/prisma-nihongo)
 *   TEST_DATABASE_URL=postgresql://…/nihongo_fix_test npm run test:db
 */
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "Đặt TEST_DATABASE_URL (DB test riêng, đã migrate) để chạy test:db",
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
