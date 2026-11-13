# Làm một màn hình Android (Kotlin, Compose) từ đầu đến cuối: Retrofit, Hilt, ViewModel, test

> **Mục tiêu:** Học xong bài này bạn tự làm được một màn hình có dữ liệu thật trong app Android — cho app này hay bất kỳ app Kotlin + Compose nào:
> - Thêm interface Retrofit, repository (interface ở `domain`, cài đặt ở `data`), nối bằng Hilt.
> - Đọc đúng câu lỗi của server; không nuốt việc hủy coroutine.
> - Viết ViewModel một `StateFlow`, nội dung bằng `sealed interface`; hủy lần tải cũ khi đổi bộ lọc.
> - Làm màn Compose: chưa đăng nhập, form có kiểm dữ liệu, kéo xuống tải lại, xóa có hộp xác nhận + trả lại khi lỗi, snackbar.
> - Test ViewModel bằng repository giả và test lớp mạng bằng MockWebServer; kiểm trên máy ảo.
>
> **Cần biết trước:** [learn-android-kotlin.md](./learn-android-kotlin.md) mục 4–23 (Kotlin, coroutine, Flow, Compose), [learn-android-architecture.md](./learn-android-architecture.md) mục 26–31 (các lớp, ViewModel, Retrofit, Hilt). API của tính năng: [learn-nestjs-build-api.md](./learn-nestjs-build-api.md).
>
> **Thời gian:** khoảng 10–12 giờ, chia 5 buổi.

Tính năng làm mẫu: màn **"Sổ từ của tôi"** trong [apps/nihongo-android](../apps/nihongo-android) — cùng API `/api/personal-words` với web và app Expo.

| Lớp | File |
|---|---|
| Retrofit + DTO | [data/remote/PersonalWordsApi.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/data/remote/PersonalWordsApi.kt) |
| Interface repository + entity | [domain/repository/PersonalWordsRepository.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/domain/repository/PersonalWordsRepository.kt) |
| Cài đặt repository | [data/repository/PersonalWordsRepositoryImpl.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/data/repository/PersonalWordsRepositoryImpl.kt) |
| Hilt | `providePersonalWordsApi`, `bindPersonalWordsRepo` trong [di/AppModule.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/di/AppModule.kt) |
| ViewModel, màn hình | [presentation/mywords](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/mywords) |
| Route, thẻ Home | `Routes.MY_WORDS` trong [NihongoApp.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/NihongoApp.kt), `NavCard` trong [HomeScreen.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/home/HomeScreen.kt) |
| Test | [PersonalWordsViewModelTest.kt](../apps/nihongo-android/app/src/test/java/com/edu/nihongo/presentation/mywords/PersonalWordsViewModelTest.kt), [PersonalWordsRepositoryImplTest.kt](../apps/nihongo-android/app/src/test/java/com/edu/nihongo/data/repository/PersonalWordsRepositoryImplTest.kt) |

Đã chạy thật 13/11/2026: 9 test mới qua, toàn bộ 120 test unit của app xanh; chạy trên máy ảo `pixel_api_35` với gateway thật hết các luồng ở mục 8.

## Từ khóa trong bài

| Từ | Nghĩa ngắn gọn |
|---|---|
| Retrofit | Biến interface Kotlin thành lời gọi HTTP. |
| Repository | Che giấu dữ liệu đến từ đâu; ViewModel chỉ gọi repository. |
| Hilt | Thư viện DI: tự tạo và đưa đối tượng vào constructor (`@Inject`, `@Provides`, `@Binds`). |
| ViewModel | Giữ trạng thái màn hình qua lần xoay màn hình, chạy việc nền trong `viewModelScope`. |
| `StateFlow` | Dòng giá trị luôn có giá trị hiện tại; Compose nghe nó và vẽ lại. |
| `sealed interface` | Tập kiểu đóng: `when` phải xử lý đủ, thiếu là lỗi biên dịch. |
| `Result<T>` | Kiểu Kotlin chứa thành công hoặc lỗi; repository của app trả kiểu này thay vì ném lỗi. |
| MockWebServer | Server HTTP chạy trong test, trả response soạn sẵn, ghi lại request. |

