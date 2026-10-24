export const CacheKeys = {
  vocabByLesson: (id: number) => `vocab:lesson:${id}`,
  vocabKatakana: () => 'vocab:katakana',
  grammarByLesson: (id: number) => `grammar:lesson:${id}`,
  lessonList: (has?: 'grammar' | 'vocab') =>
    has ? `lessons:${has}` : 'lessons:all',
  lessonListAll: () => ['lessons:all', 'lessons:grammar', 'lessons:vocab'] as const,
} as const;

export const CacheTTL = {
  short: 60,
  medium: 300,
  long: 3600,
  veryLong: 86400,
} as const;
