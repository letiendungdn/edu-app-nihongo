# Lộ trình Android — Kotlin + Jetpack

> **Lộ trình học**, không phải bảng status feature. Inventory app: [mobile-tech-stacks.md](./mobile-tech-stacks.md). Chạy: [run-mobile.md](./run-mobile.md).  
> **Lộ trình 9 tuần + bài tập theo repo:** 4 bài Android bắt đầu từ [learn-android-kotlin.md](./learn-android-kotlin.md). Câu hỏi phỏng vấn: [interview-android.md](./interview-android.md).

---

## GIAI ĐOẠN 1 — NỀN TẢNG (tháng 1–2)

### Kotlin cơ bản

```kotlin
// 1. Null safety — quan trọng nhất khi từ Java sang Kotlin
var name: String = "Nihongo"      // non-null, không thể = null
var name: String? = null           // nullable
val length = name?.length ?: 0    // safe call + elvis operator
val upper = name!!.uppercase()    // force unwrap — crash nếu null (tránh dùng)

// 2. Data class — tương đương Freezed trong Flutter
data class Vocabulary(
    val id: Int,
    val kana: String,
    val meaning: String,
    val lessonNumber: Int
)
// Tự generate: equals(), hashCode(), toString(), copy()
val updated = vocab.copy(meaning = "Xin chào")

// 3. Extension function — thêm method vào class có sẵn
fun String.isJapanese(): Boolean = any { it.code in 0x3040..0x30FF }
"おはよう".isJapanese() // true

// 4. Sealed class — tương đương sealed class/union type
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

when (result) {
    is Result.Success -> showData(result.data)
    is Result.Error   -> showError(result.message)
    Result.Loading    -> showLoading()
}

// 5. Coroutines + Flow
suspend fun fetchVocab(): List<Vocabulary>   // suspend = có thể pause, không block thread
fun watchVocab(): Flow<List<Vocabulary>>     // stream nhiều giá trị theo thời gian
```