## 1. Lớp mạng: Retrofit và DTO

[PersonalWordsApi.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/data/remote/PersonalWordsApi.kt):

```kotlin
data class PersonalWordDto(val id: Long, val kana: String, val meaning: String, val lesson: Int)
data class PersonalWordPageDto(val data: List<PersonalWordDto> = emptyList(), val total: Int = 0)
data class NewPersonalWordDto(val kana: String, val meaning: String, val lesson: Int)

interface PersonalWordsApi {
    @GET("personal-words")
    suspend fun list(@Query("lesson") lesson: Int?, @Query("limit") limit: Int = 200): ApiEnvelope<PersonalWordPageDto>

    @POST("personal-words")
    suspend fun create(@Body body: NewPersonalWordDto): ApiEnvelope<PersonalWordDto>

    @DELETE("personal-words/{id}")
    suspend fun delete(@Path("id") id: Long): ApiEnvelope<Map<String, Any>>
}
```

- `ApiEnvelope<T>` có sẵn trong [Api.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/data/remote/Api.kt): gateway bọc mọi response trong `{ success, data }`.
- `@Query("lesson") lesson: Int?` — truyền `null` thì Retrofit **không gửi** tham số. Test MockWebServer xác nhận request là `/api/personal-words?lesson=2&limit=200`.
- Đường dẫn **không** bắt đầu bằng `/`: ghép với `baseUrl` `…/api/` thành `/api/personal-words`.
- App dùng Gson (Retrofit + `GsonConverterFactory` đã cấu hình trong `AppModule`); DTO là data class thường, không cần annotation khi tên trường khớp JSON.

## 2. Repository: interface ở `domain`, cài đặt ở `data`

[PersonalWordsRepository.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/domain/repository/PersonalWordsRepository.kt):

```kotlin
data class PersonalWord(val id: Long, val kana: String, val meaning: String, val lesson: Int)

interface PersonalWordsRepository {
    suspend fun list(lesson: Int?): Result<List<PersonalWord>>
    suspend fun add(kana: String, meaning: String, lesson: Int): Result<PersonalWord>
    suspend fun delete(id: Long): Result<Unit>
}
```

ViewModel phụ thuộc **interface** — test thay bằng bản giả, không cần mạng. Entity `PersonalWord` không phụ thuộc Retrofit hay Gson; DTO đổi (server thêm trường) không lan vào giao diện.

[PersonalWordsRepositoryImpl.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/data/repository/PersonalWordsRepositoryImpl.kt):

```kotlin
class ServerMessageException(message: String) : Exception(message)

class PersonalWordsRepositoryImpl @Inject constructor(
    private val api: PersonalWordsApi,
) : PersonalWordsRepository {

    override suspend fun list(lesson: Int?) = call { api.list(lesson).data?.data.orEmpty().map { it.toDomain() } }

    private suspend fun <T> call(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: CancellationException) {
        throw e // không biến việc hủy coroutine thành "lỗi"
    } catch (e: HttpException) {
        Result.failure(serverMessage(e) ?: e)
    } catch (e: Exception) {
        Result.failure(e)
    }

    private fun serverMessage(e: HttpException): ServerMessageException? {
        if (e.code() != 400 && e.code() != 409) return null // 401/5xx: để userMessage() chung xử lý
        val body = e.response()?.errorBody()?.string() ?: return null
        return runCatching {
            JsonParser.parseString(body).asJsonObject.getAsJsonObject("error").get("message").asString
        }.getOrNull()?.let(::ServerMessageException)
    }
}
```

Hai quyết định đáng nhớ:

