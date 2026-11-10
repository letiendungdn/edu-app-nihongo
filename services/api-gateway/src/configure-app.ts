import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AllExceptionsFilter, ResponseInterceptor } from "@app/common";
import { bodyLimitMiddleware } from "./body-limit.middleware";

/**
 * Mọi cấu hình HTTP của gateway nằm ngoài AppModule (middleware Express, pipe/interceptor/filter global…).
 * main.ts và test e2e cùng gọi hàm này. Trước đây e2e tự chép lại một bản thiếu `forbidNonWhitelisted`,
 * body limit, helmet: test pass với request mà production trả 400/413.
 */
export function configureApp(app: NestExpressApplication): void {
  // Gateway đứng sau đúng MỘT proxy (nginx, hoặc Ingress trên K8s). Không bật thì req.ip là IP của
  // nginx với MỌI người dùng: throttler (120 request/phút theo IP) bị chia chung cho cả hệ thống.
  // Giá trị 1 = chỉ tin một lớp proxy: lấy IP mà nginx thấy, client không giả được qua X-Forwarded-For.
  app.set("trust proxy", 1);
  // Chặn body > 1 MB theo Content-Length TRƯỚC khi parse, trừ route soạn nội dung (xem body-limit.middleware.ts)
  app.use(bodyLimitMiddleware);
  // Route soạn nội dung gửi ảnh data URL — parser cho phép tới 8 MB
  app.useBodyParser("json", { limit: "8mb" });
  // Webhook LiveKit gửi Content-Type application/webhook+json (parser trên chỉ nhận application/json)
  app.useBodyParser("json", { type: "application/webhook+json" });

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
  // API không dùng camera/micro/vị trí: tắt hẳn cho trang Swagger và mọi response (OWASP ZAP 10063)
  app.use(
    (
      _req: unknown,
      res: { setHeader(name: string, value: string): void },
      next: () => void,
    ) => {
      res.setHeader(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=()",
      );
      next();
    },
  );

  const allowedOrigins =
    app.get(ConfigService).get<string[]>("cors.origins") ?? [];
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
}
