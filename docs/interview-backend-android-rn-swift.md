# Câu hỏi phỏng vấn — Backend · Android · React Native · Swift

> **Mục tiêu:** Ôn câu hỏi trộn nhiều mảng — NestJS, xác thực, AI, database, Flutter, Android, React Native, Swift — với ví dụ từ project.
>
> **Cần biết trước:** [learn-nestjs.md](./learn-nestjs.md), [learn-android-kotlin.md](./learn-android-kotlin.md), [learn-react-native.md](./learn-react-native.md), [learn-swift-ios.md](./learn-swift-ios.md). Bộ sâu hơn cho từng mảng: [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md), [interview-android.md](./interview-android.md), [interview-react-native-senior.md](./interview-react-native-senior.md).

Cách dùng: tự trả lời thành tiếng rồi mới bấm mở **Đáp án**.

---

## BACKEND (NestJS / Node.js / TypeScript)

### Kiến trúc & NestJS

**Q: Module, Controller, Service trong NestJS khác nhau thế nào?**

<details><summary>Đáp án</summary>

Module = đơn vị tổ chức code, khai báo provider và import dependency. Controller = nhận HTTP request, route sang Service. Service = business logic, không biết HTTP.

Ví dụ trong project:
```typescript
// services/api-gateway/src/ai/ai.module.ts
@Module({
  controllers: [AiController],   // nhận POST /ai/chat
  providers: [AiService],        // gọi Gemini API
})
export class AiModule {}

// AiController chỉ parse body, gọi AiService, trả về kết quả
// AiService chứa toàn bộ logic: build systemInstruction, map history, gọi Gemini
```

Rule: Controller không chứa logic — nếu logic nằm trong Controller là sai thiết kế.

</details>

---

**Q: Guard vs Middleware vs Interceptor khác nhau thế nào?**

<details><summary>Đáp án</summary>

- **Middleware**: chạy trước route handler, không biết context NestJS. Dùng cho CORS, cookie, logging raw.
- **Guard**: quyết định request có được thực thi không (auth/role). Trả `true/false`.
- **Interceptor**: wrap request/response — transform, log metrics, cache.

Ví dụ trong project — đo metric HTTP **từng** là interceptor, nay là middleware ([http-metrics.middleware.ts](../services/api-gateway/src/metrics/http-metrics.middleware.ts)). Lý do: interceptor chỉ chạy khi request đã qua guard, nên bản cũ không bao giờ đếm được 401/403 (guard chặn), 429 (throttler), 413 (body quá lớn). Middleware nghe sự kiện `finish` của response, luôn xảy ra dù request bị chặn ở tầng nào:

```typescript
// services/api-gateway/src/metrics/http-metrics.middleware.ts (rút gọn)
use(req: Request, res: Response, next: NextFunction): void {
  const endTimer = this.histogram.startTimer();
  res.on("finish", () => {
    // req.route chỉ có SAU khi Express khớp route → đọc lúc response xong
    const labels = { method: req.method, route: routeLabel(req), status: String(res.statusCode) };
    this.counter.inc(labels);
    endTimer(labels);
  });
  next();
}
```

Nhãn `route` là mẫu (`/api/vocabularies/:id`), không phải URL thật, để tránh bùng nổ cardinality. Interceptor thật trong project: `ResponseInterceptor` bọc response, `AuditInterceptor` ghi audit vào MongoDB.

`main.ts` đăng ký global:
```typescript
app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
app.useGlobalFilters(new AllExceptionsFilter());
```

</details>

---

**Q: ValidationPipe dùng để làm gì, cấu hình thế nào?**

<details><summary>Đáp án</summary>

Validate và transform input trước khi vào handler. `whitelist: true` strip field không có trong DTO. `forbidNonWhitelisted` throw nếu có field lạ.

Thực tế trong `main.ts`:
```typescript
// services/api-gateway/src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,           // strip field không có trong DTO
    transform: true,           // auto-convert type (string → number)
    forbidNonWhitelisted: true, // throw 400 nếu có field lạ
  }),
);
```

</details>

---

**Q: Microservice pattern trong project — VocabulariesController giao tiếp thế nào với content-service?**

<details><summary>Đáp án</summary>

API Gateway không trực tiếp query DB — gửi message qua gRPC đến content-service thông qua `ClientProxy`.

