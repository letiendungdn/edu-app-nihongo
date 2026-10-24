import { apiRequest } from '../lib/api-client';
import type {
  AdminPaymentsList,
  AdminStats,
  AdminSupportThreadSummary,
  AdminUserSummary,
  AuthUser,
  CreateSubscriptionResponse,
  Exercise,
  Grammar,
  JlptDaNangSchedule,
  KanjiEntry,
  KanjiLesson,
  KatakanaVocabulary,
  Lesson,
  ListeningPlaylist,
  LoginResponse,
  MockExamTemplate,
  MockExamTemplateAdmin,
  MockExamTemplateInput,
  PaginatedResponse,
  PaymentRecord,
  PaymentStatus,
  Subscription,
  SubscriptionPlan,
  SubscriptionPlanConfig,
  SupportThreadResponse,
  RefundResult,
  SetupIntentResponse,
  SavedCard,
  UpdateProfileInput,
  Vocabulary,
  VocabularySearchHit,
} from '../types/api';
import type {
  DailyListeningPayload,
  BookAudioPayload,
  JapaneseCountersPayload,
  JapaneseCountryNamesPayload,
  JapaneseVocabSuffixesPayload,
  HomePagePayload,
  JapaneseConversationPayload,
  JapaneseRoleplayPayload,
  JapanesePronunciationRulesPayload,
  EnglishKatakanaPayload,
  JlptDaNangSchedulePayload,
  JlptRoadmapPayload,
  KanaChartsPayload,
  ReferenceMeta,
} from '../types/reference';

async function fetchPaginatedAll<T>(
  buildPath: (page: number, limit: number) => string,
  pageSize = 100,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (all.length < total) {
    const res = await apiRequest<PaginatedResponse<T> | T[]>(
      buildPath(page, pageSize),
    );

    if (Array.isArray(res)) return res;

    const batch = res?.data ?? [];
    total = res?.total ?? batch.length;
    all.push(...batch);

    if (batch.length === 0 || all.length >= total) break;
    page += 1;
  }

  return all;
}

export type LessonContentFilter = 'grammar' | 'vocab';

export function fetchLessons(options?: { has?: LessonContentFilter }) {
  const qs = options?.has ? `?has=${options.has}` : '';
  return apiRequest<Lesson[]>(`/lessons${qs}`);
}

export function fetchKatakanaVocabularies() {
  return apiRequest<PaginatedResponse<KatakanaVocabulary>>('/vocabularies?script=katakana');
}

export function fetchVocabularies(lessonNumber: number) {
  return fetchPaginatedAll<Vocabulary>((page, limit) =>
    `/vocabularies?lessonNumber=${lessonNumber}&page=${page}&limit=${limit}`,
  );
}

/** Feature flag đang bật cho người xem (gửi token nếu có để nhận cờ theo vai trò). */
export async function fetchFeatureFlags(token?: string | null): Promise<string[]> {
  const res = await apiRequest<{ enabled: string[] }>('/feature-flags', { token: token ?? undefined });
  return res?.enabled ?? [];
}

