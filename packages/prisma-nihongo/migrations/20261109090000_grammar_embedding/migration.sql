-- Vector embedding của mẫu ngữ pháp cho hỏi đáp ngữ pháp (RAG). Dữ liệu sinh lại được: POST /api/ai/grammar-qa/reindex.
CREATE TABLE "GrammarEmbedding" (
    "grammarId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "dims" INTEGER NOT NULL,
    "vector" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarEmbedding_pkey" PRIMARY KEY ("grammarId")
);

ALTER TABLE "GrammarEmbedding" ADD CONSTRAINT "GrammarEmbedding_grammarId_fkey" FOREIGN KEY ("grammarId") REFERENCES "Grammar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