```typescript
// services/api-gateway/src/http/vocabularies.controller.ts
@Controller('api/vocabularies')
export class VocabulariesController {
  constructor(
    @Inject('CONTENT_SERVICE') private readonly contentClient: ClientProxy,
  ) {}

  @Get()
  @Public()
  findAll(@Query() query: LessonPaginationDto) {
    // Gửi message đến content-service, chờ response
    return firstValueFrom(
      this.contentClient.send(CONTENT_PATTERNS.GET_VOCABULARIES, {
        lessonNumber: query.lessonNumber,
        page: query.page ?? 1,
        limit: query.limit ?? 50,
      }),
    );
  }
}
```

Ưu điểm: API Gateway không cần biết DB schema, content-service có thể scale độc lập.

</details>

---

### Authentication & Security

**Q: JWT Access Token + Refresh Token — project implement thế nào?**

<details><summary>Đáp án</summary>

Access token TTL 15 phút, refresh token TTL 7 ngày lưu DB với `revoked` flag. Refresh token dùng pattern `id.secret` — lưu bcrypt hash, không lưu plaintext.

```typescript
// services/api-gateway/src/auth/auth.service.ts
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 7;

async generateTokens(user: { id: number; email: string; role: Role }) {
  const access_token = await this.jwtService.signAsync(
    { sub: user.id, email: user.email, role: user.role },
    { expiresIn: ACCESS_TOKEN_TTL },
  );

  // Refresh token = id.secret (id lưu DB, secret chỉ client biết)
  const secret = randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(secret, 12);
  const record = await this.prisma.refreshToken.create({
    data: {
      token: tokenHash,   // lưu hash, không lưu plaintext
      userId: user.id,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 86400000),
    },
  });

  return { access_token, refresh_token: `${record.id}.${secret}` };
}

async refreshTokens(refreshToken: string) {
  const [tokenId, secret] = refreshToken.split('.');
  const stored = await this.prisma.refreshToken.findUnique({
    where: { id: tokenId },
    include: { user: { select: publicUserSelect } },
  });

  // Kiểm tra: tồn tại, chưa revoked, chưa hết hạn, secret đúng
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
  }
  const valid = await bcrypt.compare(secret, stored.token);
  if (!valid) throw new UnauthorizedException('Refresh token không hợp lệ');

  // Revoke token cũ (rotation) → không dùng lại được
  await this.prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  return this.generateTokens(stored.user);
}
```

</details>

---

**Q: Google OAuth login — flow trong project?**

<details><summary>Đáp án</summary>

Client gửi `credential` (Google ID token) lên server. Server verify bằng `google-auth-library`, lấy `sub + email`, tìm hoặc tạo user.

```typescript
// auth.service.ts
async loginWithGoogle(dto: GoogleAuthDto) {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: dto.credential,
    audience: clientId,   // verify đúng app
  });
  const payload = ticket.getPayload();

  // Tìm user theo googleId HOẶC email (merge account)
  let user = await this.prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email: payload.email }] },
  });

  if (!user) {
    user = await this.prisma.user.create({
      data: { email: payload.email, googleId: payload.sub, name: payload.name },
    });
  }

  return this.generateTokens(user);
}
```

</details>

---

**Q: Security setup trong main.ts — project dùng gì?**

<details><summary>Đáp án</summary>

```typescript
// services/api-gateway/src/main.ts
app.use(helmet({           // set security headers: X-Frame-Options, CSP, etc.
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

app.enableCors({
  origin: configService.get<string[]>('cors.origins'), // whitelist từ config
  credentials: true,
});

app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
```

Helmet tự động set: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`.

</details>

---

### AI & External Services

**Q: AiService dùng Gemini thế nào — có gì đặc biệt so với OpenAI?**

<details><summary>Đáp án</summary>

Gemini dùng `"model"` thay vì `"assistant"` cho role. API dùng `chats.create()` + `sendMessage()` thay vì `messages.create()`.

```typescript
// services/api-gateway/src/ai/ai.service.ts
@Injectable()
export class AiService {
  private readonly ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  async ask(dto: AskDto): Promise<string> {
    // Map history: 'assistant' → 'model' (Gemini convention)
    const geminiHistory = dto.history.slice(-10).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = this.ai.chats.create({
      model: 'gemini-2.0-flash',
      config: {
        systemInstruction: 'Bạn là gia sư tiếng Nhật...',
        maxOutputTokens: 600,
        temperature: 0.7,
      },
      history: geminiHistory,
    });

    const response = await chat.sendMessage({ message: dto.question });
    return response.text ?? '';
  }
}
```

History giới hạn 10 messages cuối — tránh token quá lớn.

</details>

---

**Q: LiveService tạo token LiveKit thế nào — host vs viewer khác gì?**

<details><summary>Đáp án</summary>

Host có `canPublish: true` (stream camera/mic). Viewer có `canPublish: false` (chỉ xem).

```typescript
// services/api-gateway/src/http/live.service.ts
private createToken(userId: number, roomName: string, role: LiveRole): Promise<string> {
  const at = new AccessToken(apiKey, apiSecret, {
    identity: String(userId),
    ttl: '2h',
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: role === 'host',    // ← khác biệt chính
    canPublishData: true,           // chat vẫn được
    canSubscribe: true,
  });

  return at.toJwt();
}

