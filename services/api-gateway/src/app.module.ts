import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from "@willsoto/nestjs-prometheus";
import { AuditInterceptor } from "@app/common/audit/audit.interceptor";
import { AuditModule } from "@app/common/audit/audit.module";
import { AuditService } from "@app/common/audit/audit.service";
import configuration from "@app/common/config/configuration";
import { JwtAuthGuard } from "@app/common/auth/jwt-auth.guard";
import { MailModule } from "@app/common/mail/mail.module";
import { InsightsModule } from "./insights/insights.module";
import { pinoConfig } from "@app/common/logger/pino.config";
import { RedisModule } from "@app/common/redis/redis.module";
import { PrismaModule } from "@app/prisma";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { AdminModule } from "./admin/admin.module";
import { MicroservicesModule } from "./microservices/microservices.module";
import { HealthModule } from "./health/health.module";
import { HttpModule } from "./http/http.module";
import { RealtimeModule } from "./realtime/realtime.module";
import { AiModule } from "./ai/ai.module";
import { PushModule } from "./push/push.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { MailSchedulerModule } from "./mail-scheduler/mail-scheduler.module";
import { EmailTemplateModule } from "./email-template/email-template.module";
import { HttpMetricsInterceptor } from "./metrics/http-metrics.interceptor";
import { MetricsController } from "./metrics/metrics.controller";
import { LearningProgressModule } from "./learning-progress/learning-progress.module";

const mongoEnabled = !["false", "0", "off"].includes(
  process.env.MONGODB_ENABLED ?? "",
);

class NoopAuditService {
  log(): Promise<void> {
    return Promise.resolve();
  }
  findByUser(): Promise<never[]> {
    return Promise.resolve([]);
  }
  getStats(): Promise<never[]> {
    return Promise.resolve([]);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>("redis.url") ?? "redis://localhost:6379",
        },
      }),
    }),
    ...(mongoEnabled
      ? [
          MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              uri:
                config.get<string>("mongodb.url") ??
                process.env.MONGODB_URL ??
                "mongodb://localhost:27017/nihongo_audit",
            }),
          }),
        ]
      : []),
    LoggerModule.forRoot(pinoConfig),
    PrometheusModule.register({
      path: "/metrics",
      controller: MetricsController,
      defaultMetrics: { enabled: true },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    RedisModule,
    ...(mongoEnabled ? [AuditModule] : []),
    MailModule,
    InsightsModule,
    MicroservicesModule,
    PrismaModule,
    AuthModule,
    AdminModule,
    HealthModule,
    RealtimeModule,
    HttpModule,
    AiModule,
    PushModule,
    WebhooksModule,
    MailSchedulerModule,
    EmailTemplateModule,
    LearningProgressModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    makeCounterProvider({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status"],
    }),
    makeHistogramProvider({
      name: "http_request_duration_seconds",
      help: "HTTP request latency in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: HttpMetricsInterceptor },
    ...(mongoEnabled
      ? []
      : [{ provide: AuditService, useClass: NoopAuditService }]),
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
