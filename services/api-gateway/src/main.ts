import "./instrument";
import "./tracing";
import { Logger, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger as PinoLogger } from "nestjs-pino";
import { AllExceptionsFilter, ResponseInterceptor } from "@app/common";
import { AppModule } from "./app.module";
import { bodyLimitMiddleware } from "./body-limit.middleware";

// Khi Docker Desktop khởi động lại, gateway có thể lên trước khi Postgres/Kafka hồi phục xong và treo
// ở bước init mà không chết → không bao giờ mở cổng 3000, nginx trả 502 mãi. Quá hạn thì thoát để
// restart policy (unless-stopped) khởi động lại khi các dịch vụ phụ thuộc đã sẵn sàng.
const STARTUP_TIMEOUT_MS = Number(process.env.STARTUP_TIMEOUT_MS ?? 180_000);
const startupWatchdog = setTimeout(() => {
  console.error(
    `API Gateway chưa mở cổng sau ${STARTUP_TIMEOUT_MS / 1000}s — thoát để Docker khởi động lại`,
  );
  process.exit(1);
}, STARTUP_TIMEOUT_MS);

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  // Chặn body > 1 MB theo Content-Length TRƯỚC khi parse, trừ route soạn nội dung (xem body-limit.middleware.ts)
  app.use(bodyLimitMiddleware);
  // Route soạn nội dung gửi ảnh data URL — parser cho phép tới 8 MB
  app.useBodyParser("json", { limit: "8mb" });
  // Webhook LiveKit gửi Content-Type application/webhook+json (parser trên chỉ nhận application/json)
  app.useBodyParser("json", { type: "application/webhook+json" });
  // SIGTERM (K8s rolling update) → đóng server, Prisma, Kafka gọn gàng thay vì cắt ngang request
  app.enableShutdownHooks();
  app.useLogger(app.get(PinoLogger));
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");

  app.use(cookieParser());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }),
  );

  const allowedOrigins = configService.get<string[]>("cors.origins") ?? [];
  const isProduction = process.env.NODE_ENV === "production";
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // Mọi cổng localhost chỉ được phép khi dev — production chỉ dùng danh sách cors.origins
      if (!isProduction && /^http:\/\/localhost(:\d+)?$/.test(origin))
        return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Origin lạ: không gắn header CORS → trình duyệt tự chặn. Không ném lỗi (trước đây thành 500,
      // làm bẩn log lỗi và metric 5xx vì một request hoàn toàn bình thường từ trang khác).
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Nihongo Learn API")
    .setDescription("Japanese learning app API — API Gateway")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = configService.get<number>("port") ?? 3000;
  await app.listen(port);
  clearTimeout(startupWatchdog);
  logger.log(`API Gateway: http://localhost:${port}`);
  logger.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error("API Gateway khởi động thất bại", err);
  process.exit(1);
});
