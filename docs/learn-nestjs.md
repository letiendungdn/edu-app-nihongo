# Học NestJS Internals — Từ Project Này

## 1. Execution Pipeline — thứ tự chạy

Mỗi request HTTP đi qua pipeline theo thứ tự cố định:

```
Request
  │
  ▼
Middleware          (app.use — Express layer, không biết context NestJS)
  │
  ▼
Guard               (canActivate — auth, role check)
  │
  ▼
Interceptor (before) (transform request, log start time)
  │
  ▼
Pipe                (validate/transform DTO)
  │
  ▼
Controller Handler  (code trong @Get, @Post...)
  │
  ▼
Interceptor (after) (transform response, log duration)
  │
  ▼
Exception Filter    (bắt error, format response lỗi)
  │
  ▼
Response
```

**Câu hỏi tự test:** Nếu Guard throw UnauthorizedException, Interceptor (after) có chạy không?
→ Không. Guard throw trước khi vào interceptor → Exception Filter bắt.

---

## 2. Guard — JwtAuthGuard trong project

```typescript
// packages/nest-common/src/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Lấy token từ header
    const auth = request.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = auth.slice(7);
    try {
      // verify → decode → attach vào request
      const payload = this.jwtService.verify(token);
      request['user'] = payload;  // ← controller đọc từ đây
      return true;
    } catch {
      throw new UnauthorizedException('Token expired or invalid');
    }
  }
}
```

**Câu hỏi:** `request['user']` được set ở Guard, controller đọc bằng `@Req()`. Nhưng project dùng `@CurrentUser()` decorator — đó là gì?

```typescript
// Custom param decorator — đọc request.user
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);

// Dùng trong controller:
@Get('me')
getMe(@CurrentUser() user: JwtPayload) {
  return user;
}

// Hoặc chỉ lấy userId:
@Get('profile')
getProfile(@CurrentUser('sub') userId: number) { ... }
```

---

## 3. Interceptor — AuditInterceptor dùng tap()

```typescript
// packages/nest-common/src/interceptors/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectModel('AuditLog') private auditModel: Model<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const start = Date.now();

    // next.handle() = Observable của response
    return next.handle().pipe(
      tap({
        next: () => {
          // Chạy sau khi handler SUCCESS
          void this.auditModel.create({
            userId: request['user']?.sub,
            action: `${request.method} ${request.path}`,
            resource: request.path.split('/')[2],
            ip: request.ip,
            success: true,
            durationMs: Date.now() - start,
          });
        },
        error: (err) => {
          // Chạy sau khi handler THROW
          void this.auditModel.create({
            userId: request['user']?.sub,
            action: `${request.method} ${request.path}`,
            success: false,
            errorMessage: err.message,
            durationMs: Date.now() - start,
          });
        },
      }),
    );
  }
}
```

**Tại sao `tap()` chứ không phải `subscribe()`?**

```typescript
// ❌ SAI — subscribe() tiêu thụ Observable, downstream không nhận được gì
return next.handle().pipe(
  subscribe(data => this.log(data))  // ERROR: không return Observable
);

// ✅ ĐÚNG — tap() là side-effect operator, không modify stream
return next.handle().pipe(
  tap(data => this.log(data))  // Observable vẫn flow xuống client
);
```

**Tại sao `void this.auditModel.create()`?**

→ Không await để không block response. Audit log là fire-and-forget.
→ `void` để TypeScript không complain về unhandled Promise.

---

## 4. Dependency Injection — hiểu Module system

```typescript
// Module A export service
@Module({
  providers: [PaymentService],
  exports: [PaymentService],  // ← phải export mới dùng được ở module khác
})
export class PaymentModule {}

// Module B import và dùng
@Module({
  imports: [PaymentModule],   // ← import module, không phải service
  providers: [BookingService],
})
export class MarketplaceModule {
  // BookingService giờ có thể inject PaymentService
}
```

**Circular dependency — hay gặp, hay confuse:**

```typescript
// A inject B, B inject A → circular
// Giải pháp: forwardRef
@Injectable()
export class ServiceA {
  constructor(
    @Inject(forwardRef(() => ServiceB)) private serviceB: ServiceB
  ) {}
}

@Injectable()
export class ServiceB {
  constructor(
    @Inject(forwardRef(() => ServiceA)) private serviceA: ServiceA
  ) {}
}
```

**Scope của Provider:**

```typescript
// DEFAULT: Singleton — 1 instance cho toàn app
@Injectable()
export class PaymentService {}

// REQUEST: 1 instance mỗi request — dùng khi cần request context
@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  constructor(@Inject(REQUEST) private request: Request) {}
}

// TRANSIENT: mỗi lần inject tạo instance mới — ít dùng
@Injectable({ scope: Scope.TRANSIENT })
export class TempService {}
```

---

## 5. Rate Limit Guard — Redis Sliding Window

