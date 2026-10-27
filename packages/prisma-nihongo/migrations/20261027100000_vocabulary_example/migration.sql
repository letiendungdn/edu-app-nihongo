-- Câu ví dụ từ vựng tách khỏi Vocabulary sang bảng riêng (một từ có thể có nhiều câu).
CREATE TABLE "VocabularyExample" (
    "id" SERIAL NOT NULL,
    "vocabularyId" INTEGER NOT NULL,
    "ja" TEXT NOT NULL,
    "kana" TEXT,
    "vi" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyExample_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VocabularyExample_vocabularyId_sortOrder_key" ON "VocabularyExample"("vocabularyId", "sortOrder");

ALTER TABLE "VocabularyExample" ADD CONSTRAINT "VocabularyExample_vocabularyId_fkey" FOREIGN KEY ("vocabularyId") REFERENCES "Vocabulary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Chuyển câu đang có trên Vocabulary sang (câu 0 của mỗi từ)
INSERT INTO "VocabularyExample" ("vocabularyId", "ja", "kana", "vi", "sortOrder", "updatedAt")
SELECT "id", btrim("exampleJa"), NULLIF(btrim("exampleKana"), ''), NULLIF(btrim("exampleVi"), ''), 0, CURRENT_TIMESTAMP
FROM "Vocabulary"
WHERE "exampleJa" IS NOT NULL AND btrim("exampleJa") <> '';

ALTER TABLE "Vocabulary" DROP COLUMN "exampleJa",
DROP COLUMN "exampleKana",
DROP COLUMN "exampleVi";
