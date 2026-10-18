import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { firstValueFrom, timeout } from "rxjs";
import { Public } from "@app/common";
import { CONTENT_PATTERNS, EXAM_PATTERNS } from "@app/contracts";
import { PrismaService } from "@app/prisma";

type Status = "up" | "down";
type HealthReport = {
  status: "ok" | "degraded";
  services: { database: Status; content: Status; exam: Status };
};

/**
 * - /health/live  : process còn sống — KHÔNG gọi DB/service khác (livenessProbe; fail → restart).
 * - /health/ready : đủ phụ thuộc để nhận request — 503 khi thiếu (readinessProbe; fail → rút khỏi LB).
 * - /health       : giữ như cũ (luôn 200 + chi tiết) cho người xem / script cũ.
 */
@ApiTags("health")
@Controller("health")
@Public()
@SkipThrottle()
export class HealthController {
  constructor(
    private prisma: PrismaService,
    @Inject("CONTENT_SERVICE") private contentClient: ClientProxy,
    @Inject("EXAM_SERVICE") private examClient: ClientProxy,
  ) {}

  @Get()
  @ApiOperation({ summary: "Health check — DB + microservices (luôn 200)" })
  check(): Promise<HealthReport> {
    return this.report();
  }

  @Get("live")
  @ApiOperation({ summary: "Liveness — process còn phản hồi" })
  live() {
    return { status: "ok" };
  }

  @Get("ready")
  @ApiOperation({
    summary: "Readiness — 503 khi DB hoặc microservice không sẵn sàng",
  })
  async ready(): Promise<HealthReport> {
    const report = await this.report();
    if (report.status !== "ok") throw new ServiceUnavailableException(report);
    return report;
  }

  private async report(): Promise<HealthReport> {
    const [database, content, exam] = await Promise.all([
      this.probe(() => this.prisma.$queryRaw`SELECT 1`),
      this.probe(() =>
        firstValueFrom(
          this.contentClient
            .send(CONTENT_PATTERNS.GET_LESSONS, {})
            .pipe(timeout(3000)),
        ),
      ),
      this.probe(() =>
        firstValueFrom(
          this.examClient
            .send(EXAM_PATTERNS.LIST_TEMPLATES, {})
            .pipe(timeout(3000)),
        ),
      ),
    ]);
    const status =
      database === "up" && content === "up" && exam === "up"
        ? "ok"
        : "degraded";
    return { status, services: { database, content, exam } };
  }

  private async probe(fn: () => Promise<unknown>): Promise<Status> {
    try {
      await fn();
      return "up";
    } catch {
      return "down";
    }
  }
}
