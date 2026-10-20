package com.edu.nihongo.di

import android.content.Context
import com.edu.nihongo.BuildConfig
import com.edu.nihongo.data.NetworkMonitor
import com.edu.nihongo.data.NetworkStatus
import com.edu.nihongo.data.local.AppDatabase
import com.edu.nihongo.data.local.TokenStorage
import com.edu.nihongo.data.local.TokenStore
import com.edu.nihongo.data.local.KeystoreTokenCipher
import com.edu.nihongo.data.local.TokenCipher
import com.edu.nihongo.data.live.LiveCallKeeper
import com.edu.nihongo.data.live.ServiceLiveCallKeeper
import com.edu.nihongo.data.local.dao.ExamAttemptDao
import com.edu.nihongo.data.local.dao.GrammarDao
import com.edu.nihongo.data.local.dao.KanjiDao
import com.edu.nihongo.data.local.dao.LessonDao
import com.edu.nihongo.data.local.dao.ProgressDao
import com.edu.nihongo.data.local.dao.ReadingDao
import com.edu.nihongo.data.local.dao.SrsCardDao
import com.edu.nihongo.data.local.dao.SyncQueueDao
import com.edu.nihongo.data.local.dao.VocabularyDao
import com.edu.nihongo.data.remote.AiTutorApi
import com.edu.nihongo.data.remote.SentenceFeedbackApi
import com.edu.nihongo.data.remote.AuthApi
import com.edu.nihongo.data.remote.AuthInterceptor
import com.edu.nihongo.data.remote.ChatStream
import com.edu.nihongo.data.remote.CommunityApi
import com.edu.nihongo.data.remote.ContentApi
import com.edu.nihongo.data.remote.LearningProgressApi
import com.edu.nihongo.data.remote.MockExamApi
import com.edu.nihongo.data.remote.LessonsApi
import com.edu.nihongo.data.remote.LiveApi
import com.edu.nihongo.data.remote.PushApi
import com.edu.nihongo.data.remote.PushRegistrar
import com.edu.nihongo.data.remote.PushService
import com.edu.nihongo.data.remote.RefreshCookieJar
import com.edu.nihongo.data.remote.TokenAuthenticator
import com.edu.nihongo.data.remote.TranslateApi
import com.edu.nihongo.data.remote.VocabularyApi
import com.edu.nihongo.data.repository.AuthRepositoryImpl
import com.edu.nihongo.data.repository.ChatRepositoryImpl
import com.edu.nihongo.data.repository.ContentRepositoryImpl
import com.edu.nihongo.data.repository.ExamRepositoryImpl
import com.edu.nihongo.data.repository.ProgressRepositoryImpl
import com.edu.nihongo.data.repository.LessonRepositoryImpl
import com.edu.nihongo.data.repository.TranslateRepositoryImpl
import com.edu.nihongo.data.repository.VocabularyRepositoryImpl
import com.edu.nihongo.data.sync.SyncScheduler
import com.edu.nihongo.data.sync.WidgetRefresher
import com.edu.nihongo.data.sync.WorkManagerSyncScheduler
import com.edu.nihongo.presentation.widget.GlanceWidgetRefresher
import com.edu.nihongo.domain.TimeSource
import com.edu.nihongo.domain.repository.AuthRepository
import com.edu.nihongo.domain.repository.ChatRepository
import com.edu.nihongo.domain.repository.ContentRepository
import com.edu.nihongo.domain.repository.ExamRepository
import com.edu.nihongo.domain.repository.ProgressRepository
import com.edu.nihongo.domain.repository.LessonRepository
import com.edu.nihongo.domain.repository.TranslateRepository
import com.edu.nihongo.domain.repository.VocabularyRepository
import com.google.gson.Gson
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideGson(): Gson = Gson()

    @Provides
    fun provideTimeSource(): TimeSource = TimeSource { System.currentTimeMillis() }

    /**
     * Không dùng fallbackToDestructiveMigration: nó xóa sạch DB khi thiếu migration, kéo theo
     * thẻ SRS chưa sync và sync_queue. Thiếu migration thì app crash ngay lúc dev, dễ thấy hơn
     * nhiều so với mất dữ liệu người dùng. Migration khai báo trong AppDatabase.
     */
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase =
        androidx.room.Room.databaseBuilder(context, AppDatabase::class.java, AppDatabase.DB_NAME)
            .build()

    @Provides fun provideVocabDao(db: AppDatabase): VocabularyDao = db.vocabDao()
    @Provides fun provideSrsDao(db: AppDatabase): SrsCardDao = db.srsDao()
    @Provides fun provideSyncQueueDao(db: AppDatabase): SyncQueueDao = db.syncQueueDao()
    @Provides fun provideLessonDao(db: AppDatabase): LessonDao = db.lessonDao()
    @Provides fun provideProgressDao(db: AppDatabase): ProgressDao = db.progressDao()
    @Provides fun provideGrammarDao(db: AppDatabase): GrammarDao = db.grammarDao()
    @Provides fun provideKanjiDao(db: AppDatabase): KanjiDao = db.kanjiDao()
    @Provides fun provideReadingDao(db: AppDatabase): ReadingDao = db.readingDao()
    @Provides fun provideExamAttemptDao(db: AppDatabase): ExamAttemptDao = db.examAttemptDao()

    @Provides
    @Singleton
    fun provideOkHttp(tokenStore: TokenStorage): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
            // Log debug vẫn không được lộ token
            redactHeader("Authorization")
            redactHeader("Cookie")
            redactHeader("Set-Cookie")
        }

        val cookieJar = RefreshCookieJar(tokenStore, allowSecureOverHttp = BuildConfig.DEBUG)
        // Client riêng cho lệnh refresh: không Authenticator, để refresh lỗi không gọi lại chính nó
        val refreshClient = OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()

        return OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .addInterceptor(AuthInterceptor(tokenStore))
            .addInterceptor(logging)
            .authenticator(
                TokenAuthenticator(tokenStore, refreshClient, BuildConfig.API_BASE_URL.toHttpUrl()),
            )
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient, gson: Gson): Retrofit =
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()

    @Provides fun provideVocabApi(retrofit: Retrofit): VocabularyApi =
        retrofit.create(VocabularyApi::class.java)

    @Provides fun provideLessonsApi(retrofit: Retrofit): LessonsApi =
        retrofit.create(LessonsApi::class.java)

    @Provides fun provideAuthApi(retrofit: Retrofit): AuthApi =
        retrofit.create(AuthApi::class.java)

    @Provides fun provideTranslateApi(retrofit: Retrofit): TranslateApi =
        retrofit.create(TranslateApi::class.java)

    @Provides fun provideLiveApi(retrofit: Retrofit): LiveApi =
        retrofit.create(LiveApi::class.java)

    @Provides fun provideAiTutorApi(retrofit: Retrofit): AiTutorApi =
        retrofit.create(AiTutorApi::class.java)

    @Provides fun provideSentenceFeedbackApi(retrofit: Retrofit): SentenceFeedbackApi =
        retrofit.create(SentenceFeedbackApi::class.java)

    @Provides fun providePushApi(retrofit: Retrofit): PushApi =
        retrofit.create(PushApi::class.java)

    @Provides fun provideProgressApi(retrofit: Retrofit): LearningProgressApi =
        retrofit.create(LearningProgressApi::class.java)

    @Provides fun provideContentApi(retrofit: Retrofit): ContentApi =
        retrofit.create(ContentApi::class.java)

    @Provides fun provideMockExamApi(retrofit: Retrofit): MockExamApi =
        retrofit.create(MockExamApi::class.java)

    @Provides fun provideCommunityApi(retrofit: Retrofit): CommunityApi =
        retrofit.create(CommunityApi::class.java)

    @Provides
    @Singleton
    fun provideChatStream(client: OkHttpClient, gson: Gson): ChatStream =
        ChatStream(
            client = sseClient(client),
            apiBaseUrl = BuildConfig.API_BASE_URL.toHttpUrl(),
            gson = gson,
        )

    /**
     * Client cho SSE: dùng chung token, refresh, cookie với client chính, khác hai chỗ:
     * - readTimeout = 0: phòng im lặng cả giờ là bình thường, không phải lỗi.
     * - bỏ HttpLoggingInterceptor: ở mức BODY nó đọc HẾT body để in log. Body SSE không bao giờ
     *   kết thúc, nên interceptor nuốt cả stream và không tin nào tới được app. Lỗi này chỉ thấy
     *   khi chạy app thật (test dùng client không có logging).
     */
    fun sseClient(base: OkHttpClient): OkHttpClient =
        base.newBuilder()
            .apply { interceptors().removeAll { it is HttpLoggingInterceptor } }
            .readTimeout(0, TimeUnit.SECONDS)
            .build()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindVocabRepo(impl: VocabularyRepositoryImpl): VocabularyRepository

    @Binds
    abstract fun bindLessonRepo(impl: LessonRepositoryImpl): LessonRepository

    @Binds
    abstract fun bindProgressRepo(impl: ProgressRepositoryImpl): ProgressRepository

    @Binds
    abstract fun bindContentRepo(impl: ContentRepositoryImpl): ContentRepository

    @Binds
    abstract fun bindExamRepo(impl: ExamRepositoryImpl): ExamRepository

    @Binds
    abstract fun bindChatRepo(impl: ChatRepositoryImpl): ChatRepository

    @Binds
    abstract fun bindAuthRepo(impl: AuthRepositoryImpl): AuthRepository

    @Binds
    abstract fun bindTranslateRepo(impl: TranslateRepositoryImpl): TranslateRepository

    @Binds
    abstract fun bindTokenStorage(impl: TokenStore): TokenStorage

    @Binds
    @Singleton
    abstract fun bindTokenCipher(impl: KeystoreTokenCipher): TokenCipher

    @Binds
    abstract fun bindLiveCallKeeper(impl: ServiceLiveCallKeeper): LiveCallKeeper

    @Binds
    abstract fun bindNetworkStatus(impl: NetworkMonitor): NetworkStatus

    @Binds
    abstract fun bindSyncScheduler(impl: WorkManagerSyncScheduler): SyncScheduler

    @Binds
    abstract fun bindPushRegistrar(impl: PushService): PushRegistrar

    @Binds
    abstract fun bindWidgetRefresher(impl: GlanceWidgetRefresher): WidgetRefresher
}
