package com.edu.nihongo.data.local

import com.edu.nihongo.data.local.dao.ReviewRow
import com.edu.nihongo.data.local.entity.LessonEntity
import com.edu.nihongo.data.local.entity.SrsCardEntity
import com.edu.nihongo.data.local.entity.VocabularyEntity
import com.edu.nihongo.domain.entity.Lesson
import com.edu.nihongo.domain.entity.ReviewCard
import com.edu.nihongo.domain.entity.SrsCard
import com.edu.nihongo.domain.entity.SyncStatus
import com.edu.nihongo.domain.entity.Vocabulary

fun VocabularyEntity.toDomain(): Vocabulary = Vocabulary(
    id = id,
    lessonNumber = lessonNumber,
    kana = kana,
    kanji = kanji,
    meaning = meaning,
    romaji = romaji,
    sortOrder = sortOrder,
    syncStatus = SyncStatus.valueOf(syncStatus),
)

fun SrsCardEntity.toDomain(): SrsCard = SrsCard(
    id = id,
    vocabularyId = vocabularyId,
    easeFactor = easeFactor,
    interval = interval,
    repetitions = repetitions,
    nextReviewAt = nextReviewAt,
    mastered = mastered,
    syncStatus = SyncStatus.valueOf(syncStatus),
    updatedAt = updatedAt,
)

fun ReviewRow.toDomain(): ReviewCard = ReviewCard(
    card = SrsCard(
        id = id,
        vocabularyId = vocabularyId,
        easeFactor = easeFactor,
        interval = interval,
        repetitions = repetitions,
        nextReviewAt = nextReviewAt,
        mastered = mastered,
        syncStatus = SyncStatus.valueOf(syncStatus),
        updatedAt = updatedAt,
    ),
    kana = kana,
    kanji = kanji,
    meaning = meaning,
    romaji = romaji,
)

fun SrsCard.toEntity(): SrsCardEntity = SrsCardEntity(
    id = id,
    vocabularyId = vocabularyId,
    easeFactor = easeFactor,
    interval = interval,
    repetitions = repetitions,
    nextReviewAt = nextReviewAt,
    mastered = mastered,
    syncStatus = syncStatus.name,
    updatedAt = updatedAt,
)

fun LessonEntity.toDomain(): Lesson = Lesson(
    id = id,
    lessonNumber = lessonNumber,
    title = title,
    description = description,
    vocabCount = vocabCount,
)
