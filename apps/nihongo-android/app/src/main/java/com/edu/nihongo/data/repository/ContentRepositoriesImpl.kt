package com.edu.nihongo.data.repository

import com.edu.nihongo.data.local.dao.ExamAttemptDao
import com.edu.nihongo.data.local.dao.GrammarDao
import com.edu.nihongo.data.local.dao.KanjiDao
import com.edu.nihongo.data.local.dao.ProgressDao
import com.edu.nihongo.data.local.dao.ReadingDao
import com.edu.nihongo.data.local.entity.ExamAttemptEntity
import com.edu.nihongo.data.local.entity.GrammarEntity
import com.edu.nihongo.data.local.entity.GrammarExampleEntity
import com.edu.nihongo.data.local.entity.KanjiEntity
import com.edu.nihongo.data.local.entity.ProgressSummaryEntity
import com.edu.nihongo.data.local.entity.ReadingPassageEntity
import com.edu.nihongo.data.local.entity.ReadingQuestionEntity
import com.edu.nihongo.data.local.entity.ReadingWithQuestions
import com.edu.nihongo.data.local.entity.StudyDayEntity
import com.edu.nihongo.data.remote.AnswersRequest
import com.edu.nihongo.data.remote.ChatMessageDto
import com.edu.nihongo.data.remote.ChatStream
import com.edu.nihongo.data.remote.ChatUserDto
import com.edu.nihongo.data.remote.CommunityApi
import com.edu.nihongo.data.remote.ContentApi
import com.edu.nihongo.data.remote.DirectChatRequest
import com.edu.nihongo.data.remote.LearningProgressApi
import com.edu.nihongo.data.remote.MockExamApi
import com.edu.nihongo.data.remote.MockExamResultDto
import com.edu.nihongo.data.remote.SendMessageRequest
import com.edu.nihongo.data.remote.StreamEvent
import com.edu.nihongo.domain.entity.ChatEvent
import com.edu.nihongo.domain.TimeSource
import com.edu.nihongo.domain.entity.ChatMessage
import com.edu.nihongo.domain.entity.ChatRoom
import com.edu.nihongo.domain.entity.ChatUser
import com.edu.nihongo.domain.entity.ExamAttempt
import com.edu.nihongo.domain.entity.ExamQuestion
import com.edu.nihongo.domain.entity.ExamResult
import com.edu.nihongo.domain.entity.ExamReviewItem
import com.edu.nihongo.domain.entity.Grammar
import com.edu.nihongo.domain.entity.GrammarExample
import com.edu.nihongo.domain.entity.Kanji
import com.edu.nihongo.domain.entity.LearnerProgress
import com.edu.nihongo.domain.entity.MockExamTemplate
import com.edu.nihongo.domain.entity.QuizScore
import com.edu.nihongo.domain.entity.ReadingPassage
import com.edu.nihongo.domain.entity.ReadingQuestion
import com.edu.nihongo.domain.entity.SectionScore
import com.edu.nihongo.domain.entity.StudyDay
import com.edu.nihongo.domain.repository.ChatRepository
import com.edu.nihongo.domain.repository.ContentRepository
import com.edu.nihongo.domain.repository.ExamRepository
import com.edu.nihongo.domain.repository.ProgressRepository
import com.edu.nihongo.domain.repository.SubmitOutcome
import com.edu.nihongo.domain.repository.gradeReading
import com.edu.nihongo.utils.runCatchingCancellable
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.IOException
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ProgressRepositoryImpl @Inject constructor(
    private val api: LearningProgressApi,
    private val dao: ProgressDao,
    private val timeSource: TimeSource,
) : ProgressRepository {
    override fun observeProgress(): Flow<LearnerProgress?> = dao.observeSummary().map { e ->
        e?.let {
            LearnerProgress(
                currentStreak = it.currentStreak,
                longestStreak = it.longestStreak,
                totalSeconds = it.totalSeconds,
                totalCards = it.totalCards,
                vocabTotal = it.vocabTotal,
                kanjiTotal = it.kanjiTotal,
                fetchedAt = it.fetchedAt,
            )
        }
    }

    override fun observeRecentDays(limit: Int): Flow<List<StudyDay>> =
        dao.observeRecentDays(limit).map { rows ->
            rows.map { StudyDay(it.studyDate, it.seconds, it.cardsReviewed, it.vocabCount, it.kanjiCount) }
        }

    override suspend fun refresh(): Result<Unit> = runCatchingCancellable {
        val dto = api.mine().data ?: error("Không có dữ liệu tiến độ")
        val s = dto.summary ?: error("Không có dữ liệu tiến độ")
        dao.replace(
            ProgressSummaryEntity(
                userId = s.userId ?: 0,
                currentStreak = s.currentStreak ?: 0,
                longestStreak = s.longestStreak ?: 0,
                totalSeconds = s.totalSeconds ?: 0,
                totalCards = s.totalCards ?: 0,
                vocabTotal = s.vocabTotal ?: 0,
                kanjiTotal = s.kanjiTotal ?: 0,
                fetchedAt = timeSource.now(),
            ),
            dto.recentDays.orEmpty().mapNotNull { d ->
                val date = d.studyDate?.take(10) ?: return@mapNotNull null
                StudyDayEntity(date, d.seconds ?: 0, d.cardsReviewed ?: 0, d.vocabCount ?: 0, d.kanjiCount ?: 0)
            },
        )
    }
}