1. **Đọc câu lỗi của server cho 400/409.** Hàm dùng chung [`Throwable.userMessage()`](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/utils/UserMessage.kt) chỉ đổi theo mã HTTP — 409 thành "Có lỗi xảy ra (mã 409)", người dùng không biết là trùng. Repository bóc `error.message` từ phong bì lỗi (`"Từ này đã có trong sổ"`) và gói trong `ServerMessageException`; `userMessage()` rơi vào nhánh `else -> message` nên trả nguyên câu đó, không phải sửa hàm chung. Với 5xx thì **không** đọc body — câu lỗi nội bộ của server không được hiện ra màn hình (test `loi500_khongDocBody…` kiểm điều này).
2. **Ném lại `CancellationException`.** Coroutine bị hủy bằng cách ném ngoại lệ này; `catch (e: Exception)` sẽ bắt nó và biến việc hủy thành "lỗi" hiện trên màn hình ([learn-android-kotlin.md](./learn-android-kotlin.md) mục 10 có bẫy cùng loại).

## 3. Nối bằng Hilt

Trong [di/AppModule.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/di/AppModule.kt), hai chỗ:

```kotlin
// module @Provides: tạo API từ Retrofit dùng chung (đã có token, timeout, làm mới token)
@Provides fun providePersonalWordsApi(retrofit: Retrofit): PersonalWordsApi =
    retrofit.create(PersonalWordsApi::class.java)

// module @Binds: "ai xin PersonalWordsRepository thì đưa PersonalWordsRepositoryImpl"
@Binds
abstract fun bindPersonalWordsRepo(impl: PersonalWordsRepositoryImpl): PersonalWordsRepository
```

Retrofit dùng chung của app đã gắn token (`AuthInterceptor`) và tự làm mới token khi 401 (`TokenAuthenticator`) — màn mới được hưởng hết mà không viết dòng nào. Quên `@Binds` thì build báo lỗi Hilt kiểu `PersonalWordsRepository cannot be provided without an @Provides-annotated method` — lỗi lúc **biên dịch**, không phải lúc chạy.

## 4. ViewModel

[PersonalWordsViewModel.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/mywords/PersonalWordsViewModel.kt) (rút gọn):

```kotlin
sealed interface WordsContent {
    data object Loading : WordsContent
    data object NeedsLogin : WordsContent
    data class Error(val message: String) : WordsContent
    data class Data(val words: List<PersonalWord>) : WordsContent
}

data class PersonalWordsUiState(
    val lesson: Int? = null,
    val content: WordsContent = WordsContent.Loading,
    val refreshing: Boolean = false,
    val formErrors: WordErrors = WordErrors(),
    val serverError: String? = null,
    val saving: Boolean = false,
    val message: String? = null, // snackbar: sự kiện một lần
)

@HiltViewModel
class PersonalWordsViewModel @Inject constructor(
    private val repo: PersonalWordsRepository,
    private val auth: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(PersonalWordsUiState())
    val state: StateFlow<PersonalWordsUiState> = _state.asStateFlow()
    private var loadJob: Job? = null

    private fun load(pullToRefresh: Boolean = false) {
        loadJob?.cancel() // đổi bộ lọc liên tục: kết quả cũ không được ghi đè kết quả mới
        _state.update { it.copy(refreshing = pullToRefresh) }
        loadJob = viewModelScope.launch {
            val content = if (!auth.isLoggedIn()) {
                WordsContent.NeedsLogin
            } else {
                repo.list(_state.value.lesson).fold(
                    onSuccess = { WordsContent.Data(it) },
                    onFailure = { WordsContent.Error(it.userMessage()) },
                )
            }
            _state.update { it.copy(content = content, refreshing = false) }
        }
    }

    fun delete(word: PersonalWord) {
        val before = _state.value.content
        _state.update { s ->      // lạc quan: dòng biến mất ngay
            val c = s.content
            if (c is WordsContent.Data) s.copy(content = WordsContent.Data(c.words.filter { it.id != word.id })) else s
        }
        viewModelScope.launch {
            repo.delete(word.id)
                .onSuccess { _state.update { it.copy(message = "Đã xóa ${word.kana}") } }
                .onFailure { e -> _state.update { it.copy(content = before, message = e.userMessage()) } }
        }
    }
}
```

