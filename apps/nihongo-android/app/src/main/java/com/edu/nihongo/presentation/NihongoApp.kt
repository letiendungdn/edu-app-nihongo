package com.edu.nihongo.presentation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.edu.nihongo.data.notifications.SRS_DEEP_LINK
import com.edu.nihongo.presentation.community.ChatScreen
import com.edu.nihongo.presentation.community.RoomsScreen
import com.edu.nihongo.presentation.exam.ExamListScreen
import com.edu.nihongo.presentation.exam.ExamScreen
import com.edu.nihongo.presentation.kana.KanaScreen
import com.edu.nihongo.presentation.lessons.LessonDetailScreen
import com.edu.nihongo.presentation.progress.ProgressScreen
import com.edu.nihongo.presentation.reading.ReadingDetailScreen
import com.edu.nihongo.presentation.reading.ReadingListScreen
import com.edu.nihongo.presentation.ai_tutor.AiTutorScreen
import com.edu.nihongo.presentation.camera.CameraTranslateScreen
import com.edu.nihongo.presentation.home.HomeScreen
import com.edu.nihongo.presentation.kanji.KanjiDrawScreen
import com.edu.nihongo.presentation.lessons.LessonListScreen
import com.edu.nihongo.presentation.live.LiveHostScreen
import com.edu.nihongo.presentation.live.LiveListScreen
import com.edu.nihongo.presentation.live.LiveViewerScreen
import com.edu.nihongo.presentation.login.LoginScreen
import com.edu.nihongo.presentation.premium.PremiumScreen
import com.edu.nihongo.presentation.pronunciation.PronunciationScreen
import com.edu.nihongo.presentation.sentence_practice.SentencePracticeScreen
import com.edu.nihongo.presentation.srs.SrsScreen

object Routes {
    const val HOME = "home"
    const val LESSONS = "lessons"
    const val VOCAB = "vocab/{lesson}"
    const val SRS = "srs"
    const val LOGIN = "login"
    const val CAMERA = "camera-translate"
    const val LIVE = "live"
    const val LIVE_VIEWER = "live/viewer"
    const val LIVE_HOST = "live/host"
    const val SENTENCE_PRACTICE = "sentence-practice"
    const val AI_TUTOR = "ai-tutor"
    const val PRONUNCIATION = "pronunciation/{kana}/{meaning}"
    const val KANJI_DRAW = "kanji-draw/{kanji}/{kana}"
    const val PROGRESS = "progress"
    const val COMMUNITY = "community"
    const val CHAT = "community/{roomId}"
    const val READING = "reading"
    const val READING_DETAIL = "reading/{id}"
    const val EXAMS = "exams"
    const val EXAM = "exams/{examId}"
    const val KANA = "kana"
    const val PREMIUM = "premium"

    fun chat(roomId: Long) = "community/$roomId"
    fun reading(id: Long) = "reading/$id"
    fun exam(examId: String) = "exams/$examId"

    fun vocab(lesson: Int) = "vocab/$lesson"
    fun pronunciation(kana: String, meaning: String) =
        "pronunciation/${java.net.URLEncoder.encode(kana, "UTF-8")}/${java.net.URLEncoder.encode(meaning, "UTF-8")}"
    fun kanjiDraw(kanji: String, kana: String) =
        "kanji-draw/${java.net.URLEncoder.encode(kanji, "UTF-8")}/${java.net.URLEncoder.encode(kana, "UTF-8")}"
}