@Singleton
class ContentRepositoryImpl @Inject constructor(
    private val api: ContentApi,
    private val grammarDao: GrammarDao,
    private val kanjiDao: KanjiDao,
    private val readingDao: ReadingDao,
) : ContentRepository {

    override fun observeGrammar(lessonNumber: Int): Flow<List<Grammar>> =
        grammarDao.observeByLesson(lessonNumber).map { rows ->
            rows.map { row ->
                Grammar(
                    id = row.grammar.id,
                    pattern = row.grammar.pattern,
                    meaning = row.grammar.meaning,
                    explanation = row.grammar.explanation,
                    examples = row.examples.sortedBy { it.sortOrder }.map { GrammarExample(it.jp, it.romaji, it.vi) },
                )
            }
        }

    override suspend fun refreshGrammar(lessonNumber: Int): Result<Unit> = runCatchingCancellable {
        val items = api.grammars(lessonNumber).data?.data.orEmpty()
        grammarDao.replaceLesson(
            lessonNumber,
            items.mapIndexed { i, g ->
                GrammarEntity(g.id, lessonNumber, g.pattern.orEmpty(), g.meaning.orEmpty(), g.explanation, g.jlptLevel, g.sortOrder ?: i)
            },
            items.flatMap { g ->
                g.examples.orEmpty().mapIndexed { i, e ->
                    GrammarExampleEntity(e.id, g.id, e.jp.orEmpty(), e.romaji, e.vi, e.sortOrder ?: i)
                }
            },
        )
    }

    override fun observeKanji(lessonNumber: Int): Flow<List<Kanji>> =
        kanjiDao.observeByLesson(lessonNumber).map { rows ->
            rows.map { Kanji(it.id, it.character, it.hanViet, it.onyomi, it.kunyomi, it.meaningVi, it.mnemonicVi) }
        }

    override suspend fun refreshKanji(lessonNumber: Int): Result<Unit> = runCatchingCancellable {
        val items = api.kanji(lessonNumber).data.orEmpty()
        kanjiDao.replaceLesson(
            lessonNumber,
            items.mapIndexed { i, k ->
                KanjiEntity(k.id, lessonNumber, k.character.orEmpty(), k.hanViet, k.onyomi, k.kunyomi, k.meaningVi, k.mnemonicVi, k.sortOrder ?: i)
            },
        )
    }

    override fun observeReadingList(): Flow<List<ReadingPassage>> =
        readingDao.observePassages().map { rows -> rows.map { it.toDomain(emptyList()) } }

    override suspend fun refreshReadingList(): Result<Unit> = runCatchingCancellable {
        readingDao.upsertSummaries(
            api.readingList().data.orEmpty().mapIndexed { i, r ->
                ReadingPassageEntity(
                    id = r.id,
                    title = r.title.orEmpty(),
                    jlptLevel = r.jlptLevel,
                    estimatedMin = r.estimatedMin ?: 3,
                    sortOrder = r.sortOrder ?: i,
                    questionCount = r.count?.questions ?: 0,
                    content = null,
                )
            },
        )
    }

    override fun observeReading(id: Long): Flow<ReadingPassage?> =
        readingDao.observePassage(id).map { it?.toDomain() }

    override suspend fun refreshReading(id: Long): Result<Unit> = runCatchingCancellable {
        val d = api.reading(id).data ?: error("Không tìm thấy bài đọc")
        val questions = d.questions.orEmpty()
        readingDao.saveDetail(
            ReadingPassageEntity(
                id = d.id,
                title = d.title.orEmpty(),
                jlptLevel = d.jlptLevel,
                estimatedMin = d.estimatedMin ?: 3,
                sortOrder = d.sortOrder ?: 0,
                questionCount = questions.size,
                content = d.content.orEmpty(),
            ),
            questions.mapIndexed { i, q ->
                ReadingQuestionEntity(
                    id = q.id,
                    passageId = d.id,
                    question = q.question.orEmpty(),
                    answer = q.answer.orEmpty(),
                    explanation = q.explanation,
                    options = q.options.orEmpty().sortedBy { it.sortOrder ?: 0 }.mapNotNull { it.text },
                    sortOrder = q.sortOrder ?: i,
                )
            },
        )
    }

    override suspend fun submitReading(passage: ReadingPassage, answers: Map<Long, String>): SubmitOutcome =
        try {
            val res = api.submitReading(passage.id, AnswersRequest(answers.mapKeys { it.key.toString() })).data
                ?: error("Không có kết quả")
            SubmitOutcome(QuizScore(res.correct ?: 0, res.total ?: passage.questions.size), gradedOffline = false)
        } catch (e: IOException) {
            // Mất mạng: vẫn cho người học biết kết quả, chấm bằng đáp án đã lưu trong Room
            SubmitOutcome(gradeReading(passage.questions, answers), gradedOffline = true)
        }

    private fun ReadingWithQuestions.toDomain(): ReadingPassage =
        passage.toDomain(
            questions.sortedBy { it.sortOrder }.map { ReadingQuestion(it.id, it.question, it.options, it.answer, it.explanation) },
        )

    private fun ReadingPassageEntity.toDomain(questions: List<ReadingQuestion>) =
        ReadingPassage(id, title, jlptLevel, estimatedMin, questionCount, content, questions)
}