- **Một `StateFlow` cho cả màn hình**; ra ngoài chỉ có bản chỉ đọc.
- **`NeedsLogin` là một trạng thái nội dung**, không phải cờ riêng — `when` trong màn hình phải xử lý nó.
- **`loadJob?.cancel()`**: chọn "Bài 1" rồi nhanh tay "Bài 6", mạng trả "Bài 1" sau thì không ghi đè.
- **Kiểm dữ liệu là hàm thuần** `validatePersonalWord(...)` cùng file — cùng luật với DTO của gateway. `add()` không gọi repository khi có lỗi và bỏ qua khi đang lưu (chống bấm hai lần); thành công thì gọi callback `onSaved()` để màn hình xóa ô.
- Theo đúng mẫu của [ProgressViewModel](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/progress/ProgressViewModel.kt): repository trả `Result`, lỗi đổi bằng `userMessage()`.

## 5. Màn hình Compose

[PersonalWordsScreen.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/mywords/PersonalWordsScreen.kt) (rút gọn):

```kotlin
@Composable
fun PersonalWordsScreen(onBack: () -> Unit, onLogin: () -> Unit, viewModel: PersonalWordsViewModel = hiltViewModel()) {
    val s by viewModel.state.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    var pendingDelete by remember { mutableStateOf<PersonalWord?>(null) }

    // Quay lại màn này (vd sau khi đăng nhập xong) → tải lại
    LifecycleResumeEffect(Unit) {
        viewModel.refresh()
        onPauseOrDispose { }
    }
    LaunchedEffect(s.message) {
        s.message?.let { snackbar.showSnackbar(it); viewModel.messageShown() }
    }

    Scaffold(topBar = { TopAppBar(title = { Text("Sổ từ của tôi") }, navigationIcon = { /* nút quay lại */ }) },
             snackbarHost = { SnackbarHost(snackbar) }) { padding ->
        when (val c = s.content) {
            WordsContent.Loading -> LoadingBox(modifier)
            WordsContent.NeedsLogin -> /* câu mời + Button("Đăng nhập", onClick = onLogin) */
            is WordsContent.Error -> MessageBox(c.message, modifier, onRetry = viewModel::refresh)
            is WordsContent.Data -> Column(modifier.fillMaxSize().imePadding()) {
                AddWordForm(s, onAdd = viewModel::add)
                /* FilterChip: Tất cả / Bài 1 / 2 / 3 / 6 */
                PullToRefreshBox(isRefreshing = s.refreshing, onRefresh = viewModel::refresh) {
                    WordList(c.words, …) { pendingDelete = it }   // combinedClickable(onLongClick)
                }
            }
        }
    }
    pendingDelete?.let { w -> AlertDialog(/* Xóa từ — Xóa "…" khỏi sổ? — Hủy / Xóa */) }
}
```

- **`LifecycleResumeEffect`**: màn đăng nhập quay về bằng `popBackStack()` — ViewModel của màn Sổ từ **không** tạo lại nên `init` không chạy nữa. Tải lại mỗi khi màn "resume". (Bản Expo giải đúng chuyện này bằng `useFocusEffect`.)
- **`imePadding()`** trên cột chứa form: nút "Thêm vào sổ" nằm trên bàn phím (đo trên máy ảo: y 876–981).
- Ô nhập dùng `rememberSaveable` — xoay màn hình không mất chữ.
- `semantics { contentDescription = "…" }` cho ô và nút: trình đọc màn hình và `adb` tìm được.
- Dùng lại `LoadingBox`, `MessageBox` của [presentation/common](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/common/Common.kt). Không dùng `BackScaffold` có sẵn vì nó không có chỗ cho snackbar — tự dựng `Scaffold` cùng kiểu.
- **Snackbar là sự kiện một lần**: hiện xong gọi `messageShown()`, nếu không xoay màn hình sẽ hiện lại.