// Khi coach tạo phòng → token host
async createLiveSession(coachId: number, title: string) {
  const roomName = `live_${coachId}_${Date.now()}`;
  await roomClient.createRoom({ name: roomName, maxParticipants: 200 });
  return { token: await this.createToken(coachId, roomName, 'host') };
}

// Khi viewer join → token viewer
async joinAsViewer(userId: number, sessionId: number) {
  const session = await this.prisma.liveSession.findFirst({
    where: { id: sessionId, status: 'LIVE' },
  });
  return { token: await this.createToken(userId, session.roomName, 'viewer') };
}
```

</details>

---

### Database

**Q: Tại sao VocabulariesController không query DB trực tiếp mà gửi qua ClientProxy?**

<details><summary>Đáp án</summary>

Microservice architecture — API Gateway là entry point, content-service quản lý vocab data. Lợi ích:
- content-service scale độc lập khi load vocab cao
- API Gateway không cần biết DB schema của content-service
- Thay đổi DB trong content-service không ảnh hưởng API Gateway

```typescript
// KHÔNG làm thế này trong API Gateway
const vocabs = await this.prisma.vocabulary.findMany(...); // ❌ tight coupling

// Làm thế này
return firstValueFrom(
  this.contentClient.send(CONTENT_PATTERNS.GET_VOCABULARIES, query) // ✅ decoupled
);
```

</details>

**Q: `publicUserSelect` trong AuthService dùng để làm gì?**

<details><summary>Đáp án</summary>

Prisma select object đảm bảo không bao giờ trả `passwordHash` ra ngoài. Compile-time safe — nếu thêm field nhạy cảm mà quên thêm vào select, type sẽ không compile.

```typescript
const publicUserSelect = {
  id: true, email: true, role: true, name: true, avatarUrl: true,
  passwordHash: true,  // lấy để check, nhưng strip trước khi trả về
  googleId: true,
} as const;

toPublicUser(user: PublicUserRow) {
  const { passwordHash, googleId, ...rest } = user; // strip sensitive fields
  return { ...rest, hasPassword: !!passwordHash, isGoogleLinked: !!googleId };
}
```

</details>

---

## FLUTTER / DART

### Clean Architecture trong project

**Q: Giải thích Clean Architecture — ví dụ từ VocabularyRepository.**

<details><summary>Đáp án</summary>

3 layer rõ ràng:

```
Domain layer (không import Flutter/Dio/Drift):
  VocabularyRepository (interface)   ← UseCase chỉ biết interface này
  Vocabulary, SrsCard, ReviewCard    ← Entity
  GetReviewQueueUseCase              ← business logic

Data layer (implement interface):
  VocabularyRepositoryImpl           ← dùng Drift + VocabularyApi
  AppDatabase (Drift)                ← local storage
  VocabularyApi (Dio)                ← remote API

Presentation layer:
  VocabScreen, SrsScreen             ← ConsumerWidget
  Riverpod providers                 ← wire everything together
```

```dart
// domain/repository/vocabulary_repository.dart — interface, không import Drift/Dio
abstract class VocabularyRepository {
  Stream<List<Vocabulary>> watchVocabByLesson(int lessonNumber);
  Stream<List<ReviewCard>> watchReviewQueue();
  Future<Result<void>> updateSrsCard(SrsCard card);
}

// data/repository/vocabulary_repository_impl.dart — implement cụ thể
class VocabularyRepositoryImpl implements VocabularyRepository {
  VocabularyRepositoryImpl({
    required AppDatabase db,
    required VocabularyApi api,
    required NetworkMonitor networkMonitor,
    required Future<bool> Function() isAuthenticated,
  });