@Singleton
class ExamRepositoryImpl @Inject constructor(
    private val api: MockExamApi,
    private val dao: ExamAttemptDao,
    private val gson: Gson,
    private val timeSource: TimeSource,
) : ExamRepository {
    private val questionsType = object : TypeToken<List<ExamQuestion>>() {}.type
    private val answersType = object : TypeToken<Map<String, String>>() {}.type
    // Chọn đáp án liên tục: đọc-sửa-ghi answers_json phải tuần tự, không mất lựa chọn nào
    private val answerLock = Mutex()

    override suspend fun templates(): Result<List<MockExamTemplate>> = runCatchingCancellable {
        api.templates().data.orEmpty().map { t ->
            MockExamTemplate(
                key = t.slug ?: t.id.toString(),
                title = t.title.orEmpty(),
                level = t.level.orEmpty().uppercase(),
                durationMinutes = t.durationMinutes ?: 0,
                totalQuestions = t.totalQuestions ?: 0,
                scope = t.scope,
            )
        }
    }

    override fun observeActive(): Flow<ExamAttempt?> = dao.observeActive().map { it?.toDomain() }

    override fun observe(examId: String): Flow<ExamAttempt?> = dao.observe(examId).map { it?.toDomain() }

    override suspend fun start(key: String): Result<String> = runCatchingCancellable {
        val exam = api.start(key).data ?: error("Không tạo được đề")
        val now = timeSource.now()
        val questions = exam.questions.orEmpty().map { q ->
            ExamQuestion(
                id = q.id,
                sectionName = q.sectionName.orEmpty(),
                question = q.question.orEmpty(),
                options = q.options.orEmpty().mapNotNull { it.text },
                audioText = q.audioText,
            )
        }
        dao.upsert(
            ExamAttemptEntity(
                examId = exam.examId,
                title = exam.title.orEmpty(),
                level = exam.level.orEmpty().uppercase(),
                startedAt = now,
                endsAt = now + (exam.durationMinutes ?: 0) * 60_000L,
                questionsJson = gson.toJson(questions),
                answersJson = "{}",
                resultJson = null,
            ),
        )
        exam.examId
    }

    override suspend fun saveAnswer(examId: String, questionId: String, option: String) {
        answerLock.withLock {
            val attempt = dao.get(examId) ?: return
            if (attempt.resultJson != null) return // đã nộp: không sửa nữa
            val answers = parseAnswers(attempt.answersJson) + (questionId to option)
            dao.saveAnswers(examId, gson.toJson(answers))
        }
    }

    override suspend fun submit(examId: String): Result<ExamResult> = runCatchingCancellable {
        val attempt = dao.get(examId) ?: error("Không tìm thấy bài thi")
        attempt.resultJson?.let { return@runCatchingCancellable gson.fromJson(it, ExamResult::class.java) }

        val dto = api.submit(examId, AnswersRequest(parseAnswers(attempt.answersJson))).data
            ?: error("Không có kết quả")
        val result = dto.toDomain()
        dao.saveResult(examId, gson.toJson(result))
        result
    }

    private fun parseAnswers(json: String): Map<String, String> =
        gson.fromJson<Map<String, String>>(json, answersType) ?: emptyMap()

    private fun ExamAttemptEntity.toDomain() = ExamAttempt(
        examId = examId,
        title = title,
        level = level,
        endsAt = endsAt,
        questions = gson.fromJson<List<ExamQuestion>>(questionsJson, questionsType).orEmpty(),
        answers = parseAnswers(answersJson),
        result = resultJson?.let { gson.fromJson(it, ExamResult::class.java) },
    )

    private fun MockExamResultDto.toDomain() = ExamResult(
        correct = correctCount ?: 0,
        total = total ?: 0,
        percent = percent ?: 0,
        passed = passed ?: false,
        sections = sectionScores.orEmpty().map { SectionScore(it.sectionName.orEmpty(), it.correct ?: 0, it.total ?: 0) },
        wrong = review.orEmpty()
            .filter { it.userAnswer != it.correctAnswer }
            .map { ExamReviewItem(it.question.orEmpty(), it.correctAnswer.orEmpty(), it.userAnswer) },
    )
}