**Route và Home** — [NihongoApp.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/NihongoApp.kt): thêm `const val MY_WORDS = "my-words"`, một `composable(Routes.MY_WORDS) { PersonalWordsScreen(onBack = …, onLogin = { navController.navigate(Routes.LOGIN) }) }`, và tham số `onMyWords` cho `HomeScreen` (có giá trị mặc định `{}` để không phải sửa mọi nơi gọi). [HomeScreen.kt](../apps/nihongo-android/app/src/main/java/com/edu/nihongo/presentation/home/HomeScreen.kt): thêm một `NavCard`.

## 6. Test

```bash
cd apps/nihongo-android
./gradlew :app:testDebugUnitTest --tests '*PersonalWords*'
./gradlew :app:testDebugUnitTest          # toàn bộ: 120 test
```

**ViewModel** ([PersonalWordsViewModelTest.kt](../apps/nihongo-android/app/src/test/java/com/edu/nihongo/presentation/mywords/PersonalWordsViewModelTest.kt)) dùng `MainDispatcherRule` có sẵn của app (thay `Dispatchers.Main` khi chạy trên JVM) và hai bản giả viết ngay trong file: `FakeAuth`, `FakeWords`. Sáu test: chưa đăng nhập → `NeedsLogin`; tải + lọc; đổi bộ lọc liên tục; form sai không gọi server; server báo trùng thì hiện câu của server và **không** xóa ô; xóa lỗi thì dòng hiện lại.

Test "đổi bộ lọc liên tục" phải **dựng đúng tình huống gây lỗi** — lần tải cũ về **sau** lần mới:

```kotlin
val bai1 = CompletableDeferred<Unit>()
val bai6 = CompletableDeferred<Unit>()
repo.gates += bai1          // mỗi lần list() lấy một cổng riêng và chờ
repo.gates += bai6
vm.selectLesson(1); advanceUntilIdle()
vm.selectLesson(6); advanceUntilIdle()
bai6.complete(Unit); advanceUntilIdle()   // "bài 6" về trước…
bai1.complete(Unit); advanceUntilIdle()   // …"bài 1" (cũ) về sau
assertEquals(listOf("たべます"), data(vm))
```

> **Bài học khi viết test kiểu này** (gặp khi làm bản thử): một cổng **chung** cho cả hai lần tải thì hai lần xong theo đúng thứ tự gọi, kết quả mới tình cờ ghi sau cùng — bỏ `loadJob?.cancel()` mà test vẫn xanh. Sau khi dựng mỗi lần một cổng, bỏ dòng hủy thì test đỏ: `expected:<[たべます]> but was:<[わたし]>`. Luôn thử làm hỏng code để chắc test bắt được lỗi nó định bắt.

**Repository + MockWebServer** ([PersonalWordsRepositoryImplTest.kt](../apps/nihongo-android/app/src/test/java/com/edu/nihongo/data/repository/PersonalWordsRepositoryImplTest.kt)) — server HTTP thật trong test trả JSON đúng dạng gateway:

```kotlin
@Test fun loi409_giuNguyenCauCuaServer() = runTest {
    server.enqueue(MockResponse().setResponseCode(409)
        .setBody("""{"success":false,"error":{"code":"CONFLICT","message":"Từ này đã có trong sổ"}}"""))
    val e = repo.add("わたし", "tôi", 1).exceptionOrNull()
    assertTrue(e is ServerMessageException)
    assertEquals("Từ này đã có trong sổ", e!!.message)
}
```

Ba test: mở phong bì + đúng đường dẫn/tham số; 409 giữ câu của server; 500 **không** đọc body.

## 7. Build, cài, chạy

```bash
./gradlew :app:assembleDebug
adb uninstall com.edu.nihongo        # nếu đang cài app Expo (cùng tên gói)
adb install app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.edu.nihongo/.MainActivity
```

Lần mở đầu, app hỏi quyền thông báo — bấm Allow/Don’t allow trước khi điều khiển tiếp.

## 8. Kết quả trên máy ảo

Điều khiển bằng `adb` như [learn-react-native-build-app.md](./learn-react-native-build-app.md) mục 9.

