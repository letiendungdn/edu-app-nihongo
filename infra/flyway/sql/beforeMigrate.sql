-- Flyway callback: chạy trước mỗi lần migrate.
-- Bảng do Prisma tạo. Nếu chưa có thì dừng sớm với lỗi dễ hiểu
-- thay vì để V1 báo "relation does not exist".
DO $$
BEGIN
  IF to_regclass('public."StudySession"') IS NULL
     OR to_regclass('public."DailyActivity"') IS NULL
     OR to_regclass('public."StudyStreak"') IS NULL THEN
    RAISE EXCEPTION 'Chưa có bảng của Prisma. Chạy trước: npm run migrate:deploy -w @edu/prisma-nihongo';
  END IF;
END
$$;
