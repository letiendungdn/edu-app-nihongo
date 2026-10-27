#!/bin/sh
# Dump chỉ bảng nội dung học (Minna + KLL + JLPT + reference). Chạy trong container postgres.
# Đây là nguồn seed duy nhất cho nội dung — không còn file .data.ts.

TABLES="
TextbookSeries TextbookBook
Lesson Vocabulary VocabularyExample Grammar Example Exercise ExerciseOption
KanjiLesson KanjiEntry KanjiVocab
KanaSection KanaCell KanaRomaji
CounterCategory CounterItem
PronunciationRulesMeta PronunciationRuleTip PronunciationRuleSection PronunciationRulePoint PronunciationRuleExample
ListeningConfig PodcastResource ListeningPreset
JlptOrganizer JlptExamFeeInfo JlptExamBriefing JlptExamSession JlptExamVenue JlptExamDaySlot
JlptRoadmapMeta StudyTip JlptRoadmapLevel JlptRoadmapExamSection JlptRoadmapMaterial JlptRoadmapPhase JlptRoadmapTask
ReadingPassage ReadingQuestion ReadingQuestionOption
VocabularyKanjiLink
CountryRegion CountryNameItem
HomeStat HomeFeatureSection HomeFeatureItem
ConversationIntroLine ConversationIntroSlot ConversationIntroExample ConversationPhraseGroup ConversationPhraseItem
RoleplayScene RoleplayLine
EnglishKatakanaMeta EnglishKatakanaTip EnglishKatakanaSection EnglishKatakanaPoint EnglishKatakanaMapping EnglishKatakanaExample
MindMapLevel
BookAudioMeta BookAudioItem BookAudioDriveFolder BookAudioFile
MockExamTemplate MockExamQuestion MockExamQuestionOption
"

CMD="pg_dump -U nihongo nihongo --data-only --column-inserts --disable-triggers"
for t in $TABLES; do
  CMD="$CMD --table='public.\"$t\"'"
done

eval "$CMD"
