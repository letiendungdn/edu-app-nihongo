# Sơ đồ ER — DB nihongo

> **Tự sinh** từ `packages/prisma-nihongo/schema.prisma` bởi `npm run db:erd`.
> Đừng sửa tay — sửa schema (hoặc cách chia phân hệ trong `packages/prisma-nihongo/scripts/gen-erd.ts`) rồi chạy lại.

**112 bảng · 17 enum · 78 quan hệ khóa ngoại.**
Ký hiệu: `PK` khóa chính · `FK` khóa ngoại · `UK` duy nhất · `"null"` cho phép null · `_list` mảng (Postgres array).
Bảng thu gọn (`→ xem phân hệ khác`) thuộc phân hệ khác, chỉ vẽ để thấy liên kết.

## Mục lục

- [Nội dung học](#nội-dung-học) — 17 bảng
- [JLPT: lịch thi, lộ trình, thi thử](#jlpt-lịch-thi-lộ-trình-thi-thử) — 16 bảng
- [Tham chiếu ngôn ngữ](#tham-chiếu-ngôn-ngữ) — 20 bảng
- [Trang & nội dung tĩnh](#trang--nội-dung-tĩnh) — 19 bảng
- [Người dùng & xác thực](#người-dùng--xác-thực) — 6 bảng
- [Tiến độ học](#tiến-độ-học) — 14 bảng
- [Thanh toán & marketplace coach](#thanh-toán--marketplace-coach) — 9 bảng
- [Giao tiếp & thông báo](#giao-tiếp--thông-báo) — 10 bảng
- [Khác](#khác) — 1 bảng

## Nội dung học

Bài học (Minna, JLPT, giáo trình Sou Matome/Shinkanzen/TRY — `Lesson.textbook`), kanji, đọc hiểu, mind map, danh mục giáo trình. (17 bảng; liên kết ngoài: `DictationAttempt`, `ReadingAttempt`)

```mermaid
erDiagram
  Lesson {
    int id PK
    int lessonNumber UK
    string title "null"
    string description "null"
    JlptLevel jlptLevel "null"
    Textbook textbook "null"
    string thumbnailUrl "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  Vocabulary {
    int id PK
    string kanji "null"
    string kana
    string romaji
    string meaning
    string meaningEn "null"
    string partOfSpeech "null"
    JlptLevel jlptLevel "null"
    string pitchAccent "null"
    string audioUrl "null"
    string imageUrl "null"
    int frequencyRank "null"
    int sortOrder
    int lessonId FK
    datetime createdAt
    datetime updatedAt
  }
  Grammar {
    int id PK
    string pattern
    string meaning
    string explanation "null"
    JlptLevel jlptLevel "null"
    string formalityLevel "null"
    int sortOrder
    int lessonId FK
    datetime createdAt
    datetime updatedAt
  }
  Example {
    int id PK
    string jp
    string romaji
    string en "null"
    string vi "null"
    string audioUrl "null"
    int sortOrder
    int grammarId FK
  }
  Exercise {
    int id PK
    ExerciseType type
    string question
    string answer
    string explanation "null"
    string audioUrl "null"
    int difficulty
    int sortOrder
    int lessonId FK
    datetime createdAt
    datetime updatedAt
  }
  ExerciseOption {
    int id PK
    int exerciseId FK
    string text
    bool isCorrect
    int sortOrder
  }
  KanjiLesson {
    int id PK
    int lessonNumber UK
    string title "null"
    JlptLevel jlptLevel "null"
    Textbook textbook "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  KanjiEntry {
    int id PK
    string character
    string hanViet "null"
    string onyomi "null"
    string kunyomi "null"
    string meaningVi
    string meaningEn "null"
    string mnemonicJp "null"
    string mnemonicVi "null"
    string imageUrl "null"
    JlptLevel jlptLevel "null"
    int strokeCount "null"
    int frequency "null"
    int grade "null"
    int sortOrder
    int lessonId FK
    datetime createdAt
    datetime updatedAt
  }
  KanjiVocab {
    int id PK
    string word
    string reading
    string meaningVi
    string exampleJa "null"
    string exampleKana "null"
    string exampleVi "null"
    int sortOrder
    int kanjiEntryId FK
    int vocabularyId FK "null"
  }
  VocabularyKanjiLink {
    int id PK
    int vocabularyId FK
    int kanjiEntryId FK
    datetime createdAt
  }
  VocabularyExample {
    int id PK
    int vocabularyId FK
    string ja
    string kana "null"
    string vi "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ReadingPassage {
    int id PK
    string title
    string content
    JlptLevel jlptLevel "null"
    string source "null"
    int estimatedMin
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ReadingQuestion {
    int id PK
    int passageId FK
    string question
    string answer
    string explanation "null"
    int sortOrder
  }
  ReadingQuestionOption {
    int id PK
    int questionId FK
    string text
    int sortOrder
  }
  TextbookSeries {
    int id PK
    Textbook code UK
    string name
    string nameJa
    string publisher
    string url
    string blurb
    string icon
    JlptLevel_list planLevels
    string audioMatch "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  TextbookBook {
    int id PK
    int seriesId FK
    JlptLevel level
    string title
    string note "null"
    string url "null"
    MindMapKind_list kinds
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  MindMapLevel {
    int id PK
    MindMapKind kind
    JlptLevel level
    string title
    string summary
    string accent
    json branches
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  DictationAttempt {
    string ref "→ xem phân hệ khác"
  }
  ReadingAttempt {
    string ref "→ xem phân hệ khác"
  }
  TextbookSeries ||--}o TextbookBook : series
  Lesson ||--}o Vocabulary : lesson
  Lesson ||--}o Grammar : lesson
  Grammar ||--}o Example : grammar
  Lesson ||--}o Exercise : lesson
  Exercise ||--}o ExerciseOption : exercise
  KanjiLesson ||--}o KanjiEntry : lesson
  KanjiEntry ||--}o KanjiVocab : kanjiEntry
  Vocabulary o|--}o KanjiVocab : vocabulary
  Vocabulary ||--}o VocabularyExample : vocabulary
  Vocabulary ||--}o VocabularyKanjiLink : vocabulary
  KanjiEntry ||--}o VocabularyKanjiLink : kanjiEntry
  ReadingPassage ||--}o ReadingQuestion : passage
  ReadingQuestion ||--}o ReadingQuestionOption : question
  ReadingPassage ||--}o ReadingAttempt : passage
  Vocabulary ||--}o DictationAttempt : vocab
```

- **VocabularyExample** — Liên kết từ vựng ↔ kanji (từ chứa chữ kanji nào). Bảng có sẵn trong DB (~2.5k dòng), trước đây tạo bằng db push nên nằm ngoài schema — giữ lại, không xóa. Câu ví dụ của từ vựng — mỗi từ có thể có nhiều câu, xếp theo sortOrder (câu 0 hiện đầu tiên).
- **TextbookSeries** — Danh mục bộ giáo trình tham khảo (menu "Giáo trình", trang /textbooks, khung sách ở mind map).
- **TextbookBook** — Một cuốn sách của bộ giáo trình theo cấp + kỹ năng.

## JLPT: lịch thi, lộ trình, thi thử

Lịch thi Đà Nẵng, lộ trình N5–N1, đề thi thử tùy chỉnh. (16 bảng)

```mermaid
erDiagram
  JlptOrganizer {
    int id PK
    string name
    string shortName
    string address
    string phone
    string email
    string website
    string announcementsUrl
    datetime updatedAt
  }
  JlptExamFeeInfo {
    int id PK
    string formFee
    string examFee
    string note
  }
  JlptExamBriefing {
    int id PK
    string text
  }
  JlptExamSession {
    int id PK
    string externalKey UK
    string label
    string examDate
    string registrationPeriod
    JlptSessionStatus status
    string statusLabel
    string announcementUrl "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  JlptExamVenue {
    int id PK
    string address
    string district
    string levels
    string note "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  JlptExamDaySlot {
    int id PK
    string levels
    string arriveAt
    string startAt
    string venue
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  JlptRoadmapMeta {
    int id PK
    string examScheduleNote
  }
  StudyTip {
    int id PK
    string text
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  JlptRoadmapLevel {
    int id PK
    string externalKey UK
    string label
    string badge
    string color
    string duration
    string vocabTarget
    string kanjiTarget
    string grammarTarget
    string vocabIncrement
    string kanjiIncrement
    string grammarIncrement
    string passScore
    string summary
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  JlptRoadmapExamSection {
    int id PK
    int levelId FK
    string name
    int points
    string time
    int sortOrder
  }
  JlptRoadmapMaterial {
    int id PK
    int levelId FK
    string title
    string description
    string scope
    string inAppPath "null"
    string inAppLabel "null"
    string externalUrl "null"
    string externalLabel "null"
    int sortOrder
  }
  JlptRoadmapPhase {
    int id PK
    int levelId FK
    string externalKey
    string title
    string subtitle
    int sortOrder
  }
  JlptRoadmapTask {
    int id PK
    int phaseId FK
    string externalKey
    string text
    string inAppPath "null"
    string inAppLabel "null"
    string externalUrl "null"
    string externalLabel "null"
    int sortOrder
  }
  MockExamTemplate {
    int id PK
    string slug UK
    string level
    string title
    string description
    string sourceMode
    int durationMinutes
    int lessonFrom
    int lessonTo
    int kanjiLessonFrom
    int kanjiLessonTo
    int vocabCount
    int grammarCount
    int kanjiCount
    int listeningWordCount
    int listeningSentenceCount
    int passThreshold
    string scope
    bool isPublished
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  MockExamQuestion {
    int id PK
    int templateId FK
    string sectionId
    string type
    string question
    string correctAnswer
    string imageUrl "null"
    string audioText "null"
    string audioUrl "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  MockExamQuestionOption {
    int id PK
    int questionId FK
    string text
    string imageUrl "null"
    int sortOrder
  }
  JlptRoadmapLevel ||--}o JlptRoadmapExamSection : level
  JlptRoadmapLevel ||--}o JlptRoadmapMaterial : level
  JlptRoadmapLevel ||--}o JlptRoadmapPhase : level
  JlptRoadmapPhase ||--}o JlptRoadmapTask : phase
  MockExamTemplate ||--}o MockExamQuestion : template
  MockExamQuestion ||--}o MockExamQuestionOption : question
```

- **MockExamTemplate** — Cấu hình đề thi thử JLPT — admin quản lý qua /mock-exam.

## Tham chiếu ngôn ngữ

Bảng kana, đếm số, tên quốc gia, hậu tố, quy tắc phát âm, tiếng Anh ↔ katakana. (20 bảng)

```mermaid
erDiagram
  KanaSection {
    int id PK
    KanaScript script
    string slug
    string title
    string subtitle "null"
    int columns
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  KanaCell {
    int id PK
    int sectionId FK
    int rowIndex
    int colIndex
    string kana
    string romaji
  }
  KanaRomaji {
    int id PK
    string kana UK
    string romaji
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  CounterCategory {
    int id PK
    string slug UK
    string label
    string hint
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  CounterItem {
    int id PK
    int categoryId FK
    string displayNumber
    string kanji "null"
    string kana
    string romaji
    string meaningVi
    int sortOrder
  }
  CountryRegion {
    int id PK
    string slug UK
    string label
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  CountryNameItem {
    int id PK
    int regionId FK
    string nameJa
    string kana
    string romaji
    string meaningVi
    string countryCode
    int sortOrder
  }
  VocabSuffixGroup {
    int id PK
    string slug UK
    string label
    string labelJa
    string hint
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  VocabSuffixItem {
    int id PK
    int groupId FK
    string suffix
    string_list forms
    string kana
    string romaji
    string meaningVi
    string attachesTo
    string_list pos
    string exampleJa
    string exampleVi
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  PronunciationRulesMeta {
    int id PK
    string intro
    datetime createdAt
    datetime updatedAt
  }
  PronunciationRuleTip {
    int id PK
    string text
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  PronunciationRuleSection {
    int id PK
    string slug UK
    string title
    string summary
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  PronunciationRulePoint {
    int id PK
    int sectionId FK
    string label "null"
    string japanese "null"
    string romaji "null"
    string explanation
    int sortOrder
  }
  PronunciationRuleExample {
    int id PK
    int sectionId FK
    string japanese
    string romaji
    string meaning
    string note "null"
    int sortOrder
  }
  EnglishKatakanaMeta {
    int id PK
    string intro
    datetime createdAt
    datetime updatedAt
  }
  EnglishKatakanaTip {
    int id PK
    string text
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  EnglishKatakanaSection {
    int id PK
    string slug UK
    string title
    string summary
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  EnglishKatakanaPoint {
    int id PK
    int sectionId FK
    string explanation
    string english "null"
    string katakana "null"
    string romaji "null"
    int sortOrder
  }
  EnglishKatakanaMapping {
    int id PK
    int sectionId FK
    string english
    string katakana
    string romaji
    string note "null"
    int sortOrder
  }
  EnglishKatakanaExample {
    int id PK
    int sectionId FK
    string english
    string katakana
    string romaji
    string meaningVi
    string note "null"
    int sortOrder
  }
  KanaSection ||--}o KanaCell : section
  CounterCategory ||--}o CounterItem : category
  CountryRegion ||--}o CountryNameItem : region
  VocabSuffixGroup ||--}o VocabSuffixItem : group
  PronunciationRuleSection ||--}o PronunciationRulePoint : section
  PronunciationRuleSection ||--}o PronunciationRuleExample : section
  EnglishKatakanaSection ||--}o EnglishKatakanaPoint : section
  EnglishKatakanaSection ||--}o EnglishKatakanaMapping : section
  EnglishKatakanaSection ||--}o EnglishKatakanaExample : section
```

- **KanaRomaji** — Tra cứu kana → romaji (dùng cho dịch nhanh, TTS overlay)

## Trang & nội dung tĩnh

Trang chủ, giao tiếp/đóng vai, nghe mỗi ngày, file nghe sách, banner. (19 bảng)

```mermaid
erDiagram
  HomeStat {
    int id PK
    string value
    string label
    string suffix
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  HomeFeatureSection {
    int id PK
    string slug UK
    string title
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  HomeFeatureItem {
    int id PK
    int sectionId FK
    string href
    string icon
    string title
    string desc
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ConversationIntroLine {
    int id PK
    string ja
    string kana
    string romaji
    string vi
    string tip "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ConversationIntroSlot {
    int id PK
    string slot
    string question
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ConversationIntroExample {
    int id PK
    int slotId FK
    string ja
    string kana
    string romaji
    string vi
    string note "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ConversationPhraseGroup {
    int id PK
    string slug UK
    string label
    string hint
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ConversationPhraseItem {
    int id PK
    int groupId FK
    string ja
    string kana
    string romaji
    string vi
    string note "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  RoleplayScene {
    int id PK
    string slug UK
    string title
    string titleJa
    string desc
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  RoleplayLine {
    int id PK
    int sceneId FK
    string role
    string ja
    string vi
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ListeningConfig {
    int id PK
    int goalMinutes
  }
  PodcastResource {
    int id PK
    string externalKey UK
    string title
    string description
    string url
    string level
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  ListeningPreset {
    int id PK
    string externalKey UK
    string label
    int lessonFrom
    int lessonTo
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  BookAudioMeta {
    int id PK
    string sourceUrl
    string publisher
    datetime updatedAt
  }
  BookAudioItem {
    int id PK
    string externalKey UK
    string level
    string title
    string url
    string note "null"
    int listNo "null"
    int sortOrder
    string driveId "null"
    string driveKind "null"
    int folderId FK "null"
    datetime createdAt
    datetime updatedAt
  }
  BookAudioDriveFolder {
    int id PK
    string driveId UK
    string title "null"
    string localPath "null"
    int fileCount
    datetime downloadedAt "null"
    datetime createdAt
    datetime updatedAt
  }
  BookAudioFile {
    int id PK
    int folderId FK "null"
    int itemId FK "null"
    string driveFileId "null"
    string fileName
    string localPath
    string mimeType "null"
    int sizeBytes "null"
    int sortOrder
    datetime createdAt
    datetime updatedAt
  }
  PageBanner {
    int id PK
    string path UK
    string imageData
    datetime createdAt
    datetime updatedAt
  }
  FeatureFlag {
    string key PK
    string description "null"
    bool enabled
    Role_list roles
    datetime updatedAt
  }
  HomeFeatureSection ||--}o HomeFeatureItem : section
  ConversationIntroSlot ||--}o ConversationIntroExample : slot
  ConversationPhraseGroup ||--}o ConversationPhraseItem : group
  RoleplayScene ||--}o RoleplayLine : scene
  BookAudioDriveFolder o|--}o BookAudioItem : folder
  BookAudioDriveFolder o|--}o BookAudioFile : folder
  BookAudioItem o|--}o BookAudioFile : item
```

- **BookAudioMeta** — File nghe / link sách (Mailee Books & tương tự)
- **FeatureFlag** — Feature flag: bật/tắt tính năng không cần deploy. roles rỗng = mọi người (kể cả khách); có giá trị = chỉ các vai trò đó.

## Người dùng & xác thực

Tài khoản, token, tùy chọn email, thiết bị push. (6 bảng; liên kết ngoài: `ChatMessage`, `CoachProfile`, `CoachReview`, `CoachingSession`, `DailyActivity`, `DailyGoal`, `DailyNote`, `ExamResult`, `LearnerChatMember`, `LearnerChatMessage`, `LearnerChatRoom`, `ListeningLog`, `LiveSession`, `Notification`, `Payment`, `SrsCard`, `StudySession`, `StudyStreak`, `Subscription`, `SupportMessage`, `SupportThread`)

```mermaid
erDiagram
  User {
    int id PK
    string email UK
    string passwordHash "null"
    string googleId UK "null"
    string keycloakId UK "null"
    Role role
    string name "null"
    string avatarUrl "null"
    string nativeLanguage "null"
    JlptLevel targetJlptLevel "null"
    int studyGoalMinutes "null"
    datetime lastActiveAt "null"
    datetime createdAt
    datetime updatedAt
    datetime emailVerifiedAt "null"
    bool emailBounced
  }
  RefreshToken {
    string id PK
    string token UK
    int userId FK
    datetime expiresAt
    bool revoked
    datetime revokedAt "null"
    datetime createdAt
  }
  PasswordResetToken {
    string id PK
    string tokenHash UK
    int userId FK
    datetime expiresAt
    datetime usedAt "null"
    datetime createdAt
  }
  EmailVerificationToken {
    string id PK
    string tokenHash UK
    int userId FK
    datetime expiresAt
    datetime usedAt "null"
    datetime createdAt
  }
  EmailPrefs {
    int id PK
    int userId FK, UK
    bool receiveProgress
    bool receiveStreak
    int lastMilestoneNotified
    datetime updatedAt
  }
  PushDeviceToken {
    string id PK
    int userId FK
    string token UK
    string platform
    datetime createdAt
    datetime updatedAt
  }
  ChatMessage {
    string ref "→ xem phân hệ khác"
  }
  CoachProfile {
    string ref "→ xem phân hệ khác"
  }
  CoachReview {
    string ref "→ xem phân hệ khác"
  }
  CoachingSession {
    string ref "→ xem phân hệ khác"
  }
  DailyActivity {
    string ref "→ xem phân hệ khác"
  }
  DailyGoal {
    string ref "→ xem phân hệ khác"
  }
  DailyNote {
    string ref "→ xem phân hệ khác"
  }
  ExamResult {
    string ref "→ xem phân hệ khác"
  }
  LearnerChatMember {
    string ref "→ xem phân hệ khác"
  }
  LearnerChatMessage {
    string ref "→ xem phân hệ khác"
  }
  LearnerChatRoom {
    string ref "→ xem phân hệ khác"
  }
  ListeningLog {
    string ref "→ xem phân hệ khác"
  }
  LiveSession {
    string ref "→ xem phân hệ khác"
  }
  Notification {
    string ref "→ xem phân hệ khác"
  }
  Payment {
    string ref "→ xem phân hệ khác"
  }
  SrsCard {
    string ref "→ xem phân hệ khác"
  }
  StudySession {
    string ref "→ xem phân hệ khác"
  }
  StudyStreak {
    string ref "→ xem phân hệ khác"
  }
  Subscription {
    string ref "→ xem phân hệ khác"
  }
  SupportMessage {
    string ref "→ xem phân hệ khác"
  }
  SupportThread {
    string ref "→ xem phân hệ khác"
  }
  User ||--}o LiveSession : coach
  User ||--}o RefreshToken : user
  User ||--}o PasswordResetToken : user
  User ||--}o SrsCard : user
  User o|--}o ExamResult : user
  User ||--}o ListeningLog : user
  User ||--}o StudySession : user
  User ||--|o StudyStreak : user
  User ||--}o DailyActivity : user
  User ||--}o DailyNote : user
  User ||--}o DailyGoal : user
  User ||--|o Subscription : user
  User ||--|o CoachProfile : user
  User ||--}o CoachingSession : learner
  User ||--}o Payment : user
  User ||--}o CoachReview : learner
  User ||--}o ChatMessage : sender
  User ||--}o Notification : user
  User ||--|o SupportThread : user
  User ||--}o SupportMessage : sender
  User ||--}o LearnerChatRoom : createdBy
  User ||--}o LearnerChatMember : user
  User ||--}o LearnerChatMessage : sender
  User ||--}o EmailVerificationToken : user
  User ||--|o EmailPrefs : user
  User ||--}o PushDeviceToken : user
```

## Tiến độ học

SRS, kết quả thi, nghe, phiên học, streak, nhật ký, mục tiêu ngày; outbox event nộp bài (Kafka). (14 bảng; liên kết ngoài: `ReadingPassage`, `User`, `Vocabulary`)

```mermaid
erDiagram
  SrsCard {
    int id PK
    int userId FK
    ContentType contentType
    int contentId
    float easeFactor
    int interval
    int repetitions
    datetime nextReviewAt "null"
    datetime lastReviewedAt "null"
    int correctCount
    int wrongCount
    int reviewStreak
    bool mastered
    datetime createdAt
    datetime updatedAt
  }
  ExamResult {
    int id PK
    int userId FK "null"
    string examId
    string level
    string title
    int correctCount
    int total
    float percent
    bool passed
    datetime submittedAt
  }
  ExamSectionResult {
    int id PK
    int examResultId FK
    string section
    int correct
    int total
    float percent
  }
  ListeningLog {
    int id PK
    int userId FK
    datetime date
    int seconds
    int lessonFrom "null"
    int lessonTo "null"
    datetime createdAt
    datetime updatedAt
  }
  StudySession {
    int id PK
    int userId FK
    datetime date
    int seconds
    int cardsReviewed
    datetime createdAt
  }
  StudyStreak {
    int id PK
    int userId FK, UK
    int currentStreak
    int longestStreak
    string lastStudyDate "null"
    datetime updatedAt
  }
  DailyActivity {
    int id PK
    int userId FK
    string date
    string kind
    int count
    datetime updatedAt
  }
  ReadingAttempt {
    int id PK
    int userId "null"
    int passageId FK
    int correct
    int total
    float percent
    datetime submittedAt
  }
  DictationAttempt {
    int id PK
    int userId "null"
    int vocabId FK
    string userInput
    bool correct
    datetime createdAt
  }
  DailyNote {
    int id PK
    int userId FK
    string date
    string content
    datetime createdAt
    datetime updatedAt
  }
  DailyGoal {
    int id PK
    int userId FK
    string date
    datetime createdAt
    datetime updatedAt
  }
  DailyGoalItem {
    int id PK
    int goalId FK
    string text
    bool done
    int sortOrder
  }
  OutboxEvent {
    int id PK
    string topic
    string key "null"
    json payload
    int attempts
    string lastError "null"
    datetime createdAt
    datetime publishedAt "null"
  }
  ProcessedEvent {
    string eventId
    string consumer
    datetime processedAt
  }
  ReadingPassage {
    string ref "→ xem phân hệ khác"
  }
  User {
    string ref "→ xem phân hệ khác"
  }
  Vocabulary {
    string ref "→ xem phân hệ khác"
  }
  User ||--}o SrsCard : user
  User o|--}o ExamResult : user
  ExamResult ||--}o ExamSectionResult : examResult
  User ||--}o ListeningLog : user
  User ||--}o StudySession : user
  User ||--|o StudyStreak : user
  User ||--}o DailyActivity : user
  ReadingPassage ||--}o ReadingAttempt : passage
  Vocabulary ||--}o DictationAttempt : vocab
  User ||--}o DailyNote : user
  User ||--}o DailyGoal : user
  DailyGoal ||--}o DailyGoalItem : goal
```

- **OutboxEvent** — Transactional outbox: event ghi CÙNG transaction với dữ liệu nghiệp vụ, relay (exam-service) đẩy lên Kafka rồi đánh dấu publishedAt. Không mất event khi Kafka lỗi.
- **ProcessedEvent** — Consumer idempotent: mỗi (eventId, consumer) chỉ xử lý một lần — outbox/Kafka giao "ít nhất một lần".

## Thanh toán & marketplace coach

Gói thuê bao Stripe, coach, đặt lịch, thanh toán, chi trả, webhook. (9 bảng; liên kết ngoài: `ChatMessage`, `User`)

```mermaid
erDiagram
  SubscriptionPlanConfig {
    int id PK
    SubscriptionPlan plan UK
    string displayName
    int priceUsdCents
    int intervalMonths
    int trialDays
    json features
    string stripePriceId "null"
    bool active
    datetime createdAt
    datetime updatedAt
  }
  Subscription {
    int id PK
    int userId FK, UK
    SubscriptionPlan plan
    SubscriptionStatus status
    string stripeCustomerId "null"
    string stripeSubscriptionId UK "null"
    string stripePriceId "null"
    datetime currentPeriodStart "null"
    datetime currentPeriodEnd "null"
    datetime trialEnd "null"
    datetime canceledAt "null"
    bool cancelAtPeriodEnd
    datetime createdAt
    datetime updatedAt
  }
  CoachProfile {
    int id PK
    int userId FK, UK
    string bio "null"
    string_list languages
    string_list specializations
    int hourlyRateUsd
    string currency
    string timezone
    bool isActive
    bool isVerified
    datetime featuredUntil "null"
    int totalSessions
    float avgRating "null"
    int reviewCount
    string stripeAccountId UK "null"
    bool payoutEnabled
    datetime createdAt
    datetime updatedAt
  }
  CoachAvailability {
    int id PK
    int coachId FK
    int dayOfWeek
    int startHour
    int startMinute
    int endHour
    int endMinute
  }
  CoachingSession {
    int id PK
    int learnerId FK
    int coachId FK
    SessionStatus status
    datetime scheduledAt
    int durationMin
    string topic "null"
    string notes "null"
    int priceUsdCents
    int platformFeePercent
    int payoutId FK "null"
    datetime canceledAt "null"
    string canceledBy "null"
    string cancelReason "null"
    datetime createdAt
    datetime updatedAt
  }
  Payment {
    int id PK
    int userId FK
    int amountCents
    string currency
    PaymentStatus status
    string stripePaymentIntentId UK "null"
    string stripeChargeId "null"
    string stripeReceiptUrl "null"
    int subscriptionId FK "null"
    int sessionId FK, UK "null"
    datetime refundedAt "null"
    int refundAmountCents "null"
    string refundReason "null"
    json metadata "null"
    datetime createdAt
    datetime updatedAt
  }
  Payout {
    int id PK
    int coachId FK
    int amountCents
    string currency
    PayoutStatus status
    string stripeTransferId UK "null"
    string stripePayoutId "null"
    datetime periodStart
    datetime periodEnd
    int sessionCount
    int grossAmountCents
    int feeAmountCents
    datetime processedAt "null"
    string failReason "null"
    int attempts
    datetime createdAt
    datetime updatedAt
  }
  CoachReview {
    int id PK
    int sessionId FK, UK
    int learnerId FK
    int coachId FK
    int rating
    string comment "null"
    datetime createdAt
    datetime updatedAt
  }
  WebhookEvent {
    int id PK
    string provider
    string eventId UK
    string eventType
    json payload
    WebhookEventStatus status
    datetime processedAt "null"
    string errorMessage "null"
    int retryCount
    datetime createdAt
    datetime updatedAt
  }
  ChatMessage {
    string ref "→ xem phân hệ khác"
  }
  User {
    string ref "→ xem phân hệ khác"
  }
  User ||--|o Subscription : user
  User ||--|o CoachProfile : user
  CoachProfile ||--}o CoachAvailability : coach
  User ||--}o CoachingSession : learner
  CoachProfile ||--}o CoachingSession : coach
  Payout o|--}o CoachingSession : payoutRecord
  User ||--}o Payment : user
  Subscription o|--}o Payment : subscription
  CoachingSession o|--|o Payment : session
  CoachProfile ||--}o Payout : coach
  CoachingSession ||--|o CoachReview : session
  User ||--}o CoachReview : learner
  CoachProfile ||--}o CoachReview : coach
  CoachingSession ||--}o ChatMessage : session
```

## Giao tiếp & thông báo

Chat coaching, thông báo, hỗ trợ, phòng chat cộng đồng, buổi live, email. (10 bảng; liên kết ngoài: `CoachingSession`, `User`)

```mermaid
erDiagram
  ChatMessage {
    int id PK
    int sessionId FK
    int senderId FK
    string content
    string fileUrl "null"
    string fileType "null"
    datetime readAt "null"
    datetime createdAt
  }
  Notification {
    int id PK
    int userId FK
    NotificationType type
    string title
    string body
    json metadata "null"
    datetime readAt "null"
    datetime createdAt
  }
  SupportThread {
    int id PK
    int userId FK, UK
    datetime lastMessageAt
    datetime createdAt
    datetime updatedAt
  }
  SupportMessage {
    int id PK
    int threadId FK
    int senderId FK
    string content
    string fileUrl "null"
    string fileType "null"
    datetime readAt "null"
    datetime createdAt
  }
  LearnerChatRoom {
    int id PK
    string name "null"
    LearnerChatRoomType type
    int createdById FK
    datetime lastMessageAt
    datetime createdAt
    datetime updatedAt
  }
  LearnerChatMember {
    int id PK
    int roomId FK
    int userId FK
    LearnerChatMemberRole role
    datetime joinedAt
  }
  LearnerChatMessage {
    int id PK
    int roomId FK
    int senderId FK
    string content
    string fileUrl "null"
    string fileType "null"
    datetime readAt "null"
    datetime createdAt
  }
  LiveSession {
    int id PK
    string roomName UK
    int coachId FK
    string title
    string status
    datetime startedAt
    datetime endedAt "null"
  }
  EmailBroadcast {
    string id PK
    string type
    string templateName "null"
    string subject
    json filter
    int totalCount
    int sentCount
    int failedCount
    string status
    datetime startedAt "null"
    datetime completedAt "null"
    int createdById
    datetime createdAt
  }
  EmailTemplate {
    int id PK
    string name UK
    string description "null"
    string subject
    string htmlBody
    string textBody
    string_list variables
    json attachments
    bool active
    int updatedById "null"
    datetime createdAt
    datetime updatedAt
  }
  CoachingSession {
    string ref "→ xem phân hệ khác"
  }
  User {
    string ref "→ xem phân hệ khác"
  }
  User ||--}o LiveSession : coach
  CoachingSession ||--}o ChatMessage : session
  User ||--}o ChatMessage : sender
  User ||--}o Notification : user
  User ||--|o SupportThread : user
  SupportThread ||--}o SupportMessage : thread
  User ||--}o SupportMessage : sender
  User ||--}o LearnerChatRoom : createdBy
  LearnerChatRoom ||--}o LearnerChatMember : room
  User ||--}o LearnerChatMember : user
  LearnerChatRoom ||--}o LearnerChatMessage : room
  User ||--}o LearnerChatMessage : sender
```

## Khác

Bảng chưa được xếp phân hệ trong packages/prisma-nihongo/scripts/gen-erd.ts. (1 bảng)

```mermaid
erDiagram
  CronRun {
    string name
    string slot
    datetime startedAt
  }
```

- **CronRun** — Mỗi lượt chạy của một cron (ví dụ "push.daily-srs" + "2026-10-21"). Khóa chính chặn pod thứ hai chạy lại cùng lượt: gateway chạy nhiều pod, @Cron nổ ở TẤT CẢ các pod.

## Enum

| Enum | Giá trị |
|------|---------|
| `Role` | `USER` · `TEACHER` · `ADMIN` |
| `JlptLevel` | `N5` · `N4` · `N3` · `N2` · `N1` |
| `ExerciseType` | `MULTIPLE_CHOICE` · `FILL_IN_BLANK` · `LISTENING` |
| `ContentType` | `VOCABULARY` · `GRAMMAR` · `KANJI` |
| `KanaScript` | `HIRAGANA` · `KATAKANA` |
| `JlptSessionStatus` | `REGISTRATION_OPEN` · `REGISTRATION_CLOSED` · `UPCOMING` · `PAST` |
| `Textbook` | `MINNA` · `KLL` · `SOUMATOME` · `SHINKANZEN` · `TRY` |
| `SubscriptionStatus` | `ACTIVE` · `PAST_DUE` · `CANCELED` · `TRIALING` · `PAUSED` |
| `SubscriptionPlan` | `FREE` · `BASIC` · `PRO` · `PRO_ANNUAL` |
| `PaymentStatus` | `PENDING` · `SUCCEEDED` · `FAILED` · `REFUNDED` · `PARTIALLY_REFUNDED` |
| `SessionStatus` | `PENDING` · `CONFIRMED` · `IN_PROGRESS` · `COMPLETED` · `CANCELED` · `NO_SHOW` |
| `PayoutStatus` | `PENDING` · `PROCESSING` · `PAID` · `FAILED` |
| `WebhookEventStatus` | `RECEIVED` · `PROCESSED` · `FAILED` · `IGNORED` |
| `NotificationType` | `PAYMENT_SUCCESS` · `PAYMENT_FAILED` · `SESSION_CONFIRMED` · `SESSION_CANCELED` · `SESSION_REMINDER` · `COACH_MESSAGE` · `SUPPORT_MESSAGE` · `GROUP_MESSAGE` · `SYSTEM` |
| `LearnerChatRoomType` | `DIRECT` · `GROUP` |
| `LearnerChatMemberRole` | `MEMBER` · `ADMIN` |
| `MindMapKind` | `GRAMMAR` · `VOCAB` · `KANJI` |
