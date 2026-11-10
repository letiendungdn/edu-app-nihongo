# Học NestJS qua chính code của project

Bài này đi qua NestJS bằng code đang chạy trong repo, không dùng ví dụ bịa. Mỗi mục có:

- **Khái niệm**: Nest làm gì, chạy lúc nào.
- **Code thật**: trích từ file, kèm link để mở xem đầy đủ.
- **Bẫy**: chỗ dễ hiểu sai hoặc dễ viết sai.

Thứ tự pipeline ở mục 4 không chép từ tài liệu. Nó được đo bằng một app Nest 11 nhỏ chạy thật, cùng phiên bản với project.

Mục lục:

1. [Bản đồ: NestJS nằm ở đâu trong repo](#1-bản-đồ-nestjs-nằm-ở-đâu-trong-repo)
2. [Khởi động app: `main.ts` từng dòng](#2-khởi-động-app-maints-từng-dòng)
3. [Module và Dependency Injection](#3-module-và-dependency-injection)
4. [Pipeline của một request (đã đo)](#4-pipeline-của-một-request-đã-đo)
5. [Guard: xác thực, phân quyền, chặn spam](#5-guard-xác-thực-phân-quyền-chặn-spam)
6. [Custom decorator và metadata](#6-custom-decorator-và-metadata)
7. [Pipe và DTO: kiểm dữ liệu vào](#7-pipe-và-dto-kiểm-dữ-liệu-vào)
8. [Interceptor: bọc response, đo, ghi audit](#8-interceptor-bọc-response-đo-ghi-audit)
9. [Exception filter: một định dạng lỗi cho cả API](#9-exception-filter-một-định-dạng-lỗi-cho-cả-api)
10. [Middleware](#10-middleware)
11. [Vòng đời: init và tắt gọn](#11-vòng-đời-init-và-tắt-gọn)
12. [Microservice gRPC: gateway gọi content/exam](#12-microservice-grpc-gateway-gọi-contentexam)
13. [CQRS trong exam-service](#13-cqrs-trong-exam-service)
14. [Việc chạy nền: `@Cron` nhiều pod và BullMQ](#14-việc-chạy-nền-cron-nhiều-pod-và-bullmq)
15. [WebSocket gateway (signaling-service)](#15-websocket-gateway-signaling-service)
16. [Config](#16-config)
17. [Test](#17-test)
18. [Bảng bẫy hay gặp](#18-bảng-bẫy-hay-gặp)
19. [Bài tập](#19-bài-tập)
20. [Tự kiểm tra](#20-tự-kiểm-tra)

---

## 1. Bản đồ: NestJS nằm ở đâu trong repo

```
services/                     ← một Nest monorepo (nest-cli.json "monorepo": true)
  api-gateway/                ← HTTP (Express). Cửa duy nhất cho web/mobile.
  content-service/            ← gRPC microservice: bài học, từ vựng, kanji…
  exam-service/               ← gRPC microservice: đề thi thử, tiến độ; dùng CQRS + Kafka
  payment-service/            ← Stripe, booking, payout
  signaling-service/          ← WebSocket (socket.io) cho gọi video/presence
packages/
  nest-common/   → @app/common     guard, decorator, interceptor, filter, Redis, mail, gRPC client
  nest-prisma/   → @app/prisma     PrismaService, SRS, claimCronRun
  nest-contracts/→ @app/contracts  DTO dùng chung, tên pattern, file .proto
```

Có ba kiểu app Nest, khởi động khác nhau:

| Kiểu | Tạo bằng | Ví dụ | Nhận request qua |
|---|---|---|---|
| HTTP | `NestFactory.create(AppModule)` | api-gateway | `@Controller` + `@Get/@Post` |
| Microservice | `NestFactory.createMicroservice(Module, { transport: GRPC })` | content-service, exam-service | `@GrpcMethod` |
| WebSocket | `@WebSocketGateway` bên trong app HTTP | signaling-service | `@SubscribeMessage` |

Alias `@app/common`, `@app/prisma`, `@app/contracts` khai báo trong `paths` của tsconfig và trong `moduleNameMapper` của Jest ([services/test/jest-e2e.json](../services/test/jest-e2e.json)). Thêm package mới mà quên một trong hai chỗ thì build chạy nhưng test lỗi "Cannot find module", hoặc ngược lại.

---

## 2. Khởi động app: `main.ts` từng dòng

File: [services/api-gateway/src/main.ts](../services/api-gateway/src/main.ts)

```ts
import "./instrument";   // Sentry
import "./tracing";      // OpenTelemetry
```

Hai import này **phải đứng đầu**. OpenTelemetry tự đo bằng cách vá (monkey-patch) `http`, `express`, `pg`… lúc chúng được `require`. Import sau Nest thì module đã nạp xong, không vá được nữa, trace sẽ trống.

```ts
const startupWatchdog = setTimeout(() => process.exit(1), STARTUP_TIMEOUT_MS);
```

Nest khởi tạo module **tuần tự** và chờ từng `onModuleInit`. Nếu Postgres hoặc Kafka chưa lên, `onModuleInit` có thể treo mãi: tiến trình không chết, cổng 3000 không mở, nginx trả 502. Watchdog buộc thoát để Docker/K8s khởi động lại. Khi `listen` xong thì `clearTimeout`.

```ts
const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  bufferLogs: true,   // giữ log lúc khởi động, đợi useLogger(Pino) rồi mới in
  rawBody: true,      // giữ body gốc (Buffer): cần để kiểm chữ ký webhook Stripe/LiveKit
});
```

`NestFactory.create` là lúc Nest **quét module, dựng cây DI và gọi `onModuleInit`**. Các provider `APP_GUARD`/`APP_INTERCEPTOR` được đăng ký ngay ở bước này.

```ts
app.set("trust proxy", 1);
```

Gateway đứng sau nginx. Không có dòng này thì `req.ip` của **mọi** người dùng là IP của nginx, và giới hạn 120 request/phút theo IP thành giới hạn chung cho cả hệ thống. Giá trị `1` nghĩa là chỉ tin một lớp proxy, nên client không giả IP được bằng cách tự gửi `X-Forwarded-For`.

```ts
app.use(bodyLimitMiddleware);                          // chặn sớm theo Content-Length
app.useBodyParser("json", { limit: "8mb" });
app.useBodyParser("json", { type: "application/webhook+json" });
app.enableShutdownHooks();                             // nghe SIGTERM → gọi onModuleDestroy…
app.useLogger(app.get(PinoLogger));
app.use(cookieParser());
app.use(helmet({ … }));
app.enableCors({ origin: (origin, cb) => … });
```

Mọi `app.use(...)` là **middleware Express**: chạy trước toàn bộ thế giới Nest (guard, pipe…), theo đúng thứ tự gọi `use`.

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
app.useGlobalFilters(new AllExceptionsFilter());
```

Ba dòng này đăng ký global **bằng instance tự `new`**, nằm **ngoài** DI. Vì vậy phải tự truyền `Reflector` vào. Muốn class global được inject dependency thì đăng ký bằng `APP_*` trong module (mục 3.5).

Microservice khởi động gọn hơn ([content-service/src/main.ts](../services/content-service/src/main.ts)):

```ts
const app = await NestFactory.createMicroservice<MicroserviceOptions>(ContentModule, {
  transport: Transport.GRPC,
  options: { package: GRPC_PACKAGES.content, protoPath: CONTENT_PROTO_PATH, url: `${host}:${port}` },
});
app.enableShutdownHooks();
await app.listen();
```

Microservice không có HTTP. Nó không có Express middleware, CORS hay helmet, và cũng **không có ValidationPipe global**. Dữ liệu chỉ được kiểm ở gateway (mục 7.4).

---

## 3. Module và Dependency Injection

### 3.1 DI hoạt động thế nào

```ts
@Injectable()
export class PushScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}
}
```

Khi biên dịch với `emitDecoratorMetadata`, TypeScript ghi kiểu của tham số constructor (`[PrismaService, PushService]`) vào metadata `design:paramtypes`. Nest đọc metadata đó, tìm provider có **token** trùng (ở đây token chính là class), tạo nếu chưa có, rồi truyền vào. Mặc định mỗi provider là **singleton** trong cả app.

**Bẫy `import type`:** metadata chỉ ghi được giá trị tồn tại lúc chạy. Viết `import type { PushService }` thì TypeScript xóa import, metadata thành `Object` và Nest báo *"can't resolve dependencies… at index [1]"*. Kiểu dùng làm token inject phải import thường.

Ngược lại, [sliding-window.guard.ts](../packages/nest-common/src/rate-limit/sliding-window.guard.ts) dùng `import type Redis` mà vẫn chạy. Lý do là nó inject bằng **token chuỗi**, không dựa vào kiểu:

```ts
@Inject(REDIS_CLIENT) private readonly redis: Redis,
```

### 3.2 Bốn cách khai báo provider (đều có trong repo)

| Cách | Ví dụ thật | Dùng khi |
|---|---|---|
| Class | `providers: [AuthService]` | Trường hợp thường |
| `useFactory` + `inject` | `REDIS_CLIENT` trong [redis.module.ts](../packages/nest-common/src/redis/redis.module.ts) | Tạo object của thư viện ngoài (ioredis), cần config |
| `useClass` | `{ provide: AuditService, useClass: NoopAuditService }` trong [app.module.ts](../services/api-gateway/src/app.module.ts) | Thay bản cài đặt theo điều kiện |
| `useExisting` | `{ provide: "CONTENT_SERVICE", useExisting: ContentGrpcClient }` trong [microservices.module.ts](../services/api-gateway/src/microservices/microservices.module.ts) | Đặt thêm một tên (alias) cho provider đã có |

```ts
// redis.module.ts
@Global()
@Module({
  imports: [ConfigModule],
  providers: [{
    provide: REDIS_CLIENT,                         // token là chuỗi
    inject: [ConfigService],                       // dependency của factory
    useFactory: (config: ConfigService) => new Redis(config.get('redis.url') ?? …),
  }],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

`useExisting` khác `useClass`. `useExisting` trỏ về **cùng instance**, còn `useClass` tạo instance mới. Controller inject `"CONTENT_SERVICE"` và nhận đúng `ContentGrpcClient` singleton, không phát sinh client thứ hai.

### 3.3 `exports`, `imports` và `@Global`

Provider chỉ thấy được trong module của nó. Module khác muốn dùng thì cần đủ hai điều: module chủ **export** provider, và module dùng **import** module chủ (import module, không import service).

`@Global()` bỏ bước import: export của module global dùng được ở mọi nơi. Repo dùng cho những thứ hạ tầng ai cũng cần: `PrismaModule`, `RedisModule`, `MicroservicesModule`. Đừng lạm dụng, vì global khiến khó nhìn ra module nào phụ thuộc vào cái gì.

### 3.4 Dynamic module: `forRoot`, `forRootAsync`, `registerAsync`

Module cần cấu hình thì có hàm static trả về module đã cấu hình:

```ts
ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),   // cấu hình tĩnh
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
BullModule.forRootAsync({                                           // cấu hình cần provider khác
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({ connection: { url: config.get('redis.url') } }),
}),
```

Quy ước đặt tên: `forRoot` cấu hình một lần ở root module, `forFeature` đăng ký thêm ở module con (`MongooseModule.forFeature` trong [audit.module.ts](../packages/nest-common/src/audit/audit.module.ts)), `register` dùng cho mỗi lần import có thể khác nhau. Bản `…Async` dùng khi giá trị cấu hình phải lấy từ một provider (thường là `ConfigService`).

### 3.5 Module theo điều kiện: bật/tắt MongoDB

[app.module.ts](../services/api-gateway/src/app.module.ts) bật audit log khi có MongoDB và tắt êm khi không có:

```ts
imports: [
  ...(mongoEnabled ? [MongooseModule.forRootAsync({…})] : []),
  ...(mongoEnabled ? [AuditModule] : []),
],
providers: [
  ...(mongoEnabled ? [] : [{ provide: AuditService, useClass: NoopAuditService }]),
  { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },   // luôn có
],
```

`AuditInterceptor` luôn cần một `AuditService`. Khi tắt Mongo, `NoopAuditService` đứng vào đúng token đó. Interceptor không cần biết gì, và không có `if (mongoEnabled)` rải khắp code. Đây là Null Object pattern làm bằng DI.

Có hai cách đăng ký global, và chúng khác nhau quan trọng:

| | `app.useGlobalInterceptors(new X())` | `{ provide: APP_INTERCEPTOR, useClass: X }` |
|---|---|---|
| Ai tạo instance | Bạn tự `new` | Nest DI |
| Inject dependency | Không, phải tự truyền | Có (`AuditInterceptor` nhận `AuditService`) |
| Có trong `Test.createTestingModule({ imports: [AppModule] })` | **Không**, test phải tự gọi lại | Có, tự theo AppModule |

### 3.6 Phụ thuộc vòng: `forwardRef`

Ví dụ thật: [email-broadcast.processor.ts](../services/api-gateway/src/email-template/email-broadcast.processor.ts) inject `EmailTemplateService`, còn `EmailTemplateService` đẩy job vào queue mà processor xử lý. Hai bên cần nhau nên phải dùng:

```ts
@Inject(forwardRef(() => EmailTemplateService))
private readonly emailTemplateService: EmailTemplateService,
```

`forwardRef` hoãn việc đọc class đến khi cả hai đã được định nghĩa. Nó là thuốc giảm đau, không chữa bệnh. Vòng phụ thuộc thường là dấu hiệu nên tách phần dùng chung ra service thứ ba.

### 3.7 Scope

| Scope | Số instance | Chi phí |
|---|---|---|
| `DEFAULT` (singleton) | 1 cho cả app | Không |
| `REQUEST` | 1 mỗi request | Tạo lại **cả chuỗi** phụ thuộc vào nó mỗi request |
| `TRANSIENT` | 1 mỗi chỗ inject | Thấp |

Repo không dùng `Scope.REQUEST`, và đó là có chủ ý. Cần thông tin của request thì truyền qua tham số (`@CurrentUser()`) thay vì inject `REQUEST`. Một provider request-scoped làm mọi thứ inject nó cũng thành request-scoped, chậm và khó đoán.

---

## 4. Pipeline của một request (đã đo)

Để có thứ tự này, mình dựng app Nest 11 có đúng cấu trúc của gateway: hai `APP_GUARD`, một guard ở controller, hai `APP_INTERCEPTOR`, một `useGlobalInterceptors`, một interceptor ở route, một pipe và một filter. Sau đó gọi thật 3 lần.

**Request bình thường:**

```
middleware(app.use)                      ← Express: helmet, cors, bodyLimit, cookieParser
guard: APP_GUARD #1 (JwtAuthGuard)       ← guard global, theo thứ tự khai báo trong providers
guard: APP_GUARD #2 (ThrottlerGuard)
guard: controller-level (@UseGuards)     ← rồi guard của controller, rồi của method
interceptor before: APP_INTERCEPTOR HttpMetrics
interceptor before: APP_INTERCEPTOR Audit
interceptor before: useGlobalInterceptors Response
interceptor before: route-level
pipe                                     ← ValidationPipe, ParseIntPipe… ngay trước handler
handler
interceptor after: route-level           ← chiều ra NGƯỢC chiều vào (như củ hành)
interceptor after: Response              ← bọc { success, data, timestamp }
interceptor after: Audit
interceptor after: HttpMetrics
```

**Guard ném lỗi** (`?deny=1`):

```
middleware(app.use)
guard: APP_GUARD #1  → throw UnauthorizedException
filter                                   ← nhảy thẳng tới filter
```

Không interceptor nào chạy, kể cả phần "before". Hệ quả thật trong repo:

- `AuditInterceptor` **không bao giờ** ghi lại lần đăng nhập sai token. Muốn audit 401 thì phải ghi ở filter hoặc trong guard.
- `HttpMetricsInterceptor` cũng không thấy 401/403 từ guard, nên metric `http_requests_total{status="401"}` thiếu các lần này.
- ThrottlerGuard đứng **sau** JwtAuthGuard. Request không có token bị 401 trước khi kịp đếm, nên ThrottlerGuard không bảo vệ trước việc spam request không token. Route công khai vẫn được đếm vì `@Public()` cho qua JwtAuthGuard.

**Handler ném lỗi** (`?x=boom`):

```
… guard, interceptor before, pipe, handler (throw)
interceptor error: route-level → Response → Audit → HttpMetrics
filter
```

Lỗi đi ngược qua interceptor dưới dạng **error của Observable**. `tap({ error })` hoặc `catchError` thấy được lỗi, rồi filter mới định dạng response.

Thứ tự interceptor global là: các `APP_INTERCEPTOR` theo thứ tự trong `providers`, **rồi mới** tới các `useGlobalInterceptors`. `APP_*` được đăng ký lúc `NestFactory.create`, còn `useGlobal*` gọi sau trong `main.ts`.

---

## 5. Guard: xác thực, phân quyền, chặn spam

Guard trả lời đúng một câu: *request này có được vào handler không?* Nó trả `true`/`false` (`false` thành 403) hoặc ném exception.

### 5.1 `JwtAuthGuard`: Passport cộng `@Public()`

[jwt-auth.guard.ts](../packages/nest-common/src/auth/jwt-auth.guard.ts):

```ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),   // metadata trên method
      context.getClass(),     // metadata trên controller
    ]);
    if (isPublic) return true;
    return super.canActivate(context);   // giao cho Passport
  }
}
```

Guard này không tự verify JWT. `AuthGuard('jwt')` của `@nestjs/passport` gọi strategy tên `'jwt'`, tức [jwt.strategy.ts](../services/api-gateway/src/auth/jwt.strategy.ts):

```ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {   // tên mặc định 'jwt'
  constructor(private prisma: PrismaService, configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(configService),
    });
  }

  async validate(payload: JwtPayload) {           // chỉ chạy khi chữ ký và hạn đều hợp lệ
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, name: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;                                  // Passport gán vào req.user
  }
}
```

Luồng đầy đủ:

```
JwtAuthGuard.canActivate
  └─ @Public()? → true
  └─ AuthGuard('jwt') → passport-jwt
        ├─ lấy "Bearer xxx" từ header
        ├─ kiểm chữ ký + exp bằng secret      (sai → 401, validate không chạy)
        └─ JwtStrategy.validate(payload)       (1 query DB)
              └─ return user → req.user = user
```

`validate` tra DB nên user bị xóa sẽ mất quyền ngay, dù token còn hạn. Đổi lại, **mỗi request có token tốn 1 query**. Role cũng lấy từ DB chứ không tin role trong token, nên hạ quyền một người có hiệu lực ngay.

Đăng ký global trong [app.module.ts](../services/api-gateway/src/app.module.ts):

```ts
{ provide: APP_GUARD, useClass: JwtAuthGuard },
{ provide: APP_GUARD, useClass: ThrottlerGuard },
```

Mặc định là **đóng**: mọi route cần đăng nhập, trừ route được đánh dấu `@Public()`. Quên đánh dấu thì route bị khóa, chứ không bị mở toang. Đây là hướng an toàn.

### 5.2 Bẫy có thật: JwtAuthGuard chạy hai lần

Vì `JwtAuthGuard` đã global, đoạn sau trong [lessons.controller.ts](../services/api-gateway/src/http/lessons.controller.ts) làm nó chạy **lần thứ hai**:

```ts
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)   // JwtAuthGuard ở đây là thừa
@Roles(Role.ADMIN)
create(@Body() dto: CreateLessonDto) { … }
```

Phép đo ở mục 4 cho thấy `guard:Auth#1` (global) rồi `guard:Auth#2` (controller). Mỗi lần là một lần `JwtStrategy.validate`, tức **2 query `user.findUnique` cho một request**. Hiện có 82 chỗ như vậy trong 28 file của gateway.

Cách sửa: chỉ giữ `@UseGuards(RolesGuard)`. Bài tập 1 ở mục 19 hướng dẫn làm và kiểm.

### 5.3 `OptionalJwtAuthGuard`: khách cũng được, có token thì nhận diện

[optional-jwt-auth.guard.ts](../packages/nest-common/src/auth/optional-jwt-auth.guard.ts) dùng cho route mà khách vào được, nhưng nếu đã đăng nhập thì lưu kết quả theo user (nộp đề thi thử, feature flag):

```ts
canActivate(context) {
  const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
  if (!token) { request.user = null; return true; }   // khách
  return super.canActivate(context);
}
handleRequest(err, user) {
  if (err || !user) return null;   // token hỏng → coi như khách, KHÔNG ném 401
  return user;
}
```

`handleRequest` là hook của Passport. Bản mặc định ném 401 khi lỗi, bản này nuốt lỗi và trả `null`.

Cách dùng đúng phải có **cả hai** decorator ([mock-exams.controller.ts](../services/api-gateway/src/http/mock-exams.controller.ts)):

```ts
@Post(":examId/submit")
@Public()                          // cho qua JwtAuthGuard global
@UseGuards(OptionalJwtAuthGuard)   // rồi tự nhận diện nếu có token
```

Thiếu `@Public()` thì guard global chặn khách trước khi `OptionalJwtAuthGuard` kịp chạy.

### 5.4 `RolesGuard`

[roles.guard.ts](../packages/nest-common/src/auth/roles.guard.ts):

```ts
canActivate(context) {
  const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
    context.getHandler(), context.getClass(),
  ]);
  if (!requiredRoles?.length) return true;          // route không yêu cầu role
  const { user } = context.switchToHttp().getRequest<AuthRequest>();
  return user != null && requiredRoles.includes(user.role);   // false → 403
}
```

`RolesGuard` **phải chạy sau** guard gán `req.user`. Global guard luôn chạy trước guard của controller nên điều kiện này được bảo đảm.

### 5.5 Hai lớp chặn spam

| | `ThrottlerGuard` (`@nestjs/throttler`) | `SlidingWindowRateLimitGuard` (tự viết) |
|---|---|---|
| Phạm vi | Global, mọi route | Chỉ `AuthController` (`@UseGuards` ở class) |
| Cấu hình | `ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])`; ghi đè bằng `@Throttle(...)` | `@RateLimit(limit, windowSec)` |
| Lưu đếm | Bộ nhớ của từng pod | Redis, chung mọi pod |
| Thuật toán | Cửa sổ cố định | Cửa sổ trượt (sorted set) |

Trên route đăng ký ([auth.controller.ts](../services/api-gateway/src/auth/auth.controller.ts)), cả hai cùng áp dụng:

```ts
@Public()
@RateLimit(3, 3600)                               // 3 lần/giờ/IP, đếm chung mọi pod
@Throttle({ default: { ttl: 60_000, limit: 5 } }) // 5 lần/phút/IP/pod, chặn dồn dập
@Post("register")
```

Throttler lưu trong RAM nên với 2 pod, giới hạn thật gần gấp đôi. Cái cần chính xác (đăng ký, quên mật khẩu) phải dựa vào bản Redis.

[sliding-window.guard.ts](../packages/nest-common/src/rate-limit/sliding-window.guard.ts) chạy bốn lệnh trong một pipeline:

```ts
pipe.zremrangebyscore(key, 0, now - window);      // 1. bỏ các lần đã ra khỏi cửa sổ
pipe.zcard(key);                                  // 2. đếm số lần CÒN trong cửa sổ (trước lần này)
pipe.zadd(key, now, `${now}-${Math.random()}`);   // 3. ghi lần này
pipe.expire(key, config.windowSec + 1);           // 4. key tự xóa khi hết dùng
const count = results[1][1];                      // kết quả của lệnh 2
if (count >= config.limit) throw 429;
```

Ba chi tiết đáng để ý:

- **Member có `Math.random()`.** Sorted set không chứa trùng member. Hai request cùng mili-giây với member `"${now}"` sẽ chỉ tính là một.
- **Đếm trước rồi mới ghi.** `count` là số lần *trước* request này, nên so sánh bằng `>=`.
- **Lần bị từ chối vẫn được ghi.** Kẻ spam liên tục thì cửa sổ không bao giờ trống và bị chặn mãi. Người dùng thật bấm nhầm thêm một lần cũng phải chờ lâu hơn. Đây là đánh đổi có chủ ý.

So với `INCR` + `EXPIRE` (cửa sổ cố định): gửi 3 lần lúc 00:59 và 3 lần lúc 01:00 thì 6 request lọt trong 2 giây. Cửa sổ trượt luôn đếm đúng N giây gần nhất.

### 5.6 Guard cho service gọi nội bộ

[internal-token.guard.ts](../services/api-gateway/src/insights/internal-token.guard.ts) cho Airflow gọi gateway bằng token dùng chung:

```ts
const expected = process.env.INTERNAL_API_TOKEN ?? "";
if (expected.length < 16) throw new ServiceUnavailableException(…);   // chưa cấu hình → đóng
if (typeof given !== "string" || !safeEqual(given, expected)) throw new UnauthorizedException(…);
```

Hai nguyên tắc:

- **Chưa cấu hình thì từ chối hết.** Nếu viết `if (!expected) return true`, môi trường quên đặt biến sẽ mở cửa cho mọi người.
- **So sánh hằng thời gian (`timingSafeEqual`).** `===` dừng ở ký tự sai đầu tiên. Đo thời gian phản hồi có thể dò ra token từng ký tự.

---

## 6. Custom decorator và metadata

Có hai loại decorator tự viết trong repo.

### 6.1 Decorator gắn metadata (`SetMetadata`)

```ts
// public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// roles.decorator.ts
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// rate-limit.decorator.ts
export const RateLimit = (limit: number, windowSec: number) => SetMetadata(RATE_LIMIT_KEY, { limit, windowSec });

// raw-response.decorator.ts
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
```

Decorator chỉ **dán nhãn** lên method hoặc class. Nó không tự làm gì. Guard hoặc interceptor đọc nhãn bằng `Reflector`:

| Hàm | Đọc ở đâu | Dùng khi |
|---|---|---|
| `reflector.get(KEY, ctx.getHandler())` | Chỉ method | Nhãn chỉ có nghĩa ở method (`@RateLimit`) |
| `reflector.getAllAndOverride(KEY, [handler, class])` | Method trước, không có thì lấy class | Method ghi đè class (`@Public`, `@Roles`) |
| `reflector.getAllAndMerge(KEY, [handler, class])` | Gộp cả hai thành mảng | Cộng dồn (role của class cộng role của method) |

Bẫy: `SlidingWindowRateLimitGuard` dùng `reflector.get(…, ctx.getHandler())`. Đặt `@RateLimit` ở **class** thì guard không thấy và không giới hạn gì cả.

### 6.2 Decorator lấy tham số (`createParamDecorator`)

[current-user.decorator.ts](../packages/nest-common/src/auth/current-user.decorator.ts):

```ts
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUserPayload => {
    const user = ctx.switchToHttp().getRequest<AuthRequest>().user;
    if (!user) throw new UnauthorizedException('Authenticated user not found');
    return user;
  },
);

// dùng:
@Get("me")
me(@CurrentUser() user: AuthUserPayload) { … }
```

Lợi ích so với `@Req() req` rồi `req.user`:

- Handler có kiểu rõ ràng.
- Không phụ thuộc Express.
- Lỡ dùng trên route `@Public()` thì báo 401 rõ ràng, thay vì `user` là `undefined` và nổ ở dòng sau.

`_data` là đối số truyền vào decorator, ví dụ `@CurrentUser('id')`. Bản của repo bỏ qua nó: luôn trả cả object user.

### 6.3 Gộp decorator: `applyDecorators`

Route admin lặp lại 3 dòng ở nhiều chỗ:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
```

Có thể gộp thành một decorator:

```ts
export const AdminOnly = () => applyDecorators(UseGuards(RolesGuard), Roles(Role.ADMIN), ApiBearerAuth());
```

Bài tập 2 làm việc này.

---

## 7. Pipe và DTO: kiểm dữ liệu vào

### 7.1 `ValidationPipe` global

```ts
new ValidationPipe({
  whitelist: true,              // xóa field không có decorator trong DTO
  forbidNonWhitelisted: true,   // …và thay vì xóa thì báo 400
  transform: true,              // biến plain object thành instance DTO; ép kiểu theo khai báo
})
```

Với `{ "email": "a@b.c", "password": "12345678", "role": "ADMIN" }` gửi tới `/api/auth/register`:

- `whitelist` không có `forbid…`: `role` bị xóa âm thầm.
- Có `forbidNonWhitelisted` (như repo): trả 400 *"property role should not exist"*.

Đây là lớp chặn **mass assignment**: client tự thêm `role`, `isVerified`, `credits`… vào body.

### 7.2 DTO

[register.dto.ts](../services/api-gateway/src/auth/dto/register.dto.ts):

```ts
export class RegisterDto {
  @ApiProperty() @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8)
  password: string;
}
```

DTO **phải là class**, không được là `interface` hay `type`. Interface biến mất khi biên dịch nên ValidationPipe không còn gì để kiểm.

`@ApiProperty` dành cho Swagger, còn `@Is…` dành cho validation. Hai bộ decorator độc lập nhau.

DTO dùng chung giữa gateway và service nằm ở [packages/nest-contracts/src/dto](../packages/nest-contracts/src/dto/).

### 7.3 Bẫy: kiểu inline không được kiểm

[mock-exams.controller.ts](../services/api-gateway/src/http/mock-exams.controller.ts):

```ts
submit(@Body() body: { answers: Record<string, string> }, …)
```

Kiểu `{ answers: … }` viết inline nên metadata chỉ là `Object`. ValidationPipe thấy `Object` thì **bỏ qua hoàn toàn**: `whitelist` và `forbidNonWhitelisted` đều không áp dụng, và `answers` có thể là bất cứ thứ gì. Muốn kiểm thì tạo class DTO.

### 7.4 Microservice không có ValidationPipe

Gateway kiểm DTO xong mới gửi sang content-service qua gRPC dưới dạng JSON. Ở đầu kia, `handleGrpcDispatch` chỉ `JSON.parse` rồi gọi handler, không kiểm lại. Như vậy service con tin hoàn toàn vào gateway.

Cổng gRPC chỉ mở trong mạng nội bộ: mạng Docker Compose, hoặc Service `ClusterIP` trên K8s. Nhưng repo **chưa có NetworkPolicy**, nên bất kỳ pod nào trong cluster cũng gọi thẳng được content-service và bỏ qua mọi kiểm tra của gateway. Cần thêm NetworkPolicy chỉ cho gateway vào cổng gRPC, hoặc thêm validation ở phía service.

### 7.5 Pipe có sẵn cho tham số

```ts
@Get(":id")
findOne(@Param("id", ParseIntPipe) id: number) { … }   // "abc" → 400 thay vì NaN đi xuống DB
```

Có `transform: true` thì `@Param('id') id: number` cũng được ép kiểu. Nhưng `"abc"` sẽ thành `NaN` chứ không báo lỗi. `ParseIntPipe` chặt hơn.

---

## 8. Interceptor: bọc response, đo, ghi audit

Interceptor bao quanh handler như một lớp vỏ:

```ts
intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
  // code ở đây chạy TRƯỚC handler
  return next.handle().pipe(
    // operator ở đây chạy SAU handler, trên giá trị/lỗi nó trả về
  );
}
```

`next.handle()` trả về một **Observable** chứa kết quả của handler (Nest tự bọc Promise thành Observable). Không gọi `next.handle()` thì handler không chạy, đây là cách làm cache.

| Operator | Dùng để | Ví dụ trong repo |
|---|---|---|
| `map` | Đổi giá trị trả về | `ResponseInterceptor` |
| `tap({ next, error })` | Làm việc phụ, không đổi giá trị | `HttpMetricsInterceptor` |
| `catchError` | Bắt lỗi; phải ném lại hoặc trả giá trị khác | `AuditInterceptor` |
| `timeout` | Giới hạn thời gian | `GrpcDispatchClient` |

### 8.1 `ResponseInterceptor`: bọc mọi response

[response.interceptor.ts](../packages/nest-common/src/interceptors/response.interceptor.ts):

```ts
return next.handle().pipe(
  map((data) => {
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [handler, class]);
    if (isRaw) return data;
    return { success: true, data, timestamp: new Date().toISOString() };
  }),
);
```

Mọi API trả `{ success: true, data: …, timestamp }`. Riêng `/metrics` đánh dấu `@RawResponse()` vì Prometheus cần text thô.

Bẫy: route dùng `@Res()` (không có `passthrough: true`) thì tự ghi response, và interceptor không bọc được. Route auth dùng `@Res({ passthrough: true })` để vừa set cookie vừa giữ interceptor.

### 8.2 `HttpMetricsInterceptor`: đo cho Prometheus

[http-metrics.interceptor.ts](../services/api-gateway/src/metrics/http-metrics.interceptor.ts):

```ts
if (context.getType() !== "http") return next.handle();   // bỏ qua ws/rpc

const route = routeLabel(req);   // "/api/lessons/:lessonNumber", KHÔNG phải "/api/lessons/12"
const endTimer = this.histogram.startTimer({ method, route });
return next.handle().pipe(
  tap({
    next: () => record(String(res.statusCode)),
    error: (err) => record(String(err?.status ?? err?.statusCode ?? 500)),
  }),
);
```

- **Nhãn là mẫu route, không phải URL thật.** Mỗi giá trị nhãn khác nhau là một time series trong Prometheus. URL thật có id thì mỗi bài học sinh một series, gọi là bùng nổ cardinality.
- `@InjectMetric("http_requests_total")` lấy metric khai báo bằng `makeCounterProvider` trong `app.module.ts`. Đây vẫn là DI với token chuỗi.

### 8.3 `AuditInterceptor`: ghi lại ai làm gì

[audit.interceptor.ts](../packages/nest-common/src/audit/audit.interceptor.ts):

```ts
const user = req.user;
if (!user) return next.handle();          // khách: không audit

return next.handle().pipe(
  tap(() => { void this.auditService.log({ …, success: true }); }),
  catchError((err: Error) => {
    void this.auditService.log({ …, success: false, errorMessage: err.message });
    return throwError(() => err);         // BẮT BUỘC ném lại
  }),
);
```

- **`void this.auditService.log(...)`** là ghi kiểu bắn rồi quên. Response không phải chờ MongoDB, và `void` cho ESLint biết bỏ Promise ở đây là cố ý. Bên trong `AuditService.log` còn `.catch(() => {})`, nên Mongo chết cũng không làm hỏng request.
- **`catchError` phải `throwError` lại.** Nếu `return of(null)` thì lỗi bị nuốt: client nhận `200 { data: null }` thay vì 404/500.
- **Tại sao không `subscribe()` trong interceptor?** `subscribe` khởi chạy handler thêm một lần nữa (Observable lạnh). Handler sẽ chạy hai lần, ví dụ tạo hai bài học. Chỉ dùng operator trong `.pipe()`.
- **Interceptor này không thấy 401/403 từ guard** (đã đo ở mục 4).

---

## 9. Exception filter: một định dạng lỗi cho cả API

### 9.1 `AllExceptionsFilter`

[all-exceptions.filter.ts](../packages/nest-common/src/filters/all-exceptions.filter.ts) có `@Catch()` để trống, tức bắt **mọi thứ**:

```
exception
 ├─ HttpException (NotFound, BadRequest, ThrottlerException…)
 │    → status = getStatus(); message lấy từ body (mảng lỗi validation thì nối bằng ", ")
 │    → 5xx thì gửi Sentry
 ├─ lỗi từ microservice ({ statusCode, message } hoặc { status: 'error', message })
 │    → resolveMicroserviceError() đổi ra HTTP status
 ├─ Error thường (bug)          → 500, log stack, gửi Sentry
 └─ thứ khác (throw "chuỗi")    → 500, log, gửi Sentry
```

Mọi lỗi ra client đều cùng một dạng:

```json
{ "success": false, "error": { "code": "NOT_FOUND", "message": "…" }, "timestamp": "…", "path": "/api/…" }
```

Client (web, Android, iOS, Flutter) chỉ cần một hàm đọc lỗi.

### 9.2 Đổi lỗi microservice ra HTTP

[rpc-error.ts](../packages/nest-common/src/utils/rpc-error.ts) có một quyết định đáng học:

```ts
// 401/403 của API mình nghĩa là "token của BẠN không hợp lệ" → client sẽ refresh / đăng xuất.
// Lỗi xác thực của một dịch vụ khác (sai API key…) là lỗi phía server: không chuyển nguyên mã.
if (err.statusCode === 401 || err.statusCode === 403) {
  return { status: HttpStatus.BAD_GATEWAY, … };
}
```

Nếu gateway trả nguyên 401 khi Stripe từ chối API key, app mobile sẽ hiểu là token người dùng hết hạn và **đăng xuất người dùng**. Lỗi phía server phải trả mã 5xx.

### 9.3 Filter phía microservice

[rpc-http-exception.filter.ts](../services/exam-service/src/filters/rpc-http-exception.filter.ts) đổi `HttpException` thành object `{ statusCode, message }` để gửi qua gRPC:

```ts
@Catch(HttpException)
export class RpcHttpExceptionFilter extends BaseRpcExceptionFilter {
  override catch(exception: HttpException): Observable<never> {
    return throwError(() => ({ statusCode: exception.getStatus(), message }));
  }
}
```

Filter của microservice trả về **Observable**, không ghi vào `response` như HTTP. Thực tế filter này hiếm khi được gọi. `handleGrpcDispatch` đã `try/catch` mọi lỗi và đóng vào trường `error` của message (mục 12), nên lỗi gần như không bao giờ thoát ra tới tầng filter.

---

## 10. Middleware

Repo dùng middleware dạng **hàm Express** đăng ký bằng `app.use`. Ví dụ [body-limit.middleware.ts](../services/api-gateway/src/body-limit.middleware.ts):

```ts
export function bodyLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const length = Number(req.headers["content-length"] ?? 0);
  if (length > DEFAULT_BODY_LIMIT_BYTES && !allowsLargeBody(req.path)) {
    res.status(413).json({ success: false, error: { code: "PAYLOAD_TOO_LARGE", … } });
    return;                       // không gọi next() → dừng tại đây
  }
  next();
}
```

Middleware chạy **trước** khi body được parse. Vì vậy nó chặn được body 8 MB chỉ dựa vào header, không phải đọc 8 MB vào RAM. Guard và pipe chạy sau khi body đã parse xong, quá muộn cho việc này.

Cách thứ hai của Nest là middleware dạng class, đăng ký trong module:

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BodyLimitMiddleware).forRoutes('api/*');
  }
}
```

| | `app.use(fn)` | `consumer.apply(Class)` |
|---|---|---|
| Inject dependency | Không | Có (`@Injectable`) |
| Chọn route | Tự kiểm `req.path` | `forRoutes` / `exclude` |
| Có trong e2e test (`imports: [AppModule]`) | **Không**, phải gọi lại | Có |

Middleware **không biết handler nào sẽ chạy**: không có `ExecutionContext`, không đọc được `@Public()`. Việc cần biết route đích (phân quyền) thì làm bằng guard.

---

## 11. Vòng đời: init và tắt gọn

```
Khởi động                            Tắt (SIGTERM, cần enableShutdownHooks)
─────────                            ──────────────────────────────────────
constructor (DI)                     onModuleDestroy()
onModuleInit()        ← await        beforeApplicationShutdown(signal)
onApplicationBootstrap()             (đóng server HTTP/gRPC)
app.listen()                         onApplicationShutdown(signal)
```

Ví dụ trong repo:

| Class | Hook | Làm gì |
|---|---|---|
| [PrismaService](../packages/nest-prisma/src/prisma.service.ts) | `onModuleInit` | `$connect()`: lỗi DB lộ ra ngay lúc khởi động, không đợi request đầu |
| [GrpcDispatchClient](../packages/nest-common/src/grpc/grpc-dispatch.client.ts) | `onModuleInit` | `getService()`: client gRPC chỉ sẵn sàng sau khi module init |
| `ContentMsController`, `ExamMsController` | `onModuleInit` | Dựng bảng `routes` (pattern → hàm) |
| `KafkaProducerService`, `MqttBus`, `PushService` | `onModuleDestroy` | Đóng kết nối Kafka/MQTT/APNs |

- **Không có `enableShutdownHooks()`** thì SIGTERM giết tiến trình ngay, và không hook tắt nào chạy. K8s gửi SIGTERM ở mỗi lần rolling update, nên request đang dở bị cắt ngang và message Kafka chưa flush bị mất.
- **Không làm việc async trong constructor.** Constructor không `await` được. Việc cần chờ (kết nối, nạp dữ liệu) đặt trong `onModuleInit`.
- `PrismaService` chỉ có `onModuleInit`, không có `onModuleDestroy` để gọi `$disconnect()`. Pool kết nối chỉ đóng khi tiến trình thoát. Bài tập 5 bổ sung việc này.

---

## 12. Microservice gRPC: gateway gọi content/exam

### 12.1 Một RPC duy nhất: `Dispatch`

[content.proto](../packages/nest-contracts/proto/content.proto):

```proto
service ContentService {
  rpc Dispatch (DispatchRequest) returns (DispatchResponse);
}
message DispatchRequest  { string pattern = 1; string payload = 2; }   // payload là JSON
message DispatchResponse { string result  = 1; string error   = 2; }
```

Repo không khai báo mỗi chức năng một RPC có kiểu riêng. Nó dùng **một RPC chung** mang `pattern` (ví dụ `content.lessons.get`) và payload JSON. Đây là đánh đổi có chủ ý:

- ✅ Thêm chức năng không phải sửa `.proto` và sinh lại code. Code cũ dùng `ClientProxy.send(pattern, data)` (kiểu TCP của Nest) chuyển sang gRPC gần như không phải sửa.
- ❌ Mất cái hay nhất của gRPC: kiểu dữ liệu chặt chẽ và tương thích ngược do protobuf kiểm. Payload sai chỉ lộ ra lúc chạy.

### 12.2 Phía server

[content.ms.controller.ts](../services/content-service/src/content.ms.controller.ts):

```ts
onModuleInit() {
  this.routes = {
    [CONTENT_PATTERNS.GET_LESSONS]: (data) => this.getLessons(data as {…}),
    …
  };
}

@GrpcMethod("ContentService", "Dispatch")
dispatch(data: GrpcDispatchRequest) {
  return handleGrpcDispatch(this.routes, data);
}
```

[dispatch.util.ts](../packages/nest-common/src/grpc/dispatch.util.ts) tra `routes[pattern]`, `JSON.parse` payload, gọi handler. Có lỗi thì **không ném** mà đóng lỗi thành chuỗi trong trường `error`:

- `HttpException` thành `{"statusCode":404,"message":"…"}`.
- `Error` thường chỉ còn `message`.

### 12.3 Phía client: hạn chót và circuit breaker

[microservices.module.ts](../services/api-gateway/src/microservices/microservices.module.ts) đăng ký client gRPC bằng `ClientsModule.registerAsync` và đặt tên `"CONTENT_SERVICE"`. Controller dùng như sau:

```ts
constructor(@Inject("CONTENT_SERVICE") private readonly contentClient: ClientProxy) {}

findAll() {
  return firstValueFrom(this.contentClient.send(CONTENT_PATTERNS.GET_LESSONS, {…}));
}
```

Bên dưới là [GrpcDispatchClient](../packages/nest-common/src/grpc/grpc-dispatch.client.ts):

```
send(pattern, data)
  ├─ breaker OPEN?                → ném { statusCode: 503 } ngay, không gọi
  ├─ dispatch(...).pipe(timeout(10s))
  │    ├─ quá hạn                 → breaker ghi lỗi, ném { statusCode: 504 }
  │    └─ mất kết nối…            → breaker ghi lỗi, ném lại
  ├─ response.error có giá trị
  │    ├─ 5xx / lỗi hạ tầng       → breaker ghi lỗi
  │    ├─ 4xx / "không tồn tại"   → breaker ghi THÀNH CÔNG (service vẫn sống)
  │    └─ ném { statusCode, message } → AllExceptionsFilter → HTTP
  └─ OK                           → JSON.parse(result)
```

- **Không có timeout** thì content-service treo kéo gateway treo theo. Request dồn lại, hết bộ nhớ, và gateway chết theo. Đây là lỗi lan truyền (cascading failure).
- **Circuit breaker** ([circuit-breaker.ts](../packages/nest-common/src/grpc/circuit-breaker.ts)): trong 20 lần gọi gần nhất, nếu từ 10 lần trở lên và lỗi ≥ 50% thì mở mạch 30 giây. Lúc mở, gateway trả 503 ngay thay vì chờ 10 giây mỗi request. Hết 30 giây thì cho **một** request thử (HALF_OPEN).
- **Lỗi nghiệp vụ không tính là service chết.** Nếu 404 cũng làm mở mạch, người dùng tìm bài học không tồn tại vài lần là cả hệ thống báo 503.

Đường đi của một lỗi 404, từ đầu tới cuối:

```
content-service: throw new NotFoundException("Bài học không tồn tại")
  → handleGrpcDispatch: { error: '{"statusCode":404,"message":"Bài học không tồn tại"}' }
  → gRPC
  → GrpcDispatchClient: toRpcError → throw { statusCode: 404, message }
  → controller: firstValueFrom ném lại
  → AllExceptionsFilter → resolveMicroserviceError → 404
  → client: { success:false, error:{ code:"NOT_FOUND", message:"Bài học không tồn tại" } }
```

---

## 13. CQRS trong exam-service

`@nestjs/cqrs` tách luồng **ghi** (Command) và luồng **đọc** (Query) thành các class riêng, đi qua bus thay vì gọi service trực tiếp.

```
ExamMsController
  └─ commandBus.execute(new SubmitExamCommand(examId, answers, userId))
        └─ SubmitExamHandler.execute()        ← @CommandHandler(SubmitExamCommand)
              ├─ mockExamsService.submit()    ← chấm điểm + ghi DB + ghi OutboxEvent (cùng transaction)
              └─ eventBus.publish(new ExamSubmittedEvent(…))
                    └─ các @EventsHandler(ExamSubmittedEvent) chạy (trong cùng tiến trình)
```

[submit-exam.handler.ts](../services/exam-service/src/modules/mock-exams/commands/submit-exam.handler.ts):

```ts
@CommandHandler(SubmitExamCommand)
export class SubmitExamHandler implements ICommandHandler<SubmitExamCommand> {
  constructor(private readonly mockExamsService: MockExamsService, private readonly eventBus: EventBus) {}

  async execute(command: SubmitExamCommand) {
    const result = await this.mockExamsService.submit(command.examId, command.answers, command.userId);
    this.eventBus.publish(new ExamSubmittedEvent({ … }));
    return result;
  }
}
```

Có hai loại "sự kiện", rất dễ nhầm:

| | `EventBus` (CQRS) | Kafka `edu.exam.submitted` |
|---|---|---|
| Phạm vi | Trong một tiến trình | Giữa các service |
| Mất khi crash | Có | Không: ghi vào bảng `OutboxEvent` **cùng transaction** với kết quả thi, rồi `OutboxRelayService` đẩy lên Kafka |

Comment trong handler giải thích lý do bản cũ bị bỏ: gửi Kafka ngay sau khi ghi DB thì nếu tiến trình chết ở giữa, DB có kết quả nhưng Kafka không có sự kiện. Đây là **Transactional Outbox** (xem [learn-kafka.md](./learn-kafka.md)).

Khi nào **không** nên dùng CQRS: CRUD đơn giản như content-service. Thêm Command + Handler + đăng ký cho mỗi thao tác chỉ tốn công. Repo chỉ dùng ở exam-service, nơi nộp bài kéo theo nhiều tác dụng phụ.

---

## 14. Việc chạy nền: `@Cron` nhiều pod và BullMQ

### 14.1 `@Cron` chạy ở **mọi** pod

[push.scheduler.ts](../services/api-gateway/src/push/push.scheduler.ts):

```ts
@Cron("0 9 * * *", { timeZone: "Asia/Ho_Chi_Minh" })
async sendDailyReminders() {
  if (!(await claimCronRun(this.prisma, "push.daily-srs", vietnamDate()))) return;
  …gửi thông báo…
}
```

`ScheduleModule.forRoot()` chạy cron **trong mỗi tiến trình**. Gateway có ít nhất 2 pod (HPA), nên thiếu dòng `claimCronRun` thì mỗi người dùng nhận 2 thông báo.

[claimCronRun](../packages/nest-prisma/src/cron-run.ts) ghi một dòng `(name, slot)` có khóa chính. Pod ghi được đầu tiên thì chạy, pod sau gặp lỗi P2002 (trùng khóa) thì bỏ qua.

Advisory lock **không đủ**. Pod A chạy xong trong 2 giây rồi nhả khóa, pod B nổ trễ 300 ms vẫn lấy được khóa và chạy lại. Cần ghi nhớ "lượt này **đã** chạy", không chỉ "đang chạy".

### 14.2 BullMQ: hàng đợi job bền

Việc nặng hoặc cần thử lại (gửi email hàng loạt) được đưa vào queue Redis, rồi worker xử lý ([email-broadcast.processor.ts](../services/api-gateway/src/email-template/email-broadcast.processor.ts)):

```ts
@Processor(EMAIL_BROADCAST_QUEUE)
export class EmailBroadcastProcessor extends WorkerHost {
  async process(job: Job<SendTemplateJobData | ComposeJobData>) {
    if (job.name === "send-template") …
    else if (job.name === "compose") …
  }
}
```

| | `@Cron` | BullMQ |
|---|---|---|
| Kích hoạt | Theo giờ | Khi có job được thêm vào |
| Nhiều pod | Pod nào cũng chạy, phải tự khóa | Redis giao mỗi job cho **đúng một** worker |
| Pod chết giữa chừng | Mất lượt | Job quay lại queue, worker khác làm |
| Thử lại | Tự viết | `attempts`, `backoff` có sẵn |

---

## 15. WebSocket gateway (signaling-service)

[signaling.gateway.ts](../services/signaling-service/src/signaling/signaling.gateway.ts):

```ts
@WebSocketGateway({ cors: {…}, namespace: "/signal" })
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    const payload = token ? verifyWsToken(token) : null;
    if (!payload) { client.disconnect(); return; }    // tự kiểm, không dùng guard
    client.data.userId = payload.sub;
    …
  }
}
```

**Bẫy quan trọng nhất của WebSocket trong Nest: guard không chạy ở `handleConnection`.** `@UseGuards(WsJwtGuard)` chỉ áp dụng cho các handler `@SubscribeMessage`. Vì vậy `handleConnection` phải tự kiểm token và `disconnect()`. Nếu không, ai cũng kết nối được và nhận sự kiện `presence-update` phát cho cả server.

[WsJwtGuard](../services/signaling-service/src/auth/ws-jwt.guard.ts) khác guard HTTP ở ba điểm:

- Dùng `context.switchToWs().getClient()` thay vì `switchToHttp().getRequest()`.
- Token nằm trong `client.handshake.auth.token`, không nằm ở header.
- Lưu user vào `client.data`. Nó sống suốt kết nối, không theo từng message như `req.user`.

`handleDisconnect` bọc `try/catch`. Lúc tắt app, socket ngắt **sau** khi Redis đã đóng. Không bắt lỗi thì thành unhandled rejection và tiến trình có thể sập giữa lúc đang tắt.

---

## 16. Config

```ts
ConfigModule.forRoot({ isGlobal: true, load: [configuration] })
```

[configuration.ts](../packages/nest-common/src/config/configuration.ts) gom biến môi trường thành object có cấu trúc. Code đọc bằng đường dẫn:

```ts
config.get<string>("redis.url")
config.get<string[]>("cors.origins")
```

- `config.get<T>()` **không kiểm kiểu**. `<number>` chỉ là lời hứa với TypeScript. `port` dùng `parseInt` ngay trong `configuration.ts` là vì vậy.
- **Giá trị mặc định cho secret rất nguy hiểm.** `jwt.secret` mặc định là `'change-me-in-production'`, và chuỗi này nằm công khai trong repo. [jwt-secret.ts](../services/api-gateway/src/auth/jwt-secret.ts) chặn: ở production mà secret thiếu hoặc là giá trị mặc định thì **không khởi động**. Thà sập lúc deploy còn hơn chạy với secret ai cũng biết, vì khi đó ai cũng tự ký được token admin.
- Cách chặt hơn là `ConfigModule.forRoot({ validationSchema })` (Joi) hoặc `validate` (class-validator): thiếu biến bắt buộc thì app dừng ngay khi khởi động. Repo chưa làm. Đây là bài tập 6.

---

## 17. Test

### 17.1 Unit test: thay dependency bằng mock

[auth.service.spec.ts](../services/api-gateway/src/auth/auth.service.spec.ts):

```ts
const module: TestingModule = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: PrismaService, useValue: prisma },      // object có jest.fn()
    { provide: JwtService, useValue: jwtService },
    { provide: ConfigService, useValue: { get: jest.fn() } },
    { provide: MailService, useValue: { … } },
  ],
}).compile();
service = module.get(AuthService);
```

`Test.createTestingModule` dựng một module DI nhỏ. `useValue` thay provider thật bằng mock theo **cùng token**, và `AuthService` không biết mình đang chạy trong test.

Test guard hoặc interceptor không cần module. Tự tạo `ExecutionContext` giả:

```ts
const ctx = {
  getHandler: () => handler,
  getClass: () => Controller,
  switchToHttp: () => ({ getRequest: () => ({ user: { role: 'ADMIN' } }) }),
} as unknown as ExecutionContext;

expect(new RolesGuard(reflector).canActivate(ctx)).toBe(true);
```

Test interceptor thì truyền `next` trả về `of(value)` hoặc `throwError(() => err)`, rồi kiểm Observable kết quả bằng `lastValueFrom`.

### 17.2 E2E: dựng cả app

[app.e2e-spec.ts](../services/test/app.e2e-spec.ts):

```ts
const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
app = moduleFixture.createNestApplication();
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
app.useGlobalFilters(new AllExceptionsFilter());
await app.init();
```

**Bẫy có thật:** `useGlobal*` và `app.use` nằm trong `main.ts`, không nằm trong `AppModule`, nên test phải chép lại. Và bản chép đã **lệch**:

- E2E thiếu `forbidNonWhitelisted: true`. Request có field lạ được 201 trong test nhưng 400 trên production.
- E2E thiếu `bodyLimitMiddleware`, `helmet`, `trust proxy`.

Cách chữa: tách `configureApp(app)` dùng chung cho `main.ts` và test (bài tập 4).

Ghi đè guard trong e2e khi cần:

```ts
Test.createTestingModule({ imports: [AppModule] })
  .overrideGuard(ThrottlerGuard).useValue({ canActivate: () => true })
  .overrideProvider(PrismaService).useValue(prismaMock)
```

---

## 18. Bảng bẫy hay gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| *"Nest can't resolve dependencies of X (?, Y)"* | Provider chưa có trong module, chưa được export, hoặc import bằng `import type` | Thêm vào `providers`, `exports`/`imports`; bỏ `type` |
| Route mới luôn 401 | `JwtAuthGuard` global, quên `@Public()` | Thêm `@Public()` nếu route thật sự công khai |
| `req.user` là `undefined` trong `RolesGuard` | Guard gán user chạy sau, hoặc route `@Public()` | Đặt guard xác thực trước; route có role thì không `@Public()` |
| Mỗi request có token tốn 2 query user | `@UseGuards(JwtAuthGuard)` lặp lại guard global | Bỏ `JwtAuthGuard` khỏi `@UseGuards` |
| Field lạ lọt vào DB | DTO là `interface`/kiểu inline | Dùng class có decorator `class-validator` |
| `@RateLimit` đặt ở class không có tác dụng | Guard đọc bằng `reflector.get(…, getHandler())` | Đặt ở method, hoặc sửa guard dùng `getAllAndOverride` |
| Response không được bọc `{success,data}` | Dùng `@Res()` không `passthrough` | `@Res({ passthrough: true })` |
| Handler chạy 2 lần | `subscribe()` trong interceptor | Chỉ dùng operator trong `pipe()` |
| Lỗi bị nuốt, client nhận 200 | `catchError` trả `of(...)` | `return throwError(() => err)` |
| Cron chạy 2 lần | Nhiều pod | `claimCronRun` hoặc chuyển sang BullMQ |
| Rolling update làm mất request | Thiếu `enableShutdownHooks()` | Gọi trong `main.ts`; đóng kết nối ở `onModuleDestroy` |
| Test pass nhưng production 400 | E2E tự cấu hình pipe khác `main.ts` | Dùng chung `configureApp()` |
| Trace OpenTelemetry trống | `import "./tracing"` không đứng đầu | Đưa lên dòng đầu `main.ts` |
| Ai cũng kết nối được WebSocket | Tin rằng `@UseGuards` bảo vệ `handleConnection` | Tự kiểm token trong `handleConnection` |

---

## 19. Bài tập

Mỗi bài dựa trên code thật và có cách tự kiểm. Làm trên một branch riêng.

**1. Bỏ JwtAuthGuard chạy hai lần.**
Trong [services/api-gateway/src](../services/api-gateway/src/), đổi `@UseGuards(JwtAuthGuard, RolesGuard)` thành `@UseGuards(RolesGuard)`. Chỗ nào chỉ có `@UseGuards(JwtAuthGuard)` thì xóa hẳn.
Kiểm: bật log query Prisma (`log: ['query']`), gọi một route admin, đếm số `SELECT … FROM "User"` trước (2) và sau (1). Chạy `npm test` trong `services/`.

**2. Viết `@AdminOnly()`** bằng `applyDecorators(UseGuards(RolesGuard), Roles(Role.ADMIN), ApiBearerAuth())`, đặt trong `packages/nest-common/src/auth/`, export ở `index.ts`, thay cho một controller.
Kiểm: gọi bằng token USER thì 403, token ADMIN thì 200.

**3. Audit cả lần bị 401/403.**
`AuditInterceptor` không thấy lỗi từ guard (mục 4). Ghi audit trong `AllExceptionsFilter` khi status là 401/403.
Gợi ý: filter global tạo bằng `new` nên không inject được. Chuyển sang `{ provide: APP_FILTER, useClass: AllExceptionsFilter }` để nhận `AuditService`.

**4. Tách `configureApp(app)`.**
Gom `trust proxy`, `bodyLimitMiddleware`, `helmet`, pipe, interceptor, filter vào một hàm. Gọi nó từ `main.ts` và [app.e2e-spec.ts](../services/test/app.e2e-spec.ts).
Kiểm: thêm test e2e gửi `{ email, password, role: "ADMIN" }` tới `/api/auth/register` phải nhận 400.

**5. `PrismaService` đóng kết nối khi tắt.**
Thêm `implements OnModuleDestroy` và `await this.$disconnect()`.
Kiểm: viết unit test gọi `app.close()` trên một `TestingModule` có `PrismaService` mock, rồi kiểm `$disconnect` được gọi đúng một lần.

**6. Kiểm biến môi trường khi khởi động.**
Thêm `validate` vào `ConfigModule.forRoot`: production thiếu `DATABASE_URL` hoặc `JWT_SECRET` thì báo rõ tên biến và dừng.

**7. DTO cho nộp bài thi.**
Thay `@Body() body: { answers: Record<string, string> }` trong [mock-exams.controller.ts](../services/api-gateway/src/http/mock-exams.controller.ts) bằng class `SubmitExamDto`.
Gợi ý: `@IsObject()`, và kiểm từng giá trị là chuỗi ngắn bằng một custom validator hoặc `@ValidateNested`.

**8. Thứ tự Throttler.**
Hiện ThrottlerGuard đứng sau JwtAuthGuard nên request thiếu token không bị đếm. Đảo thứ tự hai `APP_GUARD` rồi tự trả lời: có gì thay đổi với người dùng đã đăng nhập không, và với kẻ spam token rác thì sao?

---

## 20. Tự kiểm tra

Trả lời trước, rồi mở phần đáp án.

1. Guard ném `UnauthorizedException`. `HttpMetricsInterceptor` có ghi metric 401 không?
2. Tại sao `JwtStrategy.validate` lại tra DB, trong khi JWT đã có `sub`, `email`, `role`?
3. `@Public()` đặt ở controller, `@Roles(ADMIN)` đặt ở một method. Gọi method đó không có token thì sao?
4. Có `ResponseInterceptor` qua `useGlobalInterceptors` và `AuditInterceptor` qua `APP_INTERCEPTOR`. Lúc response đi ra, cái nào thấy giá trị **đã bọc** `{ success, data }`?
5. Vì sao `SlidingWindowRateLimitGuard` dùng `${now}-${Math.random()}` làm member?
6. Content-service trả 404 liên tục 20 lần. Circuit breaker có mở không?
7. Vì sao `bodyLimitMiddleware` là middleware mà không là guard?

<details>
<summary>Đáp án</summary>

1. **Không.** Guard ném thì interceptor không chạy, kể cả phần trước handler. Filter định dạng 401 nhưng không có metric.
2. Để user bị xóa hoặc đổi role mất quyền ngay, không phải đợi token hết hạn (15 phút). Cái giá là 1 query mỗi request.
3. `JwtAuthGuard` dùng `getAllAndOverride([handler, class])`. Method không có `@Public` thì lấy của class (`true`), nên cho qua. Sau đó `RolesGuard` thấy `user` là `undefined`, trả `false`, client nhận **403**. Route được "mở" nhưng không ai dùng được. Đừng đặt `@Public()` ở class có route cần quyền.
4. Thứ tự vào là Audit rồi Response; chiều ra ngược lại là Response rồi Audit. Vậy **Audit** thấy giá trị đã bọc. Audit chỉ dùng `tap()` không đọc giá trị nên không ảnh hưởng.
5. Sorted set không chứa member trùng. Hai request cùng mili-giây sẽ ghi đè nhau và chỉ tính là một.
6. **Không.** `isServiceFailure` coi 4xx là "service vẫn sống" và ghi thành công.
7. Middleware chạy **trước** khi body được parse, nên chặn được theo `Content-Length` mà không đọc body vào RAM. Guard chạy sau khi body đã được đọc xong.

</details>

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 1/8.

- **Bài tiếp: [redis.md](./redis.md)** — Redis dùng vào việc gì trong project

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