**Tài liệu:**
- [Kotlin Official Docs](https://kotlinlang.org/docs/home.html)
- Kotlin Koans — bài tập interactive

---

### Android Studio + Project Structure

```
app/
  src/main/
    java/com.nihongo/
      data/
        local/         AppDatabase, DAOs (Room)
        remote/        VocabularyApi (Retrofit)
        repository/    VocabularyRepositoryImpl
      domain/
        model/         Vocabulary, SrsCard
        repository/    VocabularyRepository (interface)
        usecase/       GetReviewQueueUseCase
      presentation/
        vocab/         VocabViewModel, VocabScreen
        srs/           SrsViewModel, SrsScreen
      di/              Hilt modules
    res/
      layout/          XML layouts (hoặc Compose)
      values/          strings.xml, colors.xml
```

---

## GIAI ĐOẠN 2 — CORE ANDROID (tháng 3–4)

### Room Database

```kotlin
// 1. Entity — bảng trong SQLite
@Entity(tableName = "vocabulary")
data class VocabularyEntity(
    @PrimaryKey val id: Int,
    @ColumnInfo(name = "kana") val kana: String,
    @ColumnInfo(name = "meaning") val meaning: String,
    @ColumnInfo(name = "lesson_number") val lessonNumber: Int,
    @ColumnInfo(name = "sync_status") val syncStatus: String = "pending"
)

// 2. DAO — query interface
@Dao
interface VocabularyDao {
    // Flow — tự emit khi DB thay đổi (tương đương Drift Stream)
    @Query("SELECT * FROM vocabulary WHERE lesson_number = :lesson ORDER BY sort_order")
    fun watchByLesson(lesson: Int): Flow<List<VocabularyEntity>>

    @Query("SELECT * FROM vocabulary WHERE sync_status = 'pending'")
    suspend fun getPendingSync(): List<VocabularyEntity>

    @Upsert  // insert hoặc update nếu đã tồn tại
    suspend fun upsert(vocabs: List<VocabularyEntity>)

    @Query("UPDATE vocabulary SET sync_status = 'synced' WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Int>)
}

// 3. Database
@Database(entities = [VocabularyEntity::class, SrsCardEntity::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun vocabularyDao(): VocabularyDao
    abstract fun srsCardDao(): SrsCardDao
}
```

---

### ViewModel + StateFlow

```kotlin
// Tương đương Riverpod Provider + StreamProvider trong Flutter
@HiltViewModel
class VocabViewModel @Inject constructor(
    private val repository: VocabularyRepository
) : ViewModel() {

    private val _selectedLesson = MutableStateFlow(1)

    // StateFlow — tương đương StateProvider trong Flutter
    val selectedLesson: StateFlow<Int> = _selectedLesson.asStateFlow()

    // StateFlow từ repository Stream — tương đương StreamProvider
    val vocabs: StateFlow<List<Vocabulary>> = _selectedLesson
        .flatMapLatest { lesson -> repository.watchByLesson(lesson) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun selectLesson(lesson: Int) {
        _selectedLesson.value = lesson
    }

    fun syncLesson() {
        viewModelScope.launch {
            repository.syncLesson(_selectedLesson.value)
        }
    }
}
```

---

### Jetpack Compose

```kotlin
// Screen — tương đương ConsumerWidget trong Flutter
@Composable
fun VocabScreen(
    viewModel: VocabViewModel = hiltViewModel(),
    onNavigateToSrs: () -> Unit
) {
    val vocabs by viewModel.vocabs.collectAsStateWithLifecycle()
    val lesson by viewModel.selectedLesson.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Từ vựng — Bài $lesson") })
        }
    ) { padding ->
        // LazyColumn — tương đương ListView.builder Flutter
        LazyColumn(contentPadding = padding) {
            items(vocabs, key = { it.id }) { vocab ->
                VocabRow(
                    vocab = vocab,
                    onPlayTts = { viewModel.playTts(vocab.kana) }
                )
            }
        }
    }
}

@Composable
fun VocabRow(vocab: Vocabulary, onPlayTts: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth().padding(8.dp)) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(vocab.kana, style = MaterialTheme.typography.titleMedium)
                Text(vocab.meaning, style = MaterialTheme.typography.bodyMedium,
                     color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            IconButton(onClick = onPlayTts) {
                Icon(Icons.Default.VolumeUp, contentDescription = "Phát âm")
            }
        }
    }
}
```

---

### Dependency Injection — Hilt

```kotlin
// Module — tương đương Riverpod Provider trong Flutter
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides @Singleton
    fun provideDatabase(@ApplicationContext ctx: Context): AppDatabase =
        Room.databaseBuilder(ctx, AppDatabase::class.java, "nihongo.db").build()

    @Provides @Singleton
    fun provideVocabDao(db: AppDatabase) = db.vocabularyDao()
}

@Module
@InstallIn(SingletonComponent::class)
object RepositoryModule {
    @Provides @Singleton
    fun provideVocabRepository(
        dao: VocabularyDao,
        api: VocabularyApi,
        networkMonitor: NetworkMonitor
    ): VocabularyRepository = VocabularyRepositoryImpl(dao, api, networkMonitor)
}
```

---

## GIAI ĐOẠN 3 — FEATURES (tháng 5–6)

### Navigation — Jetpack Navigation Compose

```kotlin
// NavGraph — tương đương GoRouter trong Flutter
@Composable
fun NihongoNavGraph() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "home") {
        composable("home") { HomeScreen(navController) }
        composable("vocab") { VocabScreen(navController) }
        composable("srs")   { SrsScreen(navController) }
        composable(
            route = "pronunciation/{kana}",
            arguments = listOf(navArgument("kana") { type = NavType.StringType })
        ) { backStack ->
            val kana = backStack.arguments?.getString("kana") ?: ""
            PronunciationScreen(kana = kana)
        }
        composable("live") { LiveScreen(navController) }
    }
}

// Navigate — tương đương context.push() trong Flutter
navController.navigate("pronunciation/おはよう")
navController.navigate("vocab") { popUpTo("home") }
```

---

### WorkManager — Background Sync

```kotlin
// SyncWorker — tương đương SyncService + WorkManager trong Flutter
@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted ctx: Context,
    @Assisted params: WorkerParameters,
    private val vocabRepository: VocabularyRepository
) : CoroutineWorker(ctx, params) {

    override suspend fun doWork(): Result {
        return try {
            vocabRepository.syncAllPending()
            Result.success()
        } catch (e: Exception) {
            if (runAttemptCount < 3) Result.retry()  // retry tối đa 3 lần
            else Result.failure()
        }
    }

    companion object {
        fun schedule(context: Context) {
            val request = PeriodicWorkRequestBuilder<SyncWorker>(1, TimeUnit.HOURS)
                .setConstraints(
                    Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build()
                )
                .build()

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork("vocab-sync", KEEP, request)
        }
    }
}
```

---

### Network — Retrofit + OkHttp

```kotlin
// API interface — tương đương Dio service trong Flutter
interface VocabularyApi {
    @GET("api/vocabularies")
    suspend fun getVocabByLesson(@Query("lessonNumber") lesson: Int): List<VocabularyDto>

    @POST("api/vocabulary/bulk-upsert")
    suspend fun syncReviewBank(@Body items: List<ReviewSyncDto>): Response<Unit>
}

// OkHttp interceptor — tương đương Dio interceptor
class AuthInterceptor(private val tokenStore: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.getAccessToken()
        val request = if (token != null) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .build()
        } else chain.request()
        return chain.proceed(request)
    }
}

// Retrofit setup
val retrofit = Retrofit.Builder()
    .baseUrl(BuildConfig.API_BASE_URL)
    .addConverterFactory(GsonConverterFactory.create())
    .client(OkHttpClient.Builder().addInterceptor(AuthInterceptor(tokenStore)).build())
    .build()
```

---

### Camera + ML Kit (OCR)

```kotlin
// Tương đương CameraTranslateScreen trong Flutter
class CameraTranslateActivity : AppCompatActivity() {
    private val imageAnalyzer = ImageAnalysis.Builder()
        .setTargetResolution(Size(1280, 720))
        .setBackpressureStrategy(STRATEGY_KEEP_ONLY_LATEST)
        .build()

    private fun setupTextRecognition() {
        val recognizer = TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())

        imageAnalyzer.setAnalyzer(executor) { imageProxy ->
            val image = InputImage.fromMediaImage(imageProxy.image!!, imageProxy.imageInfo.rotationDegrees)
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val detected = visionText.textBlocks
                        .flatMap { it.lines }
                        .joinToString("\n") { it.text }
                    if (detected.isNotEmpty()) translateText(detected)
                }
                .addOnCompleteListener { imageProxy.close() }
        }
    }
}
```

---

## GIAI ĐOẠN 4 — SENIOR FEATURES (tháng 7–8)

### Custom View — Kanji Draw (tương đương Flutter CustomPainter)

```kotlin
class KanjiDrawView @JvmOverloads constructor(
    context: Context, attrs: AttributeSet? = null
) : View(context, attrs) {

    private val strokes = mutableListOf<List<PointF>>()
    private var currentStroke = mutableListOf<PointF>()

    private val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.BLACK
        strokeWidth = 8f
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> currentStroke = mutableListOf(PointF(event.x, event.y))
            MotionEvent.ACTION_MOVE -> { currentStroke.add(PointF(event.x, event.y)); invalidate() }
            MotionEvent.ACTION_UP   -> { if (currentStroke.size > 2) strokes.add(currentStroke.toList()); currentStroke = mutableListOf() }
        }
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        // Draw grid — tương đương _GridPainter trong Flutter
        drawGrid(canvas)
        // Draw strokes — tương đương _StrokePainter
        for (stroke in strokes + listOf(currentStroke)) {
            if (stroke.size < 2) continue
            val path = Path().apply {
                moveTo(stroke[0].x, stroke[0].y)
                stroke.drop(1).forEach { lineTo(it.x, it.y) }
            }
            canvas.drawPath(path, strokePaint)
        }
    }
}
```

---

### TFLite — On-device ML

```kotlin
// build.gradle
implementation("org.tensorflow:tensorflow-lite:2.14.0")
implementation("org.tensorflow:tensorflow-lite-support:0.4.4")

class KanjiClassifier(context: Context) {
    private val interpreter = Interpreter(
        FileUtil.loadMappedFile(context, "kanji_model.tflite")
    )

    fun classify(bitmap: Bitmap): String {
        val input = TensorImage(DataType.FLOAT32)
        input.load(bitmap)
        val processor = ImageProcessor.Builder()
            .add(ResizeOp(64, 64, ResizeOp.ResizeMethod.BILINEAR))
            .add(NormalizeOp(0f, 255f))
            .build()
        val processedInput = processor.process(input)

        val output = Array(1) { FloatArray(2000) }  // 2000 kanji classes
        interpreter.run(processedInput.buffer, output)

        val topIndex = output[0].indices.maxByOrNull { output[0][it] } ?: 0
        return KANJI_LABELS[topIndex]
    }
}
```

---

### Testing

```kotlin
// Unit test ViewModel
@OptIn(ExperimentalCoroutinesApi::class)
class VocabViewModelTest {
    @get:Rule val coroutineRule = MainCoroutineRule()

    private val mockRepo = mockk<VocabularyRepository>()
    private lateinit var viewModel: VocabViewModel

    @Before fun setup() {
        every { mockRepo.watchByLesson(any()) } returns flowOf(listOf(fakeVocab))
        viewModel = VocabViewModel(mockRepo)
    }

    @Test fun `selectLesson updates vocabs`() = runTest {
        viewModel.selectLesson(2)
        val vocabs = viewModel.vocabs.first()
        assertEquals(1, vocabs.size)
        verify { mockRepo.watchByLesson(2) }
    }
}

// UI test với Compose
@get:Rule val composeTestRule = createComposeRule()

@Test fun `vocab list shows items`() {
    composeTestRule.setContent {
        VocabRow(vocab = fakeVocab, onPlayTts = {})
    }
    composeTestRule.onNodeWithText("おはよう").assertIsDisplayed()
    composeTestRule.onNodeWithContentDescription("Phát âm").assertIsDisplayed()
}
```

---

## CHECKLIST THEO GIAI ĐOẠN

```
Giai đoạn 1 — Nền tảng:
  □ Kotlin: null safety, data class, sealed class, extension, coroutine
  □ Android Studio quen tay: debug, logcat, layout inspector
  □ Build và chạy được app trên emulator + device thật

Giai đoạn 2 — Core:
  □ Room: Entity, DAO, Database, Flow query
  □ ViewModel + StateFlow (không dùng LiveData nữa)
  □ Jetpack Compose: Scaffold, LazyColumn, state hoisting
  □ Hilt: @Module, @Provides, @HiltViewModel

Giai đoạn 3 — Features:
  □ Navigation Compose với arguments
  □ WorkManager background sync
  □ Retrofit + OkHttp interceptor
  □ CameraX + ML Kit OCR

Giai đoạn 4 — Senior:
  □ Custom View (Canvas API)
  □ TFLite on-device inference
  □ Unit test ViewModel (MockK)
  □ Compose UI test
  □ Performance: Baseline Profile, R8 optimization
  □ CI/CD: GitHub Actions + EAS hoặc Fastlane
```

---

## RESOURCES

- **Sách**: Android Programming: The Big Nerd Ranch Guide
- **Course**: Android Basics in Kotlin (Google Codelabs — free)
- **Compose**: Jetpack Compose Pathway (developer.android.com)
- **Coroutines**: Kotlin Coroutines Deep Dive (book)
- **Architecture**: Now in Android (Google sample app — production quality)
- **YouTube**: Philipp Lackner (best Android channel tiếng Anh)

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **11. Lộ trình theo framework mobile**. Cùng nhóm:

- [roadmap-swift.md](./roadmap-swift.md) — Swift / iOS
- [roadmap-flutter.md](./roadmap-flutter.md) — Flutter
- [roadmap-react-native.md](./roadmap-react-native.md) — React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
