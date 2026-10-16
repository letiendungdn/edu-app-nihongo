import { useEffect } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys as domainQueryKeys } from '../api/query-keys';
import {
  useExamTemplates,
  useGrammar,
  useLessons,
  useVocab,
} from '../api/hooks';
import {
  fetchAdminPayments,
  fetchAdminSupportThread,
  fetchAdminSupportThreads,
  fetchAdminStats,
  fetchAdminUsers,
  fetchCommunityRoom,
  fetchCommunityRooms,
  fetchOnlineCommunityUsers,
  fetchSupportThread,
  fetchAuthMe,
  fetchExercises,
  fetchJlptDaNangSchedule,
  fetchDailyListeningConfig,
  fetchBookAudioFiles,
  fetchJapaneseCounters,
  fetchJapaneseCountryNames,
  fetchJapaneseVocabSuffixes,
  fetchHomePage,
  fetchJapaneseConversation,
  fetchJapaneseRoleplay,
  fetchJapanesePronunciationRules,
  fetchEnglishKatakana,
  fetchJlptRoadmap,
  fetchJlptDaNangScheduleStatic,
  fetchKanaCharts,
  fetchKanjiEntries,
  fetchKanjiEntriesRange,
  fetchKanjiLessons,
  fetchKanjiSearch,
  searchVocabularies,
  fetchFeatureFlags,
  fetchKanjiByJlpt,
  fetchGrammarCountByJlpt,
  fetchVocabulariesRange,
  fetchListeningPlaylist,
} from '../api';
import type { AdminPaymentsFilters } from '../api';
import { getStoredToken } from '../lib/api-client';
import { usePresence } from './usePresence';

export { queryKeys as domainQueryKeys } from '../api/query-keys';
export {
  useLessons,
  useVocab,
  useGrammar,
  useExamTemplates,
  useVocabReview,
  useVocabReviewBatch,
} from '../api/hooks';

/** @deprecated Use domainQueryKeys — kept for backward compatibility */
export const queryKeys = {
  ...domainQueryKeys,
  /** @deprecated use queryKeys.lessons.all */
  lessons: domainQueryKeys.lessons.all,
  /** @deprecated use queryKeys.vocab.byLesson */
  vocabularies: domainQueryKeys.vocab.byLesson,
  /** @deprecated use queryKeys.grammar.byLesson */
  grammars: domainQueryKeys.grammar.byLesson,
  /** @deprecated use queryKeys.exam.templates */
  mockExamTemplates: domainQueryKeys.exam.templates,
  exercises: (lesson: number) => ['exercises', lesson] as const,
  kanjiLessons: ['kanji-lessons'] as const,
  kanjiEntries: (lesson: number) => ['kanji', lesson] as const,
  kanjiRange: (from: number, to: number) => ['kanji', 'range', from, to] as const,
  kanjiSearch: (query: string) => ['kanji-search', query] as const,
  vocabSearch: (query: string) => ['vocab-search', query] as const,
  featureFlags: (withToken: boolean) => ['feature-flags', withToken] as const,
  kanjiByJlpt: (level: string) => ['kanji-jlpt', level] as const,
  grammarCountByJlpt: (level: string) => ['grammar-count-jlpt', level] as const,
  vocabRange: (from: number, to: number) => domainQueryKeys.vocab.byRange(from, to),
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
  supportThread: ['support', 'thread'] as const,
  adminSupportThreads: ['admin', 'support', 'threads'] as const,
  adminSupportThread: (id: number) => ['admin', 'support', 'thread', id] as const,
  communityRooms: ['community', 'rooms'] as const,
  communityRoom: (id: number) => ['community', 'room', id] as const,
  communityOnline: ['community', 'online'] as const,
};

const STALE_5M = 5 * 60 * 1000;

export const useLessonsQuery = useLessons;
export const useVocabulariesQuery = useVocab;
export const useGrammarsQuery = useGrammar;
export const useMockExamTemplatesQuery = useExamTemplates;

export function useExercisesQuery(lessonNumber: number) {
  return useQuery({
    queryKey: queryKeys.exercises(lessonNumber),
    queryFn: () => fetchExercises(lessonNumber),
    enabled: lessonNumber > 0,
    staleTime: STALE_5M,
  });
}

export function useKanjiLessonsQuery() {
  return useQuery({
    queryKey: queryKeys.kanjiLessons,
    queryFn: fetchKanjiLessons,
    staleTime: STALE_5M,
  });
}

export function useKanjiEntriesQuery(lessonNumber: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.kanjiEntries(lessonNumber),
    queryFn: () => fetchKanjiEntries(lessonNumber),
    enabled: enabled && lessonNumber > 0,
    staleTime: STALE_5M,
  });
}