  @override
  Stream<List<Vocabulary>> watchVocabByLesson(int lessonNumber) {
    return _db.watchVocabByLesson(lessonNumber)
        .map((rows) => rows.map(_toVocabDomain).toList());
  }
}
```

</details>

---

**Q: UseCase trong project dùng để làm gì — tại sao không để logic đó trong Repository?**

<details><summary>Đáp án</summary>

`GetReviewQueueUseCase` lọc card đến hạn theo thời gian. Logic này thuộc business domain, không phải data access. Nếu thay đổi rule lọc (ví dụ: thêm max 20 cards/session), chỉ sửa 1 chỗ.

```dart
// domain/usecase/get_review_queue_usecase.dart
class GetReviewQueueUseCase {
  const GetReviewQueueUseCase(this._repo);
  final VocabularyRepository _repo;

  Stream<List<ReviewCard>> call() {
    final now = DateTime.now();
    return _repo.watchReviewQueue().map(
      (cards) => cards.where((c) => !c.card.nextReviewAt.isAfter(now)).toList(),
    );
  }
}

// providers.dart — wire UseCase với Repository
final getReviewQueueUseCaseProvider = Provider(
  (ref) => GetReviewQueueUseCase(ref.watch(vocabRepositoryProvider)),
);
```

</details>

---

**Q: Offline-first sync flow trong project — updateSrsCard làm gì khi offline?**

<details><summary>Đáp án</summary>

Write local DB trước → thêm vào sync queue → nếu online thì flush ngay, nếu offline giữ pending.

```dart
// data/repository/vocabulary_repository_impl.dart
@override
Future<Result<void>> updateSrsCard(SrsCard card) async {
  try {
    // 1. Write local DB ngay lập tức (không chờ network)
    await _db.updateSrsAfterReview(
      id: card.id,
      easeFactor: card.easeFactor,
      interval: card.interval,
      nextReviewAt: card.nextReviewAt.millisecondsSinceEpoch,
    );

    // 2. Thêm vào sync queue
    await _db.enqueueSync(
      operation: 'UPDATE_SRS',
      entityId: card.id,
      payload: jsonEncode(card.toJson()),
    );

    // 3. Nếu online + đã login → flush luôn
    if (await _network.isOnline() && await _isAuthenticated()) {
      await syncAllPending();
    }

    return const Success(null);
  } catch (e, st) {
    return Failure(e, stackTrace: st);
  }
}
```

UI không bao giờ chờ network → luôn responsive.

</details>

---

**Q: `watchReviewQueue()` trả về Stream — tại sao SrsScreen tự cập nhật khi DB thay đổi?**

<details><summary>Đáp án</summary>

Drift watch query trả Stream. Mỗi lần DB thay đổi → Stream emit giá trị mới → Riverpod `StreamProvider` notify → widget rebuild.

```dart
// providers.dart
final reviewQueueProvider = StreamProvider<List<ReviewCard>>((ref) {
  return ref.watch(getReviewQueueUseCaseProvider)();
});

// SrsScreen — tự rebuild khi queue thay đổi
final queue = ref.watch(reviewQueueProvider);
queue.when(
  data: (cards) => cards.isEmpty ? EmptyState() : SwipeCard(card: cards.first),
  loading: () => CircularProgressIndicator(),
  error: (e, _) => ErrorWidget(e),
);
```

Không cần `setState`, không cần manual refresh.

</details>

---

**Q: `ref.watch` vs `ref.read` — dùng sai có gì không?**

<details><summary>Đáp án</summary>

`ref.watch` trong `build()` → subscribe, rebuild khi thay đổi.
`ref.read` trong callback (onTap) → đọc 1 lần, không subscribe.

```dart
// ✅ Đúng
Widget build(BuildContext context, WidgetRef ref) {
  final queue = ref.watch(reviewQueueProvider); // subscribe
  return ElevatedButton(
    onPressed: () {
      // ref.watch trong callback → memory leak, widget không dispose được
      ref.read(vocabRepositoryProvider).updateSrsCard(card); // ✅ read
    },
    child: Text('Submit'),
  );
}

// ❌ Sai — ref.watch trong callback
onPressed: () {
  ref.watch(reviewQueueProvider); // re-subscribe mỗi lần tap → leak
}
```

</details>

---

**Q: `KanjiDrawScreen` dùng `shouldRepaint` thế nào?**

<details><summary>Đáp án</summary>

Tránh repaint không cần thiết — chỉ repaint khi strokes hoặc current nét thay đổi.

```dart
// presentation/kanji_draw/kanji_draw_screen.dart
class _StrokePainter extends CustomPainter {
  _StrokePainter({required this.strokes, required this.current, required this.strokeColor});

  final List<Stroke> strokes;
  final Stroke current;
  final Color strokeColor;

