import "./instrument";
import "./tracing";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger as PinoLogger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { configureApp } from "./configure-app";

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
  // SIGTERM (K8s rolling update) → đóng server, Prisma, Kafka gọn gàng thay vì cắt ngang request
  app.enableShutdownHooks();
  app.useLogger(app.get(PinoLogger));
  const configService = app.get(ConfigService);
  const logger = new Logger("Bootstrap");
  const isProduction = process.env.NODE_ENV === "production";

  // Middleware, CORS, pipe/interceptor/filter global — dùng chung với test e2e
  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Nihongo Learn API")
    .setDescription("Japanese learning app API — API Gateway")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  // Bảo mật: production mặc định KHÔNG mở Swagger — lộ toàn bộ danh sách API cho người lạ dò.
  // Bật lại bằng ENABLE_SWAGGER=true (docker-compose trên máy dev đã bật).
  const swaggerEnabled =
    (process.env.ENABLE_SWAGGER ?? (isProduction ? "false" : "true")) ===
    "true";
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>("port") ?? 3000;
  await app.listen(port);
  clearTimeout(startupWatchdog);
  logger.log(`API Gateway: http://localhost:${port}`);
  if (swaggerEnabled) logger.log(`Swagger: http://localhost:${port}/api/docs`);
}

bootstrap().catch((err) => {
  console.error("API Gateway khởi động thất bại", err);
  process.exit(1);
});