| Thao tác | Thấy |
|---|---|
| Home | Thẻ "Sổ từ của tôi" (MỚI) đầu nhóm HỌC TẬP |
| Mở khi chưa đăng nhập | "Đăng nhập để lưu từ vựng của riêng bạn." + nút Đăng nhập |
| Đăng nhập email | Tự quay lại, tải `たべます`, `わたし` (thêm từ web) |
| Form: `abc`, nghĩa trống, bài 99 | Ba lỗi dưới ba ô; nút vẫn trên bàn phím |
| Chọn "Bài 6" | Chỉ còn `たべます` |
| Thêm `ねこ` qua API, kéo xuống | `ねこ` xuất hiện |
| Giữ lâu `ねこ` → Xóa | Hộp "Xóa từ" (Hủy/Xóa); snackbar "Đã xóa ねこ"; dòng mất |

## 9. Danh sách kiểm cho màn hình tiếp theo

1. Gọi thử API, viết DTO đúng JSON; interface Retrofit dùng `ApiEnvelope<T>`.
2. Interface repository + entity ở `domain`; cài đặt ở `data` trả `Result`, ném lại `CancellationException`, đọc câu lỗi server cho 400/409.
3. `@Provides` API, `@Binds` repository trong `AppModule`.
4. ViewModel: một `StateFlow`, `sealed interface` nội dung có cả trạng thái "cần đăng nhập"; hủy lần tải cũ; kiểm dữ liệu bằng hàm thuần.
5. Màn hình: `collectAsStateWithLifecycle`, tải lại khi resume, `imePadding`, `rememberSaveable`, hộp xác nhận, snackbar một lần.
6. Route + thẻ Home.
7. Test ViewModel (bản giả, `MainDispatcherRule`, dựng đúng tình huống gây lỗi) và repository (MockWebServer); làm hỏng thử.
8. `testDebugUnitTest` toàn bộ; cài lên máy ảo, đi hết bảng mục 8.

## 10. Khi bạn tự tạo app Android mới

Mình đã thử dựng một app Compose trống từ dòng lệnh (13/11/2026, cùng bộ phiên bản với app này: AGP 8.7.3, Kotlin 2.0.21, Gradle 9.7.1, Compose BOM 2024.10.01) với Retrofit + kotlinx.serialization, DataStore, Navigation có kiểu — chạy được trên máy ảo với API thật. Ghi chú:

| Gặp | Làm gì |
|---|---|
| Không có lệnh tạo project từ dòng lệnh | Android Studio → *New Project* → *Empty Activity*; hoặc chép Gradle wrapper từ project có sẵn và viết `settings.gradle.kts`, `build.gradle.kts` tay |
| `SDK location not found` | `ANDROID_HOME` hoặc `local.properties` (`sdk.dir=…`, không commit) |
| `'kotlinOptions' … is deprecated` | `kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }` |
| Plugin Kotlin lệch phiên bản | `kotlin.android`, `plugin.compose`, `plugin.serialization` cùng một số |
| `SecurityException: … missing INTERNET permission` | `<uses-permission android:name="android.permission.INTERNET" />` |
| `CLEARTEXT communication … not permitted` | `usesCleartextTraffic="true"` chỉ cho bản dev; production dùng https |
| App crash khi server thêm trường JSON | kotlinx.serialization: `Json { ignoreUnknownKeys = true }` (Gson mặc định đã bỏ qua) |
| Navigation route bằng chuỗi `"detail/{id}"` gõ sai lúc chạy mới lộ | Navigation 2.8+: route `@Serializable data class`, đọc bằng `toRoute<T>()` |
| Bàn phím che nút khi `enableEdgeToEdge()` | `Modifier.imePadding()` |
| Lưu token bằng DataStore | DataStore không mã hóa; app thật mã hóa bằng khóa Android Keystore |

