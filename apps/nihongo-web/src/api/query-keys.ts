import type { AdminPaymentsFilters } from './index';

/**
 * MỌI khóa cache React Query nằm ở đây. Trước đây có hai bộ (`domainQueryKeys` ở file này và
 * `queryKeys` trong hooks/queries.ts, kèm bí danh deprecated) — cùng tên `lessons` mà một bên là
 * mảng, một bên là object, import nhầm là lệnh làm mới cache không khớp gì. Khóa gõ tay ở nơi khác
 * (như ['support-thread'] trong SSE cũ) cũng làm tin nhắn không hiện. Chỉ lấy khóa từ đây.
 */
export const queryKeys = {
  vocab: {
    all: ['vocab'] as const,
    byLesson: (id: number) => ['vocab', 'lesson', id] as const,
    byRange: (from: number, to: number) => ['vocab', 'range', from, to] as const,
    katakana: ['vocab', 'katakana'] as const,
    review: () => ['vocab', 'review'] as const,
  },
  grammar: {
    byLesson: (id: number) => ['grammar', 'lesson', id] as const,
  },
  lessons: {
    all: ['lessons'] as const,
    list: (has?: 'grammar' | 'vocab') =>
      has ? (['lessons', has] as const) : (['lessons'] as const),
  },
  exam: {
    templates: ['exam', 'templates'] as const,
    templatesAdmin: ['exam', 'templates', 'admin'] as const,
    byLevel: (lvl: string) => ['exam', lvl] as const,
  },
  exercises: (lesson: number) => ['exercises', lesson] as const,
  kanjiLessons: ['kanji-lessons'] as const,
  kanjiEntries: (lesson: number) => ['kanji', lesson] as const,
  kanjiRange: (from: number, to: number) => ['kanji', 'range', from, to] as const,
  kanjiSearch: (query: string) => ['kanji-search', query] as const,
  vocabSearch: (query: string) => ['vocab-search', query] as const,
  featureFlags: (withToken: boolean) => ['feature-flags', withToken] as const,
  kanjiByJlpt: (level: string) => ['kanji-jlpt', level] as const,
  grammarCountByJlpt: (level: string) => ['grammar-count-jlpt', level] as const,
  vocabRange: (from: number, to: number) => ['vocab', 'range', from, to] as const,
  listeningPlaylist: (from: number, to: number, level?: string) =>
    ['listening-playlist', from, to, level] as const,
  jlptDaNangSchedule: ['jlpt-da-nang-schedule'] as const,
  kanaCharts: ['reference', 'kana-charts'] as const,
  japaneseCounters: ['reference', 'japanese-counters'] as const,
  japaneseCountryNames: ['reference', 'japanese-country-names'] as const,
  japaneseVocabSuffixes: ['reference', 'japanese-vocab-suffixes'] as const,
  homePage: ['reference', 'home-page'] as const,
  japaneseConversation: ['reference', 'japanese-conversation'] as const,
  japaneseRoleplay: ['reference', 'japanese-roleplay'] as const,
  japanesePronunciationRules: ['reference', 'japanese-pronunciation-rules'] as const,
  englishKatakana: ['reference', 'english-katakana'] as const,
  dailyListeningConfig: ['reference', 'daily-listening'] as const,
  bookAudioFiles: ['reference', 'book-audio-files'] as const,
  jlptRoadmap: ['reference', 'jlpt-roadmap'] as const,
  jlptDaNangStatic: ['reference', 'jlpt-danang-schedule'] as const,
  authMe: ['auth', 'me'] as const,
  adminStats: ['admin', 'stats'] as const,
  adminUsers: ['admin', 'users'] as const,
  adminPayments: (filters: AdminPaymentsFilters) => ['admin', 'payments', filters] as const,
  adminInsights: (day?: string) => ['admin', 'insights', day ?? 'latest'] as const,
  supportThread: ['support', 'thread'] as const,
  adminSupportThreads: ['admin', 'support', 'threads'] as const,
  adminSupportThread: (id: number) => ['admin', 'support', 'thread', id] as const,
  communityRooms: ['community', 'rooms'] as const,
  communityRoom: (id: number) => ['community', 'room', id] as const,
  communityOnline: ['community', 'online'] as const,
  sessionMessages: (sessionId: number) => ['session', sessionId, 'messages'] as const,
} as const;