export function useKanjiRangeQuery(
  lessonFrom: number,
  lessonTo: number,
  enabled = true,
) {
  const from = Math.min(lessonFrom, lessonTo);
  const to = Math.max(lessonFrom, lessonTo);

  return useQuery({
    queryKey: queryKeys.kanjiRange(from, to),
    queryFn: () => fetchKanjiEntriesRange(from, to),
    enabled: enabled && from > 0 && to >= from,
    staleTime: STALE_5M,
  });
}

export function useKanjiSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.kanjiSearch(query),
    queryFn: () => fetchKanjiSearch(query),
    enabled: query.trim().length > 0,
    staleTime: STALE_5M,
  });
}

/**
 * Feature flag bật/tắt từ admin (bảng FeatureFlag) — không cần deploy.
 * Lỗi mạng / đang tải → coi như TẮT (tính năng mới không lộ ra khi chưa chắc chắn).
 */
export function useFeatureFlag(key: string): boolean {
  const token = getStoredToken();
  const { data } = useQuery({
    queryKey: queryKeys.featureFlags(!!token),
    queryFn: () => fetchFeatureFlags(token),
    staleTime: 60_000,
    retry: false,
  });
  return data?.includes(key) ?? false;
}

export function useVocabSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.vocabSearch(query),
    queryFn: () => searchVocabularies(query),
    enabled: query.trim().length > 0,
    staleTime: STALE_5M,
  });
}

export function useKanjiByJlptQuery(jlptLevel: string) {
  return useQuery({
    queryKey: queryKeys.kanjiByJlpt(jlptLevel),
    queryFn: () => fetchKanjiByJlpt(jlptLevel),
    enabled: Boolean(jlptLevel),
    staleTime: STALE_5M,
  });
}

export function useGrammarCountByJlptQuery(jlptLevel: string) {
  return useQuery({
    queryKey: queryKeys.grammarCountByJlpt(jlptLevel),
    queryFn: () => fetchGrammarCountByJlpt(jlptLevel),
    enabled: Boolean(jlptLevel),
    staleTime: STALE_5M,
  });
}

const JLPT_KANJI_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;