@Singleton
class ChatRepositoryImpl @Inject constructor(
    private val api: CommunityApi,
    private val stream: ChatStream,
) : ChatRepository {
    @Volatile private var meId: Long? = null

    override suspend fun currentUserId(): Result<Long> = runCatchingCancellable {
        meId ?: (api.me().data?.id ?: error("Chưa đăng nhập")).also { meId = it }
    }

    override suspend fun rooms(): Result<List<ChatRoom>> = runCatchingCancellable {
        api.rooms().data.orEmpty().map { r ->
            ChatRoom(r.id, r.name ?: "Hội thoại", r.lastMessage?.content, r.unreadCount ?: 0)
        }
    }

    override suspend fun history(roomId: Long): Result<List<ChatMessage>> = runCatchingCancellable {
        api.room(roomId).data?.messages.orEmpty().map { it.toDomain() }
    }

    override fun live(roomId: Long): Flow<ChatEvent> = stream.messages(roomId).map { e ->
        when (e) {
            StreamEvent.Open -> ChatEvent.Connected
            StreamEvent.Closed -> ChatEvent.Disconnected
            is StreamEvent.Message -> ChatEvent.Received(e.message.toDomain())
        }
    }

    override suspend fun send(roomId: Long, content: String): Result<ChatMessage> = runCatchingCancellable {
        val sent = api.send(roomId, SendMessageRequest(content)).data?.message ?: error("Gửi thất bại")
        sent.toDomain()
    }

    override suspend fun markRead(roomId: Long) {
        runCatchingCancellable { api.markRead(roomId) }
    }

    override suspend fun searchUsers(query: String): Result<List<ChatUser>> = runCatchingCancellable {
        val me = currentUserId().getOrNull()
        api.searchUsers(query).data.orEmpty().filter { it.id != me }.map { ChatUser(it.id, it.displayName()) }
    }

    override suspend fun openDirect(userId: Long): Result<Long> = runCatchingCancellable {
        api.direct(DirectChatRequest(userId)).data?.room?.id ?: error("Không mở được phòng")
    }

    private fun ChatMessageDto.toDomain() = ChatMessage(
        id = id,
        localId = null,
        roomId = roomId,
        senderId = senderId,
        senderName = sender?.displayName() ?: "Người dùng",
        content = content.orEmpty(),
        createdAt = createdAt.orEmpty(),
    )

    private fun ChatUserDto.displayName(): String =
        name?.takeIf { it.isNotBlank() } ?: email?.substringBefore('@') ?: "Người dùng"
}