  @override
  bool shouldRepaint(_StrokePainter old) =>
      old.strokes != strokes || old.current != current;
      // Nếu chỉ color thay đổi (dark/light mode) cũng repaint
      // Thêm: || old.strokeColor != strokeColor nếu cần
}
```

</details>

---

## ANDROID (Kotlin / Jetpack)

### Coroutines & Flow

**Q: Coroutine vs Thread — tại sao Android dùng Coroutine?**

<details><summary>Đáp án</summary>

Thread tốn ~1MB RAM/thread, OS-managed. Coroutine lightweight, suspend khi chờ I/O thay vì block thread. 1 thread xử lý được nhiều coroutine.

Pattern trong project (tương đương Flutter's async/await):
```kotlin
// ViewModel
viewModelScope.launch {
  // Tự động cancel khi ViewModel bị clear (user navigate away)
  val vocabs = withContext(Dispatchers.IO) {
    vocabRepository.getVocabByLesson(lessonNumber) // suspend, không block Main thread
  }
  _uiState.value = VocabUiState.Success(vocabs)  // update UI trên Main thread
}
```

Tương đương `_network.isOnline()` trong Flutter — suspend, không block.

</details>

**Q: Flow vs LiveData — project Flutter dùng Stream, Android dùng gì tương đương?**

<details><summary>Đáp án</summary>

Android Room + Flow (tương đương Drift + Stream trong Flutter). `StateFlow` tương đương `StreamController` + `stream`.

```kotlin
// Room DAO — tương đương watchVocabByLesson() của Drift
@Dao
interface VocabularyDao {
  @Query("SELECT * FROM vocabulary WHERE lesson_number = :lesson ORDER BY sort_order")
  fun watchByLesson(lesson: Int): Flow<List<VocabularyEntity>>  // reactive, tự emit khi DB thay đổi
}

// ViewModel collect Flow
val vocabs: StateFlow<List<Vocabulary>> = vocabRepository
  .watchByLesson(lessonNumber)
  .map { it.map(::toDomain) }
  .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())
```

</details>

**Q: `launch` vs `async` — khi nào dùng cái nào?**

<details><summary>Đáp án</summary>

`launch` = fire and forget. `async` = cần kết quả (trả `Deferred<T>`). Chạy song song:
```kotlin
// Fetch vocab và user song song — giống Future.wait() trong Flutter
val vocabDeferred = async(Dispatchers.IO) { vocabApi.fetchLesson(1) }
val userDeferred = async(Dispatchers.IO) { userApi.getProfile() }
val vocab = vocabDeferred.await()  // chờ cả 2 hoàn thành
val user = userDeferred.await()
```

</details>

---

### Architecture

**Q: ViewModel không bị destroy khi rotation — tại sao?**

<details><summary>Đáp án</summary>

ViewModel sống trong `ViewModelStore` gắn với Activity, không phải Activity instance. Rotation destroy Activity instance nhưng ViewModelStore survive.

```kotlin
// Tương đương Riverpod provider trong Flutter
// Provider sống xuyên suốt — không bị destroy khi widget rebuild
class SrsViewModel @HiltViewModel constructor(
  private val getReviewQueueUseCase: GetReviewQueueUseCase  // inject
) : ViewModel() {
  val reviewQueue: StateFlow<List<ReviewCard>> = getReviewQueueUseCase()
    .stateIn(viewModelScope, SharingStarted.WhileSubscribed(), emptyList())
    // Tương đương reviewQueueProvider trong Flutter
}
```

</details>

**Q: WorkManager — tương đương gì trong Flutter? Dùng khi nào?**

<details><summary>Đáp án</summary>

Flutter dùng Workmanager package (wrapper WorkManager Android). Dùng cho background sync — tương đương `syncAllPending()` chạy background.

```kotlin
// Tương đương SyncService trong Flutter
class SyncWorker(ctx: Context, params: WorkerParameters) : CoroutineWorker(ctx, params) {
  override suspend fun doWork(): Result {
    return try {
      syncRepository.syncAllPending()
      Result.success()
    } catch (e: Exception) {
      Result.retry()  // retry tự động — tương đương giữ syncStatus = 'pending'
    }
  }
}

// Đăng ký chạy mỗi giờ khi có mạng
val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(1, TimeUnit.HOURS)
  .setConstraints(
    Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)  // tương đương isOnline() check
      .build()
  )
  .build()
WorkManager.getInstance(context)
  .enqueueUniquePeriodicWork("vocab-sync", ExistingPeriodicWorkPolicy.KEEP, syncRequest)
