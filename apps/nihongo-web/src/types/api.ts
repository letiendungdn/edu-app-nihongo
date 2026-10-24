export interface Lesson {
  id: number;
  lessonNumber: number;
  title: string | null;
  jlptLevel?: string | null;
  /** Giáo trình: MINNA | KLL | SOUMATOME | SHINKANZEN | TRY (null = nội dung JLPT chung) */
  textbook?: string | null;
  /** Bài giáo trình: tên tuần / phần */
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    vocabularies: number;
    grammars: number;
    exercises: number;
  };
}

export interface KatakanaVocabulary {
  id: number;
  kanji: string | null;
  kana: string;
  romaji: string;
  meaning: string;
  jlptLevel: string | null;
  lesson: {
    lessonNumber: number;
    title: string | null;
    textbook: string | null;
  };
}

export interface Vocabulary {
  id: number;
  kanji: string | null;
  kana: string;
  romaji: string;
  meaning: string;
  lessonId: number;
  sortOrder?: number;
  partOfSpeech?: string | null;
  imageUrl?: string | null;
  pitchAccent?: string | null;
  exampleJa?: string | null;
  exampleKana?: string | null;
  exampleVi?: string | null;
}

/** Kết quả tra từ vựng (GET /vocabularies?q=) — kèm bài chứa từ để mở đúng bài. */
export interface VocabularySearchHit extends Vocabulary {
  lesson?: {
    lessonNumber: number;
    title: string | null;
    jlptLevel: string | null;
    textbook: string | null;
  };
}

export interface GrammarExample {
  id: number;
  jp: string;
  romaji: string;
  en: string | null;
  vi: string | null;
}

export interface Grammar {
  id: number;
  pattern: string;
  meaning: string;
  explanation: string | null;
  lessonId: number;
  examples?: GrammarExample[];
}

export interface Exercise {
  id: number;
  type: 'multiple_choice' | 'fill_in_blank' | string;
  question: string;
  options: string[] | null;
  answer: string;
  lessonId: number;
}

export interface KanjiLesson {
  id: number;
  lessonNumber: number;
  title: string | null;
  jlptLevel: string | null;
  textbook?: string | null;
  sortOrder?: number;
  _count?: { entries: number };
}

export interface KanjiEntry {
  id: number;
  character: string;
  hanViet: string | null;
  onyomi: string | null;
  kunyomi: string | null;
  meaningVi: string;
  jlptLevel?: string | null;
  mnemonicJp?: string | null;
  mnemonicVi?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  lesson?: { lessonNumber: number; title: string | null; jlptLevel: string | null };
  vocabularies?: Array<{
    id: number;
    word: string;
    reading: string;
    meaningVi: string;
    exampleJa?: string | null;
    exampleKana?: string | null;
    exampleVi?: string | null;
    sortOrder?: number;
  }>;
}

export type KanjiVocabItem = NonNullable<KanjiEntry['vocabularies']>[number];

export interface CreateKanjiVocabInput {
  word: string;
  reading: string;
  meaningVi: string;
  exampleJa?: string | null;
  exampleKana?: string | null;
  exampleVi?: string | null;
  sortOrder?: number;
}

export interface UpdateKanjiVocabInput {
  word?: string;
  reading?: string;
  meaningVi?: string;
  exampleJa?: string | null;
  exampleKana?: string | null;
  exampleVi?: string | null;
  sortOrder?: number;
}

export interface CreateKanjiEntryInput {
  character: string;
  meaningVi: string;
  lessonNumber: number;
  hanViet?: string;
  onyomi?: string;
  kunyomi?: string;
  jlptLevel?: string;
  sortOrder?: number;
  imageUrl?: string | null;
}

export interface UpdateKanjiEntryInput {
  character?: string;
  meaningVi?: string;
  lessonNumber?: number;
  hanViet?: string;
  onyomi?: string;
  kunyomi?: string;
  jlptLevel?: string;
  sortOrder?: number;
  imageUrl?: string | null;
}

export interface ListeningPlaylistItem {
  id: string;
  type: 'vocab' | 'sentence';
  speakText: string;
  display: string;
  meaning: string;
  lessonNumber: number;
}

export interface ListeningPlaylist {
  goalMinutes: number;
  lessonFrom: number;
  lessonTo: number;
  totalAvailable: number;
  items: ListeningPlaylistItem[];
}

