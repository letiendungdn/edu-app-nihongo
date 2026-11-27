INSERT INTO public."VocabularyExample"
  ("vocabularyId", ja, kana, vi, en, "sortOrder", "updatedAt")
SELECT v.id, '私は二十五歳です。', 'わたしは にじゅうごさい です。',
       'Tôi 25 tuổi.', 'I''m twenty-five years old.',
       COALESCE((SELECT MAX(e."sortOrder") + 1 FROM public."VocabularyExample" e WHERE e."vocabularyId" = v.id), 0),
       CURRENT_TIMESTAMP
FROM public."Vocabulary" v
WHERE v.id = 26985
  AND v.kanji = '－歳'
  AND v.kana = '－さい'
  AND NOT EXISTS (
    SELECT 1 FROM public."VocabularyExample" e
    WHERE e."vocabularyId" = v.id AND e.ja = '私は二十五歳です。'
  )
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;

INSERT INTO public."VocabularyExample"
  ("vocabularyId", ja, kana, vi, en, "sortOrder", "updatedAt")
SELECT v.id, '父は五十歳です。', 'ちちは ごじゅっさい です。',
       'Bố tôi 50 tuổi.', 'My father is fifty years old.',
       COALESCE((SELECT MAX(e."sortOrder") + 1 FROM public."VocabularyExample" e WHERE e."vocabularyId" = v.id), 0),
       CURRENT_TIMESTAMP
FROM public."Vocabulary" v
WHERE v.id = 26985
  AND v.kanji = '－歳'
  AND v.kana = '－さい'
  AND NOT EXISTS (
    SELECT 1 FROM public."VocabularyExample" e
    WHERE e."vocabularyId" = v.id AND e.ja = '父は五十歳です。'
  )
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