export function useKanjiAllJlptQuery(enabled = true) {
  const results = useQueries({
    queries: JLPT_KANJI_LEVELS.map((level) => ({
      queryKey: queryKeys.kanjiByJlpt(level),
      queryFn: () => fetchKanjiByJlpt(level),
      enabled,
      staleTime: STALE_5M,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const data = JLPT_KANJI_LEVELS.flatMap((level, index) => results[index]?.data ?? []);

  return { data, isLoading };
}

export function useVocabRangeQuery(
  lessonFrom: number,
  lessonTo: number,
  enabled = true,
) {
  const from = Math.min(lessonFrom, lessonTo);
  const to = Math.max(lessonFrom, lessonTo);

  return useQuery({
    queryKey: queryKeys.vocabRange(from, to),
    queryFn: () => fetchVocabulariesRange(from, to),
    enabled: enabled && from > 0 && to >= from,
    staleTime: STALE_5M,
  });
}

export function useListeningPlaylistQuery(
  lessonFrom: number,
  lessonTo: number,
  jlptLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
) {
  return useQuery({
    queryKey: queryKeys.listeningPlaylist(lessonFrom, lessonTo, jlptLevel),
    queryFn: () => fetchListeningPlaylist(lessonFrom, lessonTo, 120, jlptLevel),
    staleTime: STALE_5M,
  });
}

export function useJlptDaNangScheduleQuery() {
  return useQuery({
    queryKey: queryKeys.jlptDaNangSchedule,
    queryFn: fetchJlptDaNangSchedule,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useKanaChartsQuery() {
  return useQuery({
    queryKey: queryKeys.kanaCharts,
    queryFn: fetchKanaCharts,
    staleTime: STALE_5M,
  });
}

export function useJapaneseCountersQuery() {
  return useQuery({
    queryKey: queryKeys.japaneseCounters,
    queryFn: fetchJapaneseCounters,
    staleTime: STALE_5M,
  });
}

export function useJapaneseCountryNamesQuery() {
  return useQuery({
    queryKey: queryKeys.japaneseCountryNames,
    queryFn: fetchJapaneseCountryNames,
    staleTime: STALE_5M,
  });
}

export function useJapaneseVocabSuffixesQuery() {
  return useQuery({
    queryKey: queryKeys.japaneseVocabSuffixes,
    queryFn: fetchJapaneseVocabSuffixes,
    staleTime: STALE_5M,
  });
}

export function useHomePageQuery() {
  return useQuery({
    queryKey: queryKeys.homePage,
    queryFn: fetchHomePage,
    staleTime: STALE_5M,
  });
}

export function useJapaneseConversationQuery() {
  return useQuery({
    queryKey: queryKeys.japaneseConversation,
    queryFn: fetchJapaneseConversation,
    staleTime: STALE_5M,
  });
}

export function useJapaneseRoleplayQuery() {
  return useQuery({
    queryKey: queryKeys.japaneseRoleplay,
    queryFn: fetchJapaneseRoleplay,
    staleTime: STALE_5M,
  });
}

export function useJapanesePronunciationRulesQuery() {
  return useQuery({
    queryKey: queryKeys.japanesePronunciationRules,
    queryFn: fetchJapanesePronunciationRules,
    staleTime: STALE_5M,
  });
}

export function useEnglishKatakanaQuery() {
  return useQuery({
    queryKey: queryKeys.englishKatakana,
    queryFn: fetchEnglishKatakana,
    staleTime: STALE_5M,
  });
}

export function useDailyListeningConfigQuery() {
  return useQuery({
    queryKey: queryKeys.dailyListeningConfig,
    queryFn: fetchDailyListeningConfig,
    staleTime: STALE_5M,
  });
}

export function useBookAudioFilesQuery() {
  return useQuery({
    queryKey: queryKeys.bookAudioFiles,
    queryFn: fetchBookAudioFiles,
    staleTime: STALE_5M,
  });
}

export function useJlptRoadmapQuery() {
  return useQuery({
    queryKey: queryKeys.jlptRoadmap,
    queryFn: fetchJlptRoadmap,
    staleTime: STALE_5M,
  });
}

export function useJlptDaNangStaticQuery() {
  return useQuery({
    queryKey: queryKeys.jlptDaNangStatic,
    queryFn: fetchJlptDaNangScheduleStatic,
    staleTime: STALE_5M,
  });
}

export function useAuthMeQuery(enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.authMe,
    queryFn: () => fetchAuthMe(token!),
    enabled: enabled && !!token,
    retry: false,
    staleTime: 60_000,
  });
}

export function useAdminStatsQuery(enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => fetchAdminStats(token!),
    enabled: enabled && !!token,
    staleTime: 30_000,
  });
}

export function useAdminUsersQuery(enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.adminUsers,
    queryFn: () => fetchAdminUsers(token!),
    enabled: enabled && !!token,
    staleTime: 60_000,
  });
}

export function useAdminPaymentsQuery(filters: AdminPaymentsFilters, enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.adminPayments(filters),
    queryFn: () => fetchAdminPayments(token!, filters),
    enabled: enabled && !!token,
    staleTime: 15_000,
  });
}

export function useSupportThreadQuery(enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.supportThread,
    queryFn: () => fetchSupportThread(token!),
    enabled: enabled && !!token,
    staleTime: 10_000,
    refetchInterval: 30_000, // SSE handles realtime; this is just a reconnect fallback
  });
}

export function useAdminSupportThreadsQuery(enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.adminSupportThreads,
    queryFn: () => fetchAdminSupportThreads(token!),
    enabled: enabled && !!token,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useAdminSupportThreadQuery(threadId: number | null, enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.adminSupportThread(threadId ?? 0),
    queryFn: () => fetchAdminSupportThread(token!, threadId!),
    enabled: enabled && !!token && threadId != null,
    staleTime: 5_000,
    refetchInterval: 30_000, // SSE handles realtime
  });
}

export function useCommunityRoomsQuery(enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.communityRooms,
    queryFn: () => fetchCommunityRooms(token!),
    enabled: enabled && !!token,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useCommunityRoomQuery(roomId: number | null, enabled = true) {
  const token = getStoredToken();
  return useQuery({
    queryKey: queryKeys.communityRoom(roomId ?? 0),
    queryFn: () => fetchCommunityRoom(token!, roomId!),
    enabled: enabled && !!token && roomId != null,
    staleTime: 5_000,
    refetchInterval: 30_000, // SSE handles realtime
  });
}

export function useCommunityOnlineQuery(enabled = true) {
  const token = getStoredToken();
  const queryClient = useQueryClient();
  const onlineIds = usePresence(token, enabled);

  const query = useQuery({
    queryKey: queryKeys.communityOnline,
    queryFn: () => fetchOnlineCommunityUsers(token!),
    enabled: enabled && !!token,
    staleTime: 5_000,
    refetchInterval: 12_000,
  });

  useEffect(() => {
    if (!enabled || !token) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.communityOnline });
  }, [onlineIds, enabled, token, queryClient]);

  return query;
}