@Composable
fun NihongoApp() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Routes.HOME) {
        composable(Routes.HOME) {
            HomeScreen(
                onVocab = { navController.navigate(Routes.LESSONS) },
                onSrs = { navController.navigate(Routes.SRS) },
                onLogin = { navController.navigate(Routes.LOGIN) },
                onCamera = { navController.navigate(Routes.CAMERA) },
                onLive = { navController.navigate(Routes.LIVE) },
                onSentencePractice = { navController.navigate(Routes.SENTENCE_PRACTICE) },
                onAiTutor = { navController.navigate(Routes.AI_TUTOR) },
                onPronunciation = {
                    navController.navigate(Routes.pronunciation("おはようございます", "Chào buổi sáng"))
                },
                onKanjiDraw = {
                    navController.navigate(Routes.kanjiDraw("行", "いく"))
                },
                onProgress = { navController.navigate(Routes.PROGRESS) },
                onCommunity = { navController.navigate(Routes.COMMUNITY) },
                onReading = { navController.navigate(Routes.READING) },
                onExams = { navController.navigate(Routes.EXAMS) },
                onKana = { navController.navigate(Routes.KANA) },
                onPremium = { navController.navigate(Routes.PREMIUM) },
            )
        }
        composable(Routes.LESSONS) {
            LessonListScreen(
                onBack = { navController.popBackStack() },
                onOpenLesson = { lesson -> navController.navigate(Routes.vocab(lesson)) },
            )
        }
        composable(
            route = Routes.VOCAB,
            arguments = listOf(navArgument("lesson") { type = NavType.IntType }),
        ) { entry ->
            val lesson = entry.arguments?.getInt("lesson") ?: 1
            LessonDetailScreen(
                lessonNumber = lesson,
                onBack = { navController.popBackStack() },
            )
        }
        // Thông báo nhắc ôn và widget mở nihongo://srs → vào thẳng màn này
        composable(Routes.SRS, deepLinks = listOf(navDeepLink { uriPattern = SRS_DEEP_LINK })) {
            SrsScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.PROGRESS) {
            ProgressScreen(
                onBack = { navController.popBackStack() },
                onLogin = { navController.navigate(Routes.LOGIN) },
            )
        }
        composable(Routes.COMMUNITY) {
            RoomsScreen(
                onBack = { navController.popBackStack() },
                onOpenRoom = { navController.navigate(Routes.chat(it)) },
                onLogin = { navController.navigate(Routes.LOGIN) },
            )
        }
        composable(Routes.CHAT, arguments = listOf(navArgument("roomId") { type = NavType.LongType })) {
            ChatScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.READING) {
            ReadingListScreen(
                onBack = { navController.popBackStack() },
                onOpen = { navController.navigate(Routes.reading(it)) },
            )
        }
        composable(Routes.READING_DETAIL, arguments = listOf(navArgument("id") { type = NavType.LongType })) {
            ReadingDetailScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.EXAMS) {
            ExamListScreen(
                onBack = { navController.popBackStack() },
                onOpenExam = { navController.navigate(Routes.exam(it)) },
            )
        }
        composable(Routes.EXAM, arguments = listOf(navArgument("examId") { type = NavType.StringType })) {
            ExamScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.PREMIUM) {
            PremiumScreen(
                onBack = { navController.popBackStack() },
                onLogin = { navController.navigate(Routes.LOGIN) },
            )
        }
        composable(Routes.KANA) {
            KanaScreen(
                onBack = { navController.popBackStack() },
                onPracticeWriting = { kana, romaji -> navController.navigate(Routes.kanjiDraw(kana, romaji)) },
            )
        }
        composable(Routes.LOGIN) {
            LoginScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.CAMERA) {
            CameraTranslateScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.LIVE) {
            LiveListScreen(
                onBack = { navController.popBackStack() },
                onNavigateViewer = { navController.navigate(Routes.LIVE_VIEWER) },
                onNavigateHost = { navController.navigate(Routes.LIVE_HOST) },
            )
        }
        composable(Routes.LIVE_VIEWER) {
            LiveViewerScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.LIVE_HOST) {
            LiveHostScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.SENTENCE_PRACTICE) {
            SentencePracticeScreen(onBack = { navController.popBackStack() })
        }
        composable(Routes.AI_TUTOR) {
            AiTutorScreen(onBack = { navController.popBackStack() })
        }
        composable(
            route = Routes.PRONUNCIATION,
            arguments = listOf(
                navArgument("kana") { type = NavType.StringType },
                navArgument("meaning") { type = NavType.StringType },
            ),
        ) { entry ->
            val kana = java.net.URLDecoder.decode(entry.arguments?.getString("kana") ?: "", "UTF-8")
            val meaning = java.net.URLDecoder.decode(entry.arguments?.getString("meaning") ?: "", "UTF-8")
            PronunciationScreen(
                kana = kana,
                meaning = meaning,
                onBack = { navController.popBackStack() },
            )
        }
        composable(
            route = Routes.KANJI_DRAW,
            arguments = listOf(
                navArgument("kanji") { type = NavType.StringType },
                navArgument("kana") { type = NavType.StringType },
            ),
        ) { entry ->
            val kanji = java.net.URLDecoder.decode(entry.arguments?.getString("kanji") ?: "", "UTF-8")
            val kana = java.net.URLDecoder.decode(entry.arguments?.getString("kana") ?: "", "UTF-8")
            KanjiDrawScreen(
                kanji = kanji,
                kana = kana,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
