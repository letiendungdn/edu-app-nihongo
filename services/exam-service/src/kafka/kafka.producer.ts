import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Kafka, Producer } from "kafkajs";

export type KafkaMessage = { key?: string | null; value: string };

/**
 * Producer tự kết nối lại: Kafka chưa sẵn sàng lúc service khởi động KHÔNG còn làm
 * mọi event về sau bị bỏ (trước đây producer = null vĩnh viễn). `send` ném lỗi khi thất bại —
 * người gọi (OutboxRelayService) quyết định thử lại, không nuốt lỗi.
 */
@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;
  private readonly brokers: string[];
  private connected = false;
  private connecting: Promise<void> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.brokers = (
      this.configService.get<string>("kafka.brokers") ??
      process.env.KAFKA_BROKERS ??
      "localhost:9092"
    ).split(",");

    const kafka = new Kafka({
      clientId: "exam-service",
      brokers: this.brokers,
      retry: { initialRetryTime: 300, retries: 3 },
    });
    this.producer = kafka.producer();
    this.producer.on(this.producer.events.DISCONNECT, () => {
      this.connected = false;
    });
  }

  async onModuleInit() {
    try {
      await this.ensureConnected();
    } catch (error) {
      // Không chặn service khởi động: outbox giữ event, relay kết nối lại ở lần gửi sau
      this.logger.warn(
        `Kafka chưa sẵn sàng (${this.brokers.join(", ")}) — event nằm chờ trong outbox: ${String(error)}`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.connected) await this.producer.disconnect();
  }

  async send(topic: string, messages: KafkaMessage[]): Promise<void> {
    await this.ensureConnected();
    await this.producer.send({ topic, messages });
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) return;
    // Nhiều lời gọi cùng lúc dùng chung một lần kết nối
    this.connecting ??= this.producer
      .connect()
      .then(() => {
        this.connected = true;
        this.logger.log(
          `Kafka producer connected to ${this.brokers.join(", ")}`,
        );
      })
      .finally(() => {
        this.connecting = null;
      });
    await this.connecting;
  }
}