```typescript
// packages/nest-common/src/guards/rate-limit.guard.ts
@Injectable()
export class SlidingWindowRateLimitGuard implements CanActivate {
  constructor(private redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip;
    const key = `rl:${ip}:${context.getClass().name}:${context.getHandler().name}`;
    const now = Date.now();
    const windowMs = 60_000;  // 1 phút
    const maxRequests = 5;

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, now - windowMs);  // xóa entries cũ
    pipeline.zadd(key, now, `${now}`);                   // thêm request này
    pipeline.zcard(key);                                 // đếm trong window
    pipeline.expire(key, Math.ceil(windowMs / 1000));   // TTL cleanup
    const results = await pipeline.exec();

    const count = results?.[2]?.[1] as number;
    if (count > maxRequests) {
      throw new HttpException('Too Many Requests', 429);
    }
    return true;
  }
}
```

**Tại sao ZADD/ZREMRANGEBYSCORE tốt hơn INCR + TTL?**

```
INCR + TTL (Fixed Window):
  00:59 → 5 requests
  01:00 → counter reset → 5 requests nữa
  → Trong 2 giây: 10 requests — bypass limit!

ZADD Sliding Window:
  Luôn đếm đúng trong 60 giây trước hiện tại
  → Không có edge case ở boundary
```

---

## 6. Pipes — Validation + Transform

```typescript
// Global validation pipe (thường set trong main.ts)
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,        // xóa fields không có trong DTO
  forbidNonWhitelisted: true,  // throw nếu có field lạ
  transform: true,        // auto convert string → number, string → boolean
}));

// DTO với class-validator
export class CreateSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}

// transform: true → tự convert query params
// GET /items?page=1&limit=20
// page và limit là string từ URL → transform: true → number
export class PaginationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Max(100)
  limit: number = 20;
}
```

---

## 7. Exception Filters — format lỗi nhất quán

```typescript
// Global exception filter
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as { message: string }).message;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = 409;
        message = 'Duplicate entry';
      } else if (exception.code === 'P2025') {
        status = 404;
        message = 'Record not found';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Prisma error codes hay gặp:**

```
P2002 → Unique constraint violation (duplicate email, duplicate stripePaymentIntentId)
P2003 → Foreign key constraint (xóa User còn CoachingSession)
P2025 → Record not found (findUniqueOrThrow)
P2034 → Transaction conflict (retry needed)
```

---

## 8. WebSocket Guard (Socket.io)

```typescript
// Khác với HTTP guard: không có request/response
@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // switchToWs() thay vì switchToHttp()
    const client: Socket = context.switchToWs().getClient();

    // Token nằm trong handshake, không phải header
    const token = client.handshake.auth?.token;
    if (!token) throw new WsException('Unauthorized');

    try {
      const payload = this.jwtService.verify(token);
      client.data.user = payload;  // attach vào client.data thay vì request
      return true;
    } catch {
      throw new WsException('Token expired');
    }
  }
}
```

---

## 9. Testing Guards và Interceptors

```typescript
// Test JwtAuthGuard
describe('JwtAuthGuard', () => {
  it('should pass valid token', () => {
    const mockContext = createMockExecutionContext({
      headers: { authorization: 'Bearer valid.jwt.token' }
    });
    const guard = new JwtAuthGuard(mockJwtService);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw on missing token', () => {
    const mockContext = createMockExecutionContext({ headers: {} });
    const guard = new JwtAuthGuard(mockJwtService);
    expect(() => guard.canActivate(mockContext))
      .toThrow(UnauthorizedException);
  });
});

// Test AuditInterceptor
describe('AuditInterceptor', () => {
  it('should log successful request', async () => {
    const spy = jest.spyOn(auditModel, 'create');
    const next = { handle: () => of({ data: 'ok' }) };

    interceptor.intercept(mockContext, next as CallHandler).subscribe();
    await new Promise(r => setTimeout(r, 10));  // wait for tap

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});
```

---

## Bài tập thực hành

```
1. Thêm @Roles('ADMIN') decorator → RolesGuard check role từ JWT payload
   → Hint: dùng Reflector để đọc metadata từ decorator

2. Thêm ResponseTransformInterceptor: wrap mọi response thành
   { success: true, data: ..., timestamp: ... }

3. Viết ThrottleGuard với config per-route:
   @Throttle({ limit: 3, ttl: 3600 })
   POST /auth/register

4. Debug: tại sao AuditInterceptor không ghi log khi
   Guard throw UnauthorizedException?
   → Vẽ lại pipeline, chỉ ra execution stops ở đâu
```

<!-- nav:start -->

---

## Đi tiếp

Bạn đang ở **3. Backend (NestJS)** — bài 1/8.

- **Bài tiếp: [redis.md](./redis.md)** — Redis dùng vào việc gì trong project

Mục lục toàn bộ tài liệu: [docs/README.md](./README.md)

<!-- nav:end -->
