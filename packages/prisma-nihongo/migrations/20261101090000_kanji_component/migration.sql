-- Thông tin thành phần / bộ thủ kanji (trước đây hardcode trong web: kanji-component-info.ts).
-- Dữ liệu nạp qua infra/postgres/nihongo-content-seed.sql.
CREATE TABLE "KanjiComponent" (
    "id" SERIAL NOT NULL,
    "component" TEXT NOT NULL,
    "hanViet" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL,
    "nameJp" TEXT,
    "baseChar" TEXT,
    "isRadical" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KanjiComponent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KanjiComponent_component_key" ON "KanjiComponent"("component");