```

</details>

**Q: Hilt inject thế nào — tương đương Riverpod Provider?**

<details><summary>Đáp án</summary>

Riverpod `Provider` ~ Hilt `@Singleton`. Riverpod `ref.watch` ~ Hilt `@Inject`.

```kotlin
// Tương đương vocabRepositoryProvider trong Flutter
@Module @InstallIn(SingletonComponent::class)
object RepositoryModule {
  @Provides @Singleton
  fun provideVocabRepository(db: AppDatabase, api: VocabularyApi): VocabularyRepository {
    return VocabularyRepositoryImpl(db, api)
  }
}

// Tương đương ref.watch(vocabRepositoryProvider) trong Flutter
@HiltViewModel
class VocabViewModel @Inject constructor(
  private val repo: VocabularyRepository  // Hilt tự inject
) : ViewModel()
```

</details>

---

### Compose & Performance

**Q: `remember` vs `rememberSaveable` — tương đương trong Flutter?**

<details><summary>Đáp án</summary>

`remember` ~ `StatefulWidget` state (mất khi widget unmount). `rememberSaveable` ~ `PageStorage` (survive rotation).

```kotlin
@Composable
fun KanjiDrawScreen(kanji: String) {
  // remember: survive recomposition, mất khi navigation
  val strokes = remember { mutableStateListOf<List<Offset>>() }

  // rememberSaveable: survive rotation
  val isFlipped = rememberSaveable { mutableStateOf(false) }

  // Tương đương _strokes = [] trong _KanjiDrawScreenState
  Canvas(modifier = Modifier.fillMaxSize().pointerInput(Unit) {
    detectDragGestures(
      onDragStart = { strokes.add(mutableListOf(it)) },
      onDrag = { _, delta -> strokes.last().add(strokes.last().last() + delta) },
    )
  }) {
    strokes.forEach { stroke -> drawPath(strokeToPath(stroke), strokePaint) }
  }
}
```

</details>

**Q: LazyColumn tốt hơn Column vì sao — tương đương Flutter?**

<details><summary>Đáp án</summary>

`LazyColumn` ~ `ListView.builder` trong Flutter. Chỉ compose item visible.

```kotlin
// ❌ Column — compose tất cả → OOM với 1000 vocab
Column { vocabs.forEach { VocabRow(it) } }

// ✅ LazyColumn — tương đương ListView.builder
LazyColumn {
  items(vocabs, key = { it.id }) { vocab ->  // key tương đương ValueKey
    VocabRow(vocab = vocab)
  }
}
```

</details>

---

## REACT NATIVE

### Architecture & Performance

**Q: Bridge cũ vs JSI (New Architecture) — khác nhau thế nào?**

<details><summary>Đáp án</summary>

Bridge: JS ↔ Native qua JSON serialization bất đồng bộ → latency. JSI: JS gọi native function trực tiếp qua C++ → synchronous, không serialize.

Ảnh hưởng thực tế trong project: Camera translate screen — Old Architecture phải serialize frame data qua bridge mỗi frame → lag. JSI cho phép xử lý frame native mà không serialize.

</details>

**Q: FlatList trong vocab screen — optimize thế nào?**

<details><summary>Đáp án</summary>

Tương đương `ListView.builder` Flutter. `getItemLayout` skip measure nếu item fixed height.

```jsx
// Tương đương VocabScreen Flutter
function VocabScreen({ lessonNumber }) {
  const [vocabs] = useVocabByLesson(lessonNumber);

  const renderItem = useCallback(  // tránh re-render toàn list khi component re-render
    ({ item }) => <VocabRow vocab={item} onPress={() => playTts(item.kana)} />,
    []
  );

  return (
    <FlatList
      data={vocabs}
      keyExtractor={item => item.id.toString()}
      renderItem={renderItem}
      getItemLayout={(_, index) => ({
        length: 72, offset: 72 * index, index  // skip measure → smooth scroll
      })}
      windowSize={5}
      removeClippedSubviews={true}
    />
  );
}
```

</details>

**Q: `useCallback` và `useMemo` — khi nào cần?**

<details><summary>Đáp án</summary>

Không cần cho mọi function. Cần khi: function là prop của component được memo, hoặc trong dependency array của useEffect/useMemo.

```jsx
// ❌ Không có useCallback → renderItem tạo mới mỗi render → FlatList re-render toàn bộ
const renderItem = ({ item }) => <VocabRow vocab={item} />;

// ✅ useCallback → reference ổn định → FlatList không re-render item không đổi
const renderItem = useCallback(({ item }) => <VocabRow vocab={item} />, []);

