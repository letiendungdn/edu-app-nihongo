UPDATE public."CounterCategory"
SET hint = 'Đếm tuổi: số + さい. 二十歳 có hai cách đọc: はたち (đặc biệt, phổ biến) và にじゅっさい.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE slug = 'age'
  AND hint <> 'Đếm tuổi: số + さい. 二十歳 có hai cách đọc: はたち (đặc biệt, phổ biến) và にじゅっさい.';

INSERT INTO public."VocabularyExample"
  ("vocabularyId", ja, kana, vi, en, "sortOrder", "updatedAt")
SELECT v.id, '二十歳になりました。', 'にじゅっさいに なりました。',
       'Tôi đã tròn 20 tuổi. (Cách đọc: にじゅっさい.)',
       'I turned twenty. (Alternate reading: nijussai.)',
       COALESCE((SELECT MAX(e."sortOrder") + 1 FROM public."VocabularyExample" e WHERE e."vocabularyId" = v.id), 0),
       CURRENT_TIMESTAMP
FROM public."Vocabulary" v
WHERE v.id = 26985
  AND v.kanji = '－歳'
  AND v.kana = '－さい'
  AND NOT EXISTS (
    SELECT 1 FROM public."VocabularyExample" e
    WHERE e."vocabularyId" = v.id
      AND e.ja = '二十歳になりました。'
      AND e.kana = 'にじゅっさいに なりました。'
  )
ON CONFLICT ("vocabularyId", "sortOrder") DO NOTHING;