/** Tra từ vựng trên mọi bài: khớp kanji, kana, romaji hoặc nghĩa. */
export async function searchVocabularies(query: string, limit = 50) {
  const res = await apiRequest<PaginatedResponse<VocabularySearchHit>>(
    `/vocabularies?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return { hits: res?.data ?? [], total: res?.total ?? 0 };
}

export type CreateVocabularyInput = {
  kanji?: string | null;
  kana: string;
  romaji: string;
  meaning: string;
  lessonId: number;
  partOfSpeech?: string | null;
  imageUrl?: string | null;
};

export type UpdateVocabularyInput = Partial<
  Omit<CreateVocabularyInput, 'lessonId'>
> & { lessonId?: number };

export function createVocabulary(data: CreateVocabularyInput, token: string) {
  return apiRequest<Vocabulary>('/vocabularies', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateVocabulary(
  id: number,
  data: UpdateVocabularyInput,
  token: string,
) {
  return apiRequest<Vocabulary>(`/vocabularies/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteVocabulary(id: number, token: string) {
  return apiRequest<Vocabulary>(`/vocabularies/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function reorderVocabularies(
  lessonId: number,
  orderedIds: number[],
  token: string,
) {
  return apiRequest<Vocabulary[]>('/vocabularies/reorder', {
    method: 'PUT',
    token,
    body: JSON.stringify({ lessonId, orderedIds }),
  });
}

export type VocabularyWithLesson = Vocabulary & { lessonNumber: number };

export async function fetchVocabulariesRange(
  lessonFrom: number,
  lessonTo: number,
): Promise<VocabularyWithLesson[]> {
  const from = Math.min(lessonFrom, lessonTo);
  const to = Math.max(lessonFrom, lessonTo);
  const lessonNumbers = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const batches = await Promise.all(lessonNumbers.map((n) => fetchVocabularies(n)));

  return batches.flatMap((list, index) =>
    list.map((entry) => ({ ...entry, lessonNumber: lessonNumbers[index] })),
  );
}

export function fetchGrammars(lessonNumber: number) {
  return fetchPaginatedAll<Grammar>((page, limit) =>
    `/grammars?lessonNumber=${lessonNumber}&page=${page}&limit=${limit}`,
  );
}

/** Chỉ lấy total — không tải hết mẫu ngữ pháp theo cấp. */
export async function fetchGrammarCountByJlpt(jlptLevel: string): Promise<number> {
  const res = await apiRequest<PaginatedResponse<Grammar>>(
    `/grammars?jlptLevel=${encodeURIComponent(jlptLevel)}&page=1&limit=1`,
  );
  return res.total ?? 0;
}

export type GrammarExampleInput = {
  jp: string;
  romaji: string;
  en?: string | null;
  vi?: string | null;
};

export type CreateGrammarInput = {
  pattern: string;
  meaning: string;
  explanation?: string | null;
  lessonId: number;
  examples?: GrammarExampleInput[];
};

export type UpdateGrammarInput = Partial<Omit<CreateGrammarInput, 'lessonId'>> & {
  lessonId?: number;
};

export function createGrammar(data: CreateGrammarInput, token: string) {
  return apiRequest<Grammar>('/grammars', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateGrammar(id: number, data: UpdateGrammarInput, token: string) {
  return apiRequest<Grammar>(`/grammars/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteGrammar(id: number, token: string) {
  return apiRequest<Grammar>(`/grammars/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function fetchExercises(lessonNumber?: number) {
  const qs = lessonNumber != null ? `?lessonNumber=${lessonNumber}` : '';
  return apiRequest<Exercise[]>(`/exercises${qs}`);
}

export function fetchExercisesFiltered(params: {
  jlptLevel?: string;
  q?: string;
  page?: number;
  limit?: number;
}) {
  const usp = new URLSearchParams();
  if (params.jlptLevel) usp.set('jlptLevel', params.jlptLevel);
  if (params.q) usp.set('q', params.q);
  usp.set('page', String(params.page ?? 1));
  usp.set('limit', String(params.limit ?? 50));
  return apiRequest<{ data: Exercise[]; total: number; page: number; limit: number }>(
    `/exercises?${usp.toString()}`,
  );
}

export function fetchKanjiLessons() {
  return apiRequest<KanjiLesson[]>('/kanji-lessons');
}

export interface KanjiLessonInput {
  lessonNumber: number;
  title?: string;
  jlptLevel?: string;
  sortOrder?: number;
}

export function createKanjiLesson(data: KanjiLessonInput, token: string) {
  return apiRequest<KanjiLesson>('/kanji-lessons', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateKanjiLesson(id: number, data: Partial<KanjiLessonInput>, token: string) {
  return apiRequest<KanjiLesson>(`/kanji-lessons/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteKanjiLesson(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/kanji-lessons/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function fetchKanjiEntries(lessonNumber: number) {
  return apiRequest<KanjiEntry[]>(`/kanji?lessonNumber=${lessonNumber}`);
}

export async function fetchKanjiEntriesRange(
  lessonFrom: number,
  lessonTo: number,
): Promise<Array<KanjiEntry & { lessonNumber: number }>> {
  const from = Math.min(lessonFrom, lessonTo);
  const to = Math.max(lessonFrom, lessonTo);
  const lessonNumbers = Array.from({ length: to - from + 1 }, (_, index) => from + index);
  const batches = await Promise.all(lessonNumbers.map((n) => fetchKanjiEntries(n)));
  return batches.flatMap((list, index) =>
    list.map((entry) => ({ ...entry, lessonNumber: lessonNumbers[index] })),
  );
}

export function fetchKanjiSearch(query: string) {
  return apiRequest<KanjiEntry[]>(`/kanji?q=${encodeURIComponent(query)}`);
}

export interface KanaRomajiLookup {
  text: string;
  kana: string;
  romaji: string;
  kanji: string | null;
  meaning: string | null;
}

export interface RomajiConversion {
  romaji: string;
  kana: string;
  kanji: string | null;
  meaning: string | null;
  options: Array<{ kind: 'kana' | 'kanji'; text: string }>;
}

export function fetchKanaRomajiLookup(text: string) {
  return apiRequest<KanaRomajiLookup>('/kana/romaji', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function fetchRomajiConversion(romaji: string) {
  return apiRequest<RomajiConversion>('/kana/from-romaji', {
    method: 'POST',
    body: JSON.stringify({ text: romaji }),
  });
}

export function fetchVocabularyById(id: number) {
  return apiRequest<Vocabulary>(`/vocabularies/${id}`);
}

export function fetchKanjiEntryById(id: number) {
  return apiRequest<KanjiEntry>(`/kanji/${id}`);
}

export function fetchKanjiByJlpt(jlptLevel: string) {
  return apiRequest<KanjiEntry[]>(`/kanji?jlptLevel=${encodeURIComponent(jlptLevel)}`);
}

export function createKanjiEntry(
  data: import('../types/api').CreateKanjiEntryInput,
  token: string,
) {
  return apiRequest<KanjiEntry>('/kanji', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateKanjiEntry(
  id: number,
  data: import('../types/api').UpdateKanjiEntryInput,
  token: string,
) {
  return apiRequest<KanjiEntry>(`/kanji/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteKanjiEntry(id: number, token: string) {
  return apiRequest<{ ok: boolean; id: number }>(`/kanji/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function createKanjiVocab(
  entryId: number,
  data: import('../types/api').CreateKanjiVocabInput,
  token: string,
) {
  return apiRequest<import('../types/api').KanjiVocabItem>(
    `/kanji/${entryId}/vocabularies`,
    { method: 'POST', token, body: JSON.stringify(data) },
  );
}

export function updateKanjiVocab(
  id: number,
  data: import('../types/api').UpdateKanjiVocabInput,
  token: string,
) {
  return apiRequest<import('../types/api').KanjiVocabItem>(`/kanji-vocab/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteKanjiVocab(id: number, token: string) {
  return apiRequest<{ ok: boolean; id: number }>(`/kanji-vocab/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function reorderKanjiVocab(
  entryId: number,
  orderedIds: number[],
  token: string,
) {
  return apiRequest<import('../types/api').KanjiVocabItem[]>(
    `/kanji/${entryId}/vocabularies/reorder`,
    { method: 'PUT', token, body: JSON.stringify({ orderedIds }) },
  );
}

export function fetchListeningPlaylist(
  lessonFrom = 1,
  lessonTo = 25,
  limit = 120,
  jlptLevel?: 'N5' | 'N4' | 'N3' | 'N2' | 'N1',
) {
  const levelParam = jlptLevel ? `&jlptLevel=${jlptLevel}` : '';
  return apiRequest<ListeningPlaylist>(
    `/listening/playlist?lessonFrom=${lessonFrom}&lessonTo=${lessonTo}&limit=${limit}${levelParam}`,
  );
}

export function fetchMockExamTemplates() {
  return apiRequest<MockExamTemplate[]>('/mock-exams');
}

export function fetchMockExamTemplatesAdmin(token: string) {
  return apiRequest<MockExamTemplateAdmin[]>('/mock-exams/admin', { token });
}

export function fetchMockExamTemplateAdmin(id: number, token: string) {
  return apiRequest<MockExamTemplateAdmin>(`/mock-exams/admin/${id}`, { token });
}

export function createMockExamTemplate(
  data: MockExamTemplateInput,
  token: string,
) {
  return apiRequest<MockExamTemplateAdmin>('/mock-exams', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateMockExamTemplate(
  id: number,
  data: Partial<MockExamTemplateInput>,
  token: string,
) {
  return apiRequest<MockExamTemplateAdmin>(`/mock-exams/admin/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteMockExamTemplate(id: number, token: string) {
  return apiRequest<{ id: number; deleted: boolean }>(`/mock-exams/admin/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function fetchMockExamQuestions(templateId: number, token: string) {
  return apiRequest<import('../types/api').MockExamQuestionAdmin[]>(
    `/mock-exams/admin/${templateId}/questions`,
    { token },
  );
}

export function createMockExamQuestion(
  templateId: number,
  data: import('../types/api').MockExamQuestionInput,
  token: string,
) {
  return apiRequest<import('../types/api').MockExamQuestionAdmin>(
    `/mock-exams/admin/${templateId}/questions`,
    { method: 'POST', token, body: JSON.stringify(data) },
  );
}

export function updateMockExamQuestion(
  templateId: number,
  questionId: number,
  data: Partial<import('../types/api').MockExamQuestionInput>,
  token: string,
) {
  return apiRequest<import('../types/api').MockExamQuestionAdmin>(
    `/mock-exams/admin/${templateId}/questions/${questionId}`,
    { method: 'PATCH', token, body: JSON.stringify(data) },
  );
}

export function deleteMockExamQuestion(
  templateId: number,
  questionId: number,
  token: string,
) {
  return apiRequest<{ id: number; deleted: boolean }>(
    `/mock-exams/admin/${templateId}/questions/${questionId}`,
    { method: 'DELETE', token },
  );
}

export function fetchJlptDaNangSchedule() {
  return apiRequest<JlptDaNangSchedule>('/jlpt/da-nang/schedule');
}

export function fetchReferenceList() {
  return apiRequest<ReferenceMeta[]>('/reference');
}

export function fetchReference<T>(slug: string) {
  return apiRequest<T>(`/reference/${slug}`);
}

export function fetchKanaCharts() {
  return fetchReference<KanaChartsPayload>('kana-charts');
}

export function fetchJapaneseCounters() {
  return fetchReference<JapaneseCountersPayload>('japanese-counters');
}

export function fetchJapaneseCountryNames() {
  return fetchReference<JapaneseCountryNamesPayload>('japanese-country-names');
}

export function fetchJapaneseVocabSuffixes() {
  return fetchReference<JapaneseVocabSuffixesPayload>('japanese-vocab-suffixes');
}

export function createVocabSuffixGroup(
  data: import('../types/reference').CreateVocabSuffixGroupInput,
  token: string,
) {
  return apiRequest<import('../types/reference').VocabSuffixGroup>(
    '/vocab-suffixes/groups',
    { method: 'POST', token, body: JSON.stringify(data) },
  );
}

export function updateVocabSuffixGroup(
  slug: string,
  data: import('../types/reference').UpdateVocabSuffixGroupInput,
  token: string,
) {
  return apiRequest<import('../types/reference').VocabSuffixGroup>(
    `/vocab-suffixes/groups/${encodeURIComponent(slug)}`,
    { method: 'PATCH', token, body: JSON.stringify(data) },
  );
}

export function deleteVocabSuffixGroup(slug: string, token: string) {
  return apiRequest<{ ok: boolean; slug: string }>(
    `/vocab-suffixes/groups/${encodeURIComponent(slug)}`,
    { method: 'DELETE', token },
  );
}

export function createVocabSuffixItem(
  data: import('../types/reference').CreateVocabSuffixItemInput,
  token: string,
) {
  return apiRequest<import('../types/reference').VocabSuffixItem>(
    '/vocab-suffixes/items',
    { method: 'POST', token, body: JSON.stringify(data) },
  );
}

export function updateVocabSuffixItem(
  id: number,
  data: import('../types/reference').UpdateVocabSuffixItemInput,
  token: string,
) {
  return apiRequest<import('../types/reference').VocabSuffixItem>(
    `/vocab-suffixes/items/${id}`,
    { method: 'PATCH', token, body: JSON.stringify(data) },
  );
}

export function deleteVocabSuffixItem(id: number, token: string) {
  return apiRequest<{ ok: boolean; id: number }>(`/vocab-suffixes/items/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function reorderVocabSuffixItems(
  groupSlug: string,
  orderedIds: number[],
  token: string,
) {
  return apiRequest<import('../types/reference').VocabSuffixGroup>(
    '/vocab-suffixes/items/reorder',
    {
      method: 'PUT',
      token,
      body: JSON.stringify({ groupSlug, orderedIds }),
    },
  );
}

export function fetchHomePage() {
  return fetchReference<HomePagePayload>('home-page');
}

export function fetchJapaneseConversation() {
  return fetchReference<JapaneseConversationPayload>('japanese-conversation');
}

export function fetchJapaneseRoleplay() {
  return fetchReference<JapaneseRoleplayPayload>('japanese-roleplay');
}

export function fetchJapanesePronunciationRules() {
  return fetchReference<JapanesePronunciationRulesPayload>(
    'japanese-pronunciation-rules',
  );
}

export function fetchEnglishKatakana() {
  return fetchReference<EnglishKatakanaPayload>('english-katakana');
}

export function fetchDailyListeningConfig() {
  return fetchReference<DailyListeningPayload>('daily-listening');
}

export function fetchBookAudioFiles() {
  return fetchReference<BookAudioPayload>('book-audio-files');
}

/** Danh mục giáo trình (Minna, Sou Matome, Shinkanzen, TRY!, KLL) — bảng TextbookSeries / TextbookBook */
export function fetchTextbookCatalog() {
  return fetchReference<import('../data/jlpt-textbooks').TextbookCatalog>('textbooks');
}

export function fetchJlptRoadmap() {
  return fetchReference<JlptRoadmapPayload>('jlpt-roadmap');
}

export function fetchJlptDaNangScheduleStatic() {
  return fetchReference<JlptDaNangSchedulePayload>('jlpt-danang-schedule');
}

export function startMockExam(level: string) {
  return apiRequest<Record<string, unknown>>(`/mock-exams/${level}/start`, { method: 'POST' });
}

export function submitMockExam(examId: string, answers: Record<string, string>) {
  return apiRequest<Record<string, unknown>>(`/mock-exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
}

/** @deprecated use login() */
export const loginAdmin = login;

export function register(email: string, password: string) {
  return apiRequest<LoginResponse>('/auth/register', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
}

export function logoutAuth(token: string) {
  return apiRequest<{ message: string }>('/auth/logout', {
    method: 'POST',
    token,
    credentials: 'include',
  });
}

export function loginWithGoogle(credential: string) {
  return apiRequest<LoginResponse>('/auth/google', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ credential }),
  });
}

export function loginWithOidc(accessToken: string, idToken?: string) {
  return apiRequest<LoginResponse>('/auth/oidc', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ accessToken, idToken }),
  });
}

export function forgotPassword(email: string) {
  return apiRequest<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resetPassword(token: string, password: string) {
  return apiRequest<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export function updateProfile(token: string, data: UpdateProfileInput) {
  return apiRequest<AuthUser>('/auth/me', {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function fetchAuthMe(token: string) {
  return apiRequest<AuthUser>('/auth/me', { token });
}

export function fetchAdminStats(token: string) {
  return apiRequest<AdminStats>('/admin/stats', { token });
}

export function fetchAdminUsers(token: string) {
  return apiRequest<AdminUserSummary[]>('/admin/users', { token });
}

export function updateAdminUserRole(
  token: string,
  userId: number,
  role: 'USER' | 'TEACHER' | 'ADMIN',
) {
  return apiRequest<AdminUserSummary>(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ role }),
  });
}

export type AdminExamResult = {
  id: number;
  examId: string;
  level: string;
  title: string;
  correctCount: number;
  total: number;
  percent: number;
  passed: boolean;
  submittedAt: string;
  user: { id: number; email: string; name: string | null } | null;
  sections: Array<{
    id: number;
    section: string;
    correct: number;
    total: number;
    percent: number;
  }>;
};

export function fetchAdminExamResults(token: string, limit = 100) {
  return apiRequest<AdminExamResult[]>(`/admin/exam-results?limit=${limit}`, { token });
}

export function deleteAdminExamResult(token: string, id: number) {
  return apiRequest<{ id: number }>(`/admin/exam-results/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function createLesson(
  data: { lessonNumber: number; title?: string },
  token: string,
) {
  return apiRequest<Lesson>('/lessons', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateLesson(
  id: number,
  data: { lessonNumber?: number; title?: string },
  token: string,
) {
  return apiRequest<Lesson>(`/lessons/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteLesson(id: number, token: string) {
  return apiRequest<{ id: number }>(`/lessons/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function createExercise(
  data: {
    type: string;
    question: string;
    options?: string;
    answer: string;
    lessonId: number;
  },
  token: string,
) {
  return apiRequest<Exercise>('/exercises', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateExercise(
  id: number,
  data: Partial<{
    type: string;
    question: string;
    options: string;
    answer: string;
    lessonId: number;
  }>,
  token: string,
) {
  return apiRequest<Exercise>(`/exercises/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteExercise(id: number, token: string) {
  return apiRequest<{ id: number }>(`/exercises/${id}`, {
    method: 'DELETE',
    token,
  });
}

export type AdminPaymentsFilters = {
  userId?: number;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
};

export interface AdminInsightsKpi {
  day: string;
  activeLearners: number;
  newLearners: number;
  atRisk: number;
  totalSeconds: number;
  cardsReviewed: number;
  examsTaken: number;
}

export interface AdminAtRiskLearner {
  userId: number;
  email: string;
  name: string | null;
  riskScore: number;
  daysInactive: number;
  activeDaysPrior: number;
  dueCards: number;
  lastActiveDay: string;
  reasons: string[];
  reengagement: 'pending' | 'sent' | 'skipped' | null;
}

export interface AdminInsights {
  ready: boolean;
  day: string | null;
  kpi: AdminInsightsKpi[];
  atRisk: AdminAtRiskLearner[];
}

/** Kết quả pipeline Airflow learner_insights (KPI hằng ngày + học viên sắp bỏ học). */
export function fetchAdminInsights(token: string, day?: string) {
  return apiRequest<AdminInsights>(`/admin/insights${day ? `?day=${day}` : ''}`, { token });
}

export function fetchAdminPayments(token: string, filters: AdminPaymentsFilters = {}) {
  const params = new URLSearchParams();
  if (filters.userId) params.set('userId', String(filters.userId));
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiRequest<AdminPaymentsList>(`/admin/payments${qs ? `?${qs}` : ''}`, { token });
}

export function fetchAdminUserPayments(token: string, userId: number) {
  return apiRequest<PaymentRecord[]>(`/admin/users/${userId}/payments`, { token });
}

export function adminRefundPayment(
  token: string,
  paymentId: number,
  options?: { reason?: string; amountCents?: number },
) {
  return apiRequest<RefundResult>(`/admin/payments/${paymentId}/refund`, {
    method: 'POST',
    token,
    body: JSON.stringify(options ?? {}),
  });
}

export function fetchSupportThread(token: string) {
  return apiRequest<SupportThreadResponse>('/support', { token });
}

export function sendSupportMessage(
  token: string,
  content: string,
  fileUrl?: string,
  fileType?: string,
) {
  return apiRequest<{ threadId: number; message: import('../types/chat').SupportMessage }>(
    '/support/messages',
    { method: 'POST', token, body: JSON.stringify({ content, fileUrl, fileType }) },
  );
}

export function markSupportRead(token: string) {
  return apiRequest<{ ok: boolean }>('/support/read', { method: 'PATCH', token });
}

export function fetchAdminSupportThreads(token: string) {
  return apiRequest<AdminSupportThreadSummary[]>('/admin/support/threads', { token });
}

export function fetchAdminSupportThread(token: string, threadId: number) {
  return apiRequest<SupportThreadResponse>(`/admin/support/threads/${threadId}`, {
    token,
  });
}

export function sendAdminSupportMessage(
  token: string,
  threadId: number,
  content: string,
  fileUrl?: string,
  fileType?: string,
) {
  return apiRequest<{ message: import('../types/chat').SupportMessage }>(
    `/admin/support/threads/${threadId}/messages`,
    { method: 'POST', token, body: JSON.stringify({ content, fileUrl, fileType }) },
  );
}

export function markAdminSupportRead(token: string, threadId: number) {
  return apiRequest<{ ok: boolean }>(`/admin/support/threads/${threadId}/read`, {
    method: 'PATCH',
    token,
  });
}

export function fetchCommunityRooms(token: string) {
  return apiRequest<import('../types/api').CommunityRoomSummary[]>('/community/rooms', {
    token,
  });
}

export function fetchCommunityRoom(token: string, roomId: number) {
  return apiRequest<import('../types/api').CommunityRoomResponse>(
    `/community/rooms/${roomId}`,
    { token },
  );
}

export function sendCommunityMessage(
  token: string,
  roomId: number,
  content: string,
  fileUrl?: string,
  fileType?: string,
) {
  return apiRequest<{ message: import('../types/chat').GroupChatMessage }>(
    `/community/rooms/${roomId}/messages`,
    { method: 'POST', token, body: JSON.stringify({ content, fileUrl, fileType }) },
  );
}

export function getPresignedUploadUrl(token: string, contentType: string, folder = 'chat') {
  return apiRequest<{ url: string; key: string; publicUrl: string }>(
    '/upload/presigned-url',
    { method: 'POST', token, body: JSON.stringify({ contentType, folder }) },
  );
}

export interface CallTicket {
  token: string;
  expiresAt: string;
  iceServers: RTCIceServer[];
}

/** Vé vào phòng video call + ICE server (STUN/TURN). Chỉ học viên/coach của buổi, đúng khung giờ. */
export function fetchCallTicket(token: string, sessionId: number) {
  return apiRequest<CallTicket>(`/marketplace/sessions/${sessionId}/call-token`, {
    method: 'POST',
    token,
  });
}

export function fetchSessionMessages(token: string, sessionId: number) {
  return apiRequest<import('../types/chat').SessionChatMessage[]>(
    `/marketplace/sessions/${sessionId}/messages`,
    { token },
  );
}

export function sendSessionMessage(
  token: string,
  sessionId: number,
  content: string,
  fileUrl?: string,
  fileType?: string,
) {
  return apiRequest<import('../types/chat').SessionChatMessage>(
    `/marketplace/sessions/${sessionId}/messages`,
    { method: 'POST', token, body: JSON.stringify({ content, fileUrl, fileType }) },
  );
}

export function markCommunityRead(token: string, roomId: number) {
  return apiRequest<{ ok: boolean }>(`/community/rooms/${roomId}/read`, {
    method: 'PATCH',
    token,
  });
}

export function createCommunityGroup(
  token: string,
  name: string,
  memberIds: number[],
) {
  return apiRequest<import('../types/api').CommunityRoomResponse>('/community/rooms/group', {
    method: 'POST',
    token,
    body: JSON.stringify({ name, memberIds }),
  });
}

export function createDirectChat(token: string, userId: number) {
  return apiRequest<import('../types/api').CommunityRoomResponse>('/community/rooms/direct', {
    method: 'POST',
    token,
    body: JSON.stringify({ userId }),
  });
}

export function searchCommunityUsers(token: string, q: string) {
  return apiRequest<import('../types/api').CommunityChatUser[]>(
    `/community/users?q=${encodeURIComponent(q)}`,
    { token },
  );
}

export function fetchOnlineCommunityUsers(token: string) {
  return apiRequest<import('../types/api').CommunityChatUser[]>('/community/online', {
    token,
  });
}

export function adminImportVocab(token: string, lessonNumber: number, text: string) {
  return apiRequest<{ count: number; skipped: number }>('/admin/import/vocab', {
    method: 'POST',
    token,
    body: JSON.stringify({ lessonNumber, text }),
  });
}

export interface ReviewLogItem {
  kana: string;
  kanji?: string | null;
  meaning: string;
  lessonNumber: number;
  wrongCount: number;
  reviewStreak: number;
  mastered: boolean;
  lastReviewedAt?: string | null;
}

export function syncReviewProgress(items: ReviewLogItem[]) {
  return apiRequest<{ synced: number }>('/progress/review', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

export function fetchReviewProgress() {
  return apiRequest<ReviewLogItem[]>('/progress/review');
}

export function logListeningProgress(token: string, date: string, seconds: number) {
  return apiRequest<unknown>('/progress/listening', {
    method: 'POST',
    token,
    body: JSON.stringify({ date, seconds }),
  });
}

export function fetchListeningProgress(token: string) {
  return apiRequest<Array<{ date: string; seconds: number }>>('/progress/listening', {
    token,
  });
}

// ─── Reading ─────────────────────────────────────────────────

export interface ReadingPassageSummary {
  id: number;
  title: string;
  jlptLevel: string | null;
  estimatedMin: number;
  sortOrder: number;
  _count: { questions: number };
}

export interface ReadingPassage {
  id: number;
  title: string;
  content: string;
  jlptLevel: string | null;
  source: string | null;
  estimatedMin: number;
  questions: ReadingQuestion[];
}

export interface ReadingQuestion {
  id: number;
  question: string;
  answer: string;
  explanation: string | null;
  sortOrder: number;
  options: { id: number; text: string; sortOrder: number }[];
}

export interface ReadingResult {
  correct: number;
  total: number;
  percent: number;
  results: { questionId: number; correct: boolean; correctAnswer: string; explanation: string | null }[];
}

export function fetchReadingPassages(jlptLevel?: string) {
  const q = jlptLevel ? `?jlptLevel=${jlptLevel}` : '';
  return apiRequest<ReadingPassageSummary[]>(`/reading${q}`);
}

export function fetchReadingPassage(id: number) {
  return apiRequest<ReadingPassage>(`/reading/${id}`);
}

export function submitReading(id: number, answers: Record<string, string>) {
  return apiRequest<ReadingResult>(`/reading/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export interface ReadingPassageInput {
  title: string;
  content: string;
  jlptLevel?: string;
  source?: string;
  estimatedMin?: number;
  sortOrder?: number;
  questions?: {
    question: string;
    answer: string;
    explanation?: string;
    options: string[];
  }[];
}

export function createReadingPassage(data: ReadingPassageInput, token: string) {
  return apiRequest<ReadingPassage>('/reading', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateReadingPassage(id: number, data: Partial<ReadingPassageInput>, token: string) {
  return apiRequest<ReadingPassage>(`/reading/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteReadingPassage(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/reading/${id}`, {
    method: 'DELETE',
    token,
  });
}

// ─── Mind maps ───────────────────────────────────────────────

export type MindMapKindApi = 'GRAMMAR' | 'VOCAB' | 'KANJI';
export type MindMapLevelCode = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface MindMapItemApi {
  pattern: string;
  meaning: string;
  href?: string;
  lessonNumber?: number;
  linkLabel?: string;
  /** Chế độ "Toàn bộ dữ liệu": id bản ghi gốc + bài chứa nó */
  id?: number;
  lessonId?: number;
  /** Chuỗi đọc bằng loa */
  speak?: string[];
  imageUrl?: string;
  /** Có ảnh nhưng là data URL (không gửi kèm) — tải khi cần */
  hasImage?: boolean;
}

export interface MindMapBranchApi {
  id: string;
  label: string;
  labelJa?: string;
  hint?: string;
  posX?: number;
  posY?: number;
  patterns: MindMapItemApi[];
}

export interface MindMapLevelApi {
  id: number;
  kind: MindMapKindApi;
  level: MindMapLevelCode;
  title: string;
  summary: string;
  accent: string;
  sortOrder: number;
  branches: MindMapBranchApi[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MindMapLevelInput {
  kind: MindMapKindApi;
  level: MindMapLevelCode;
  title: string;
  summary: string;
  accent?: string;
  sortOrder?: number;
  branches: MindMapBranchApi[];
}

export function fetchMindMaps(kind?: MindMapKindApi) {
  const q = kind ? `?kind=${kind}` : '';
  return apiRequest<MindMapLevelApi[]>(`/mind-maps${q}`);
}

export interface MindMapDataLevelApi {
  kind: MindMapKindApi;
  level: MindMapLevelCode;
  total: number;
  groupedBy: 'partOfSpeech' | 'lesson';
  branches: MindMapBranchApi[];
}

/** Sơ đồ sinh từ toàn bộ dữ liệu (mỗi cấp ≤ 8 nhánh, liệt kê hết từ / mẫu / chữ). */
export function fetchMindMapData(kind: MindMapKindApi) {
  return apiRequest<MindMapDataLevelApi[]>(`/mind-maps/data?kind=${kind}`);
}

export function fetchMindMap(id: number) {
  return apiRequest<MindMapLevelApi>(`/mind-maps/${id}`);
}

export function createMindMap(data: MindMapLevelInput, token: string) {
  return apiRequest<MindMapLevelApi>('/mind-maps', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function updateMindMap(id: number, data: Partial<MindMapLevelInput>, token: string) {
  return apiRequest<MindMapLevelApi>(`/mind-maps/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function deleteMindMap(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(`/mind-maps/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function bulkUpsertMindMaps(
  levels: MindMapLevelInput[],
  token: string,
  replaceKind?: MindMapKindApi,
) {
  return apiRequest<MindMapLevelApi[]>('/mind-maps/bulk-upsert', {
    method: 'POST',
    token,
    body: JSON.stringify({ levels, replaceKind }),
  });
}

// ─── Dictation ───────────────────────────────────────────────

export interface DictationVocab {
  id: number;
  kanji: string | null;
  kana: string;
  romaji: string;
  meaning: string;
}

export function fetchDictationVocab(lessonNumber?: number, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (lessonNumber) params.set('lessonNumber', String(lessonNumber));
  return apiRequest<DictationVocab[]>(`/dictation/vocab?${params}`);
}

export function recordDictationAttempt(vocabId: number, userInput: string, correct: boolean) {
  return apiRequest<unknown>('/dictation/attempt', {
    method: 'POST',
    body: JSON.stringify({ vocabId, userInput, correct }),
  });
}

// ─── Analytics ───────────────────────────────────────────────

export interface AnalyticsData {
  overview: {
    totalStudySeconds: number;
    totalListeningSeconds: number;
    totalCardsReviewed: number;
    masteredVocab: number;
    totalExams: number;
    passedExams: number;
  };
  studySessions: { date: string; seconds: number; cardsReviewed: number }[];
  examHistory: { submittedAt: string; percent: number; passed: boolean; level: string; title: string }[];
  listeningHistory: { date: string; seconds: number }[];
}

export function fetchAnalytics(token: string) {
  return apiRequest<AnalyticsData>('/analytics', { token });
}

// ─── Daily notes ─────────────────────────────────────────────

export interface DailyNoteRow {
  date: string;
  content: string;
  updatedAt: string;
}

export function fetchDailyNotes(token: string) {
  return apiRequest<DailyNoteRow[]>('/progress/notes', { token });
}

export function upsertDailyNote(token: string, date: string, content: string) {
  return apiRequest<DailyNoteRow>('/progress/notes', {
    method: 'PUT',
    token,
    body: JSON.stringify({ date, content }),
  });
}

// ─── Daily goals ─────────────────────────────────────────────

export interface DailyGoalItemRow {
  id: string;
  kind: string;
  label: string;
  done: boolean;
  target?: number;
}

export interface DailyGoalsRow {
  date: string;
  items: DailyGoalItemRow[];
  updatedAt: string;
}

export function fetchDailyGoals(token: string) {
  return apiRequest<DailyGoalsRow[]>('/progress/goals', { token });
}

export function upsertDailyGoals(
  token: string,
  date: string,
  items: DailyGoalItemRow[],
) {
  return apiRequest<DailyGoalsRow>('/progress/goals', {
    method: 'PUT',
    token,
    body: JSON.stringify({ date, items }),
  });
}

// ─── Daily activity tracking ──────────────────────────────────

export interface TodayActivity {
  srs: boolean;
  vocab: boolean;
  kanji: boolean;
  exam: boolean;
}

export function logActivity(kind: 'vocab' | 'kanji') {
  const date = new Date().toISOString().slice(0, 10);
  return apiRequest<{ ok: boolean }>('/progress/activity', {
    method: 'POST',
    body: JSON.stringify({ kind, date }),
  });
}

export function fetchTodayActivity() {
  return apiRequest<TodayActivity>('/progress/today');
}

// ─── Subscription ─────────────────────────────────────────────

export function fetchSubscriptionPlans() {
  return apiRequest<SubscriptionPlanConfig[]>('/subscriptions/plans');
}

export function fetchSubscriptionStatus(token: string) {
  return apiRequest<Subscription | null>('/subscriptions/status', { token });
}

export function createSubscription(
  token: string | null,
  plan: SubscriptionPlan,
  paymentMethodId?: string,
) {
  return apiRequest<CreateSubscriptionResponse>('/subscriptions', {
    method: 'POST',
    token,
    body: JSON.stringify({
      plan,
      ...(paymentMethodId ? { paymentMethodId } : {}),
    }),
  });
}

export function cancelSubscription(token: string) {
  return apiRequest<{ message: string }>('/subscriptions', {
    method: 'DELETE',
    token,
  });
}

export function requestSubscriptionRefund(token: string, reason?: string) {
  return apiRequest<RefundResult>('/subscriptions/refund', {
    method: 'POST',
    token,
    body: JSON.stringify({ reason }),
  });
}

// ─── Payments / Refunds ───────────────────────────────────────

export function fetchMyPayments(token: string) {
  return apiRequest<PaymentRecord[]>('/payments/me', { token });
}

export function requestPaymentRefund(
  token: string,
  paymentId: number,
  reason?: string,
) {
  return apiRequest<RefundResult>(`/payments/${paymentId}/refund`, {
    method: 'POST',
    token,
    body: JSON.stringify({ reason }),
  });
}

// ─── Payment methods ──────────────────────────────────────────

export function fetchPaymentMethods(token: string) {
  return apiRequest<SavedCard[]>('/payment-methods', { token });
}

export function createPaymentMethodSetup(token: string) {
  return apiRequest<SetupIntentResponse>('/payment-methods/setup', {
    method: 'POST',
    token,
  });
}

export function setDefaultPaymentMethod(token: string, paymentMethodId: string) {
  return apiRequest<{ message: string }>(`/payment-methods/${paymentMethodId}/default`, {
    method: 'POST',
    token,
  });
}

export function deletePaymentMethod(token: string, paymentMethodId: string) {
  return apiRequest<{ message: string }>(`/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
    token,
  });
}

export interface SentenceFeedback {
  corrected: string;
  reading: string;
  meaning: string;
  explanation: string;
  examples: string[];
}

/** Sửa và giải thích một câu (AI chạy ở server; key AI không bao giờ tới trình duyệt). */
export function fetchSentenceFeedback(sentence: string) {
  return apiRequest<SentenceFeedback>('/ai/sentence-feedback', {
    method: 'POST',
    body: JSON.stringify({ sentence }),
  });
}