// useMemo cho expensive computation — tương đương remember(deps) trong Compose
const dueCards = useMemo(
  () => cards.filter(c => new Date(c.nextReviewAt) <= new Date()),
  [cards]  // chỉ tính lại khi cards thay đổi
);
```

</details>

---

### State Management

**Q: Context vs Redux vs Zustand — project nên dùng gì?**

<details><summary>Đáp án</summary>

Project Nihongo (React Native) — Zustand là lựa chọn tốt nhất vì selector pattern tránh re-render không cần thiết.

```javascript
// Zustand — tương đương Riverpod trong Flutter
const useVocabStore = create((set, get) => ({
  vocabs: [],
  syncStatus: 'idle',

  // Tương đương syncAllPending() trong VocabularyRepositoryImpl
  syncPending: async () => {
    const pending = get().vocabs.filter(v => v.syncStatus === 'pending');
    if (!pending.length) return;
    try {
      await vocabularyApi.bulkUpsert(pending);
      set(state => ({
        vocabs: state.vocabs.map(v =>
          pending.find(p => p.id === v.id) ? { ...v, syncStatus: 'synced' } : v
        )
      }));
    } catch (e) {
      console.warn('Sync failed, will retry:', e);
      // Giữ nguyên pending — retry sau
    }
  }
}));

// Selector — chỉ re-render khi dueCards thay đổi, không re-render khi syncStatus thay đổi
const dueCards = useVocabStore(state =>
  state.vocabs.filter(v => new Date(v.nextReviewAt) <= new Date())
);
```

</details>

---

**Q: Navigation deep link trong React Native — tương đương go_router?**

<details><summary>Đáp án</summary>

Tương đương `GoRouter` Flutter với `redirect`.

```javascript
// React Navigation — tương đương app.dart GoRouter
const linking = {
  prefixes: ['nihongo://', 'https://nihongo.app'],
  config: {
    screens: {
      // Tương đương GoRoute(path: '/vocab') trong Flutter
      Vocab: {
        path: 'lesson/:lessonId',
        parse: { lessonId: Number },
      },
      Live: 'live/:sessionId',
      SRS: 'srs',
    },
  },
};

// Tương đương context.push('/vocab') trong Flutter
navigation.navigate('Vocab', { lessonId: 5 });
```

</details>

---

## SWIFT / iOS

### Memory Management

**Q: Strong, weak, unowned — khi nào dùng cái nào?**

<details><summary>Đáp án</summary>

`strong` (default) giữ object alive. `weak` không giữ, tự set nil khi object deallocate. `unowned` không giữ, crash nếu truy cập sau khi deallocate.

```swift
// Tương đương pattern callback trong Flutter/Dart (không có ARC)
class LiveViewModel: ObservableObject {
  var onViewerCountUpdate: ((Int) -> Void)?
}

class LiveViewController: UIViewController {
  let viewModel = LiveViewModel()

  override func viewDidLoad() {
    // ❌ Retain cycle: VC → VM (strong) và VM → VC qua closure (strong)
    viewModel.onViewerCountUpdate = { count in
      self.updateLabel(count)  // self bị capture strong
    }

    // ✅ weak self phá retain cycle
    viewModel.onViewerCountUpdate = { [weak self] count in
      self?.updateLabel(count)  // self? = optional, nil nếu VC đã deallocate
    }
  }
}
```

</details>

---

**Q: Struct vs Class — khi nào dùng cái nào? Tương đương trong Dart?**

<details><summary>Đáp án</summary>

Dart không phân biệt struct/class — Dart class đều là reference type. Nhưng Dart có `@immutable` annotation tương tự struct semantics.

```swift
// Struct — value type, tương đương Freezed entity trong Flutter
struct Vocabulary: Codable {
  let id: Int
  let kana: String
  let meaning: String
  let lessonNumber: Int
}
// Tương đương Flutter:
// @freezed class Vocabulary with _$Vocabulary {
//   const factory Vocabulary({required int id, ...}) = _Vocabulary;
// }

// Class — reference type, tương đương ChangeNotifier/ObservableObject
class SrsViewModel: ObservableObject {
  @Published var cards: [ReviewCard] = []
  @Published var currentIndex: Int = 0

  func swipeRight() {
    updateCard(quality: 5)
  }
}
```

</details>

---

**Q: async/await trong Swift — tương đương Dart?**

<details><summary>Đáp án</summary>

Rất giống Dart async/await. Swift thêm `actor` cho thread safety.

```swift
// Swift async/await — gần giống Dart
// Dart:  Future<String> fetchVocab() async { ... }
// Swift: func fetchVocab() async throws -> [Vocabulary]

