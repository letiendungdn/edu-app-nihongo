import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Consumer, EachMessagePayload, Kafka } from "kafkajs";
import { KafkaTopics } from "@app/contracts";
import { KafkaProducerService } from "./kafka.producer";
import {
  ExamSubmittedMessage,
  PROGRESS_UPDATER,
  ProgressUpdater,
} from "./progress-updater";

export const EXAM_SUBMITTED_DLQ = `${KafkaTopics.EXAM_SUBMITTED}.dlq`;
const MAX_HANDLE_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 10_000;
const RETRY_BASE_DELAY_MS = Number(
  process.env.EXAM_CONSUMER_RETRY_DELAY_MS ?? 500,
);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Đọc edu.exam.submitted (consumer group "progress-updater") và giao cho ProgressUpdater.
 * - Kafka chưa sẵn sàng: thử kết nối lại nền, không chặn service khởi động.
 * - Message lỗi sau 3 lần thử → đẩy sang topic DLQ rồi đi tiếp (không để một message hỏng chặn cả partition).
 */
@Injectable()
export class ExamEventsConsumer
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(ExamEventsConsumer.name);
  private consumer: Consumer | null = null;
  private stopped = false;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly updater: ProgressUpdater,
    private readonly producer: KafkaProducerService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.EXAM_CONSUMER_DISABLED === "true") return;
    void this.start();
  }

  async onModuleDestroy() {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    await this.consumer?.disconnect().catch(() => undefined);
  }

  private async start(): Promise<void> {
    const brokers = (
      this.config.get<string>("kafka.brokers") ??
      process.env.KAFKA_BROKERS ??
      "localhost:9092"
    ).split(",");
    const consumer = new Kafka({
      clientId: `exam-service-${PROGRESS_UPDATER}`,
      brokers,
    }).consumer({
      groupId: PROGRESS_UPDATER,
    });
    this.consumer = consumer;
    consumer.on(consumer.events.CRASH, ({ payload }) => {
      if (!payload.restart)
        this.scheduleRestart(`consumer crash: ${String(payload.error)}`);
    });
    try {
      await consumer.connect();
      // fromBeginning chỉ có tác dụng khi group chưa commit offset nào → không bỏ sót event cũ; event trùng đã idempotent
      await consumer.subscribe({
        topic: KafkaTopics.EXAM_SUBMITTED,
        fromBeginning: true,
      });
      await consumer.run({ eachMessage: (p) => this.onMessage(p) });
      this.logger.log(
        `Consumer "${PROGRESS_UPDATER}" đang đọc ${KafkaTopics.EXAM_SUBMITTED}`,
      );
    } catch (error) {
      await consumer.disconnect().catch(() => undefined);
      this.scheduleRestart(String(error));
    }
  }

  private scheduleRestart(reason: string) {
    if (this.stopped) return;
    this.logger.warn(
      `Consumer chưa chạy (${reason}) — thử lại sau ${RECONNECT_DELAY_MS / 1000}s`,
    );
    this.retryTimer = setTimeout(() => void this.start(), RECONNECT_DELAY_MS);
  }

  async onMessage({
    topic,
    partition,
    message,
  }: EachMessagePayload): Promise<void> {
    const raw = message.value?.toString() ?? "";
    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_HANDLE_ATTEMPTS; attempt += 1) {
      try {
        await this.updater.handle(JSON.parse(raw) as ExamSubmittedMessage);
        return;
      } catch (error) {
        lastError = error;
        if (error instanceof SyntaxError) break; // JSON hỏng: thử lại vô ích
        // Lỗi tạm thời (DB chập chờn) → chờ tăng dần trước lần thử sau
        if (attempt < MAX_HANDLE_ATTEMPTS)
          await sleep(RETRY_BASE_DELAY_MS * attempt);
      }
    }
    this.logger.error(
      `Message ${topic}[${partition}]@${message.offset} lỗi sau ${MAX_HANDLE_ATTEMPTS} lần → DLQ: ${String(lastError)}`,
    );
    // Nếu gửi DLQ cũng lỗi thì ném ra → kafkajs không commit offset và thử lại message này sau
    await this.producer.send(EXAM_SUBMITTED_DLQ, [
      { key: message.key?.toString() ?? null, value: raw },
    ]);
  }
}