## Lỗi hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Build: `… cannot be provided without an @Provides-annotated method` | Thiếu `@Binds`/`@Provides` | Thêm vào `AppModule` |
| 409 hiện "Có lỗi xảy ra (mã 409)" | `userMessage()` chỉ đọc mã HTTP | Đọc `error.message` trong repository (`ServerMessageException`) |
| Rời màn lúc đang tải thì hiện lỗi lạ | `catch (e: Exception)` nuốt `CancellationException` | Ném lại |
| Đổi bộ lọc nhanh thấy dữ liệu cũ | Không hủy lần tải cũ | `loadJob?.cancel()` |
| Đăng nhập xong quay lại vẫn "cần đăng nhập" | Chỉ tải trong `init` | Tải lại khi resume (`LifecycleResumeEffect`) |
| Snackbar hiện lại sau khi xoay | Không xóa thông báo | `messageShown()` |
| Test: `Module with the Main dispatcher is missing` | Thiếu rule | `@get:Rule val main = MainDispatcherRule()` |
| Cài APK báo xung đột | App Expo cùng tên gói | `adb uninstall com.edu.nihongo` |

## Tự kiểm tra

1. Vì sao ViewModel phụ thuộc `PersonalWordsRepository` (interface)?
<details><summary>Đáp án</summary>Để test dùng bản giả không cần mạng, và để đổi nguồn dữ liệu (thêm Room offline) mà ViewModel không đổi.</details>

2. Vì sao repository chỉ đọc câu lỗi của server cho 400/409?
<details><summary>Đáp án</summary>Đó là lỗi nghiệp vụ server đã giải thích cho người dùng. 5xx có thể chứa chi tiết nội bộ, không được hiện ra màn hình; 401 do luồng làm mới token và `userMessage()` chung xử lý.</details>

3. `NeedsLogin` là một nhánh của `WordsContent` có lợi gì?
<details><summary>Đáp án</summary>Màn hình buộc phải xử lý nó trong `when` (thiếu là lỗi biên dịch), và không thể vừa "cần đăng nhập" vừa "có dữ liệu".</details>

4. Vì sao cần `LifecycleResumeEffect` dù `init` đã tải?
<details><summary>Đáp án</summary>Sau khi đăng nhập, màn quay về bằng `popBackStack()`; ViewModel cũ vẫn sống nên `init` không chạy lại.</details>

5. Test "đổi bộ lọc liên tục" với một cổng chung có vấn đề gì?
<details><summary>Đáp án</summary>Hai lần tải xong đúng thứ tự gọi nên kết quả mới tình cờ ghi sau; test xanh cả khi bỏ `cancel()` — không bắt được lỗi.</details>

## Bài tập

1. **Sửa từ:** thêm `@PATCH("personal-words/{id}")`, hộp sửa nghĩa khi chạm một dòng. Tự kiểm: test ViewModel cho 409; máy ảo thấy nghĩa mới.
2. **Offline với Room:** lưu danh sách vào Room, màn hình đọc `Flow` từ Room, mạng chỉ cập nhật Room — đúng mẫu offline-first của app ([learn-android-architecture.md](./learn-android-architecture.md) mục 29–30). Tự kiểm: chế độ máy bay, mở lại vẫn thấy danh sách.
3. **Lưu từ đang học:** trên màn từ vựng của bài, nút "Lưu vào sổ". Tự kiểm: Sổ từ có từ đó, lưu lần hai thấy "Từ này đã có trong sổ".
4. **Test giao diện:** `createComposeRule()` cho `PersonalWordsScreen` với ViewModel dùng repository giả; bấm "Thêm vào sổ" khi trống thấy ba lỗi. Chạy `./gradlew connectedDebugAndroidTest` (cần máy ảo).
5. **Màn của bạn:** "Ghi chú theo bài" cho API ở bài tập 5 của bài backend.

## Luyện phỏng vấn

Câu hỏi Android (coroutine, Flow, Compose, Hilt, kiến trúc, test): [interview-android.md](./interview-android.md).

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **9. Mobile** — bài 8/16.

- Bài trước: [learn-android-framework.md](./learn-android-framework.md) — Android nâng cao: khởi động, system service, Binder, lab AIDL trong app, SELinux, HAL, Android Automotive
- **Bài tiếp: [learn-swift-ios.md](./learn-swift-ios.md)** — Swift/SwiftUI qua nihongo-ios

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