export interface MockExamTemplate {
  id?: number;
  slug?: string;
  level: string;
  title: string;
  sourceMode?: 'GENERATED' | 'CUSTOM';
  durationMinutes: number;
  totalQuestions: number;
  lessonRange: string;
  scope?: string;
  description: string;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface MockExamTemplateAdmin extends MockExamTemplate {
  id: number;
  slug: string;
  sourceMode: 'GENERATED' | 'CUSTOM';
  lessonFrom: number;
  lessonTo: number;
  kanjiLessonFrom: number;
  kanjiLessonTo: number;
  vocabCount: number;
  grammarCount: number;
  kanjiCount: number;
  listeningWordCount: number;
  listeningSentenceCount: number;
  passThreshold: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MockExamTemplateInput {
  slug?: string;
  level: string;
  title: string;
  description?: string;
  sourceMode?: 'GENERATED' | 'CUSTOM';
  durationMinutes: number;
  lessonFrom: number;
  lessonTo: number;
  kanjiLessonFrom: number;
  kanjiLessonTo: number;
  vocabCount?: number;
  grammarCount?: number;
  kanjiCount?: number;
  listeningWordCount?: number;
  listeningSentenceCount?: number;
  passThreshold?: number;
  scope?: string;
  isPublished?: boolean;
  sortOrder?: number;
}

export interface MockExamQuestionOptionInput {
  text: string;
  imageUrl?: string | null;
}

export interface MockExamQuestionAdmin {
  id: number;
  templateId: number;
  sectionId: 'vocab' | 'grammar' | 'kanji' | 'listening';
  type: 'multiple_choice' | 'fill_in_blank' | 'listening';
  question: string;
  correctAnswer: string;
  options: MockExamQuestionOptionInput[];
  imageUrl?: string;
  audioText?: string;
  audioUrl?: string;
  sortOrder: number;
}

export interface MockExamQuestionInput {
  sectionId: 'vocab' | 'grammar' | 'kanji' | 'listening';
  type: 'multiple_choice' | 'fill_in_blank' | 'listening';
  question: string;
  correctAnswer: string;
  options?: MockExamQuestionOptionInput[];
  imageUrl?: string | null;
  audioText?: string | null;
  audioUrl?: string | null;
  sortOrder?: number;
}

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  name: string | null;
  avatarUrl?: string | null;
  nativeLanguage?: string | null;
  targetJlptLevel?: string | null;
  studyGoalMinutes?: number | null;
  hasPassword?: boolean;
  isGoogleLinked?: boolean;
  isKeycloakLinked?: boolean;
  createdAt?: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatarUrl?: string | null;
  nativeLanguage?: string;
  targetJlptLevel?: string | null;
  studyGoalMinutes?: number;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface AdminStats {
  counts: {
    lessons: number;
    vocabularies: number;
    grammars: number;
    exercises: number;
    kanjiLessons: number;
    kanjiEntries: number;
    users: number;
    examResults?: number;
  };
  recentLessons: Array<{
    id: number;
    lessonNumber: number;
    title: string | null;
    _count: { vocabularies: number; grammars: number; exercises: number };
  }>;
  generatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface JlptAnnouncement {
  title: string;
  url: string;
  updatedAt: string | null;
  examDate: string | null;
  kind: 'exam' | 'registration' | 'fee' | 'other';
}

export interface JlptDaNangSchedule {
  source: 'live' | 'fallback';
  fetchedAt: string;
  organizer: {
    name: string;
    shortName: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    registrationPortal: string;
  };
  fees: {
    formFee: string;
    examFee: string;
    note: string;
  };
  venues: Array<{
    address: string;
    district: string;
    levels: string;
    note?: string;
  }>;
  examDay: Array<{
    levels: string;
    arriveAt: string;
    startAt: string;
    venue: string;
  }>;
  briefing: string;
  announcements: JlptAnnouncement[];
}

export interface ApiErrorBody {
  message?: string | string[];
  statusCode?: number;
  error?: { code?: string; message?: string };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export type SubscriptionPlan = 'FREE' | 'BASIC' | 'PRO' | 'PRO_ANNUAL';
export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'PAUSED';

export interface SubscriptionPlanConfig {
  id: number;
  plan: SubscriptionPlan;
  displayName: string;
  priceUsdCents: number;
  intervalMonths: number;
  trialDays: number;
  features: string[];
  active: boolean;
}

export interface Subscription {
  id: number;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CreateSubscriptionResponse {
  /** null khi đổi gói trên subscription đang có hiệu lực: Stripe tự tính chênh lệch, không cần nhập thẻ */
  clientSecret: string | null;
  subscriptionId: string;
  changedPlan?: boolean;
}

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface PaymentRecord {
  id: number;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  refundedAt: string | null;
  refundAmountCents: number | null;
  refundReason: string | null;
  createdAt: string;
  session?: {
    id: number;
    scheduledAt: string;
    status: string;
    topic: string | null;
    coach?: { id: number; user?: { name: string | null } };
  } | null;
  subscription?: {
    id: number;
    plan: SubscriptionPlan;
    status: SubscriptionStatus;
  } | null;
}

export interface AdminUserSummary {
  id: number;
  email: string;
  role: string;
  name: string | null;
  createdAt: string;
  _count: { examResults: number };
}

export interface AdminPaymentRecord extends PaymentRecord {
  user: {
    id: number;
    email: string;
    name: string | null;
  };
}

export interface AdminPaymentsList {
  items: AdminPaymentRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface SupportChatUser {
  id: number;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  role: string;
}

export interface SupportChatMessage {
  id: number;
  threadId: number;
  senderId: number;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender: SupportChatUser;
}

export interface SupportThread {
  id: number;
  userId: number;
  lastMessageAt: string;
  user: SupportChatUser;
}

export interface SupportThreadResponse {
  thread: SupportThread;
  messages: SupportChatMessage[];
}

export interface AdminSupportThreadSummary {
  id: number;
  userId: number;
  lastMessageAt: string;
  user: SupportChatUser;
  lastMessage: SupportChatMessage | null;
  unreadCount: number;
}

export interface CommunityChatUser {
  id: number;
  name: string | null;
  email: string;
  avatarUrl?: string | null;
  role: string;
  memberRole?: string;
  joinedAt?: string;
}

export interface CommunityChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender: CommunityChatUser;
}

export interface CommunityRoomSummary {
  id: number;
  name: string;
  type: 'DIRECT' | 'GROUP';
  lastMessageAt: string;
  members: CommunityChatUser[];
  lastMessage: CommunityChatMessage | null;
  unreadCount: number;
}

export interface CommunityRoomDetail {
  id: number;
  name: string;
  type: 'DIRECT' | 'GROUP';
  lastMessageAt: string;
  members: CommunityChatUser[];
}

export interface CommunityRoomResponse {
  room: CommunityRoomDetail;
  messages: CommunityChatMessage[];
}

export interface RefundResult {
  paymentId: number;
  stripeRefundId: string;
  amountCents: number;
  status: PaymentStatus;
  message: string;
}

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface SetupIntentResponse {
  clientSecret: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