func loadVocab(lessonNumber: Int) async throws -> [Vocabulary] {
  // Tương đương _api.fetchAllVocabForLesson(lessonNumber) trong Flutter
  let url = URL(string: "\(baseURL)/api/vocabularies?lessonNumber=\(lessonNumber)")!
  let (data, _) = try await URLSession.shared.data(from: url)
  return try JSONDecoder().decode([Vocabulary].self, from: data)
}

// Actor — tương đương Dart Isolate nhưng có shared state
actor VocabCache {
  private var cache: [Int: [Vocabulary]] = [:]

  func get(_ lesson: Int) -> [Vocabulary]? { cache[lesson] }
  func set(_ lesson: Int, vocabs: [Vocabulary]) { cache[lesson] = vocabs }
  // Actor đảm bảo chỉ 1 task access state tại 1 thời điểm — thread-safe
}
```

</details>

---

**Q: @State, @StateObject, @ObservedObject — dùng sai có gì không?**

<details><summary>Đáp án</summary>

Dùng sai `@ObservedObject` thay vì `@StateObject` → ViewModel bị tạo lại mỗi lần view re-render → mất state.

```swift
// Tương đương Flutter ConsumerWidget với Riverpod

// ❌ @ObservedObject — ViewModel tạo mới mỗi lần render
struct SrsView: View {
  @ObservedObject var vm = SrsViewModel()  // tạo mới mỗi lần view init
}

// ✅ @StateObject — sở hữu, không tạo lại
struct SrsView: View {
  @StateObject private var vm = SrsViewModel()
  // Tương đương ref.watch(srsViewModelProvider) — provider không tạo lại instance

  var body: some View {
    if let card = vm.currentCard {
      CardView(card: card)
        .gesture(DragGesture()
          .onEnded { value in
            if value.translation.width > 100 { vm.swipe(quality: 5) }  // phải = biết
            if value.translation.width < -100 { vm.swipe(quality: 0) } // trái = quên
          }
        )
    }
  }
}
```

</details>

---

**Q: Codable — serialize Vocabulary từ API response thế nào?**

<details><summary>Đáp án</summary>

Tương đương Dart `fromJson`/`toJson` hoặc Freezed. Swift tự generate code nếu field names khớp.

```swift
// Tương đương Vocabulary entity trong Flutter
struct Vocabulary: Codable, Identifiable {
  let id: Int
  let kana: String
  let kanji: String?
  let meaning: String
  let romaji: String
  let lessonNumber: Int

  // Nếu API trả snake_case, tự map
  enum CodingKeys: String, CodingKey {
    case id, kana, kanji, meaning, romaji
    case lessonNumber = "lesson_number"
  }
}

// Decode — tương đương Vocabulary.fromJson() trong Flutter
let vocabs = try JSONDecoder().decode([Vocabulary].self, from: responseData)
```

</details>

<!-- nav:start -->

---

## Đi tiếp

Tài liệu tham khảo thuộc **13. Phỏng vấn**. Cùng nhóm:

- [interview-questions.md](./interview-questions.md) — Bộ câu hỏi Senior chung
- [interview-nestjs-mqtt-db.md](./interview-nestjs-mqtt-db.md) — Backend NestJS, MQTT, DB
- [interview-devops.md](./interview-devops.md) — DevOps: Kubernetes (probe, rolling update, HPA, securityContext), pipeline CI/CD và deploy thật, monitoring — 19 câu
- [interview-docker.md](./interview-docker.md) — Docker: 25 câu từ Junior tới Senior, đáp án bằng compose/Dockerfile của project (có sự cố `.env` trong image)
- [interview-web.md](./interview-web.md) — Web: React, Next.js, JavaScript/TypeScript, HTTP, webpack — 25 câu, đáp án theo code nihongo-web
- [interview-infra-cloud.md](./interview-infra-cloud.md) — Hạ tầng và cloud: nginx, Terraform, AWS/LocalStack/serverless, GCP, k6, xử lý sự cố
- [interview-backend-security.md](./interview-backend-security.md) — Bảo mật API (OWASP), thanh toán chống trùng, outbox, timeout, retry, circuit breaker
- [interview-mobile.md](./interview-mobile.md) — Senior Mobile
- [interview-android.md](./interview-android.md) — Android: câu hỏi theo code nihongo-android, gồm cả Framework, Binder, Automotive
- [interview-java-dsa.md](./interview-java-dsa.md) — Java, OOP và 10 bài thuật toán gắn với app (lời giải Java đã chạy), kế hoạch luyện bài test lập trình
- [interview-react-native-senior.md](./interview-react-native-senior.md) — Senior React Native

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
