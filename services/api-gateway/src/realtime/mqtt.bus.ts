import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { connect, type MqttClient } from "mqtt";
import {
  BehaviorSubject,
  EMPTY,
  Observable,
  Subject,
  type Subscription,
} from "rxjs";
import { filter } from "rxjs/operators";

type Inbound = { topic: string; payload: unknown };

/**
 * Kết nối Mosquitto. Không có MQTT_URL thì mọi publish/stream là no-op,
 * chat SSE vẫn chạy bằng Subject trong process.
 */
@Injectable()
export class MqttBus implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttBus.name);
  private client: MqttClient | null = null;
  private readonly inbound = new Subject<Inbound>();
  private readonly topicRefs = new Map<string, number>();
  /** Giá trị hiện tại được replay cho subscriber mới (SSE mở sau khi broker đã nối). */
  readonly connection$ = new BehaviorSubject<boolean>(false);
  private connected = false;

  onModuleInit() {
    const url = process.env.MQTT_URL;
    if (!url) {
      this.logger.log("MQTT_URL trống — bỏ qua broker");
      return;
    }

    this.client = connect(url, {
      clientId: `gateway-${process.pid}-${Math.random().toString(16).slice(2, 8)}`,
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
      reconnectPeriod: 2_000,
      connectTimeout: 5_000,
    });

    this.client.on("connect", () => {
      this.connected = true;
      this.connection$.next(true);
      for (const topic of this.topicRefs.keys()) {
        this.client?.subscribe(topic, { qos: 1 });
      }
      this.logger.log(`MQTT đã nối ${url}`);
    });

    this.client.on("close", () => {
      if (!this.connected) return;
      this.connected = false;
      this.connection$.next(false);
    });

    this.client.on("error", (error) => {
      this.logger.warn(`MQTT: ${error.message}`);
    });

    this.client.on("message", (topic, body) => {
      try {
        this.inbound.next({ topic, payload: JSON.parse(body.toString()) });
      } catch {
        this.logger.warn(`MQTT payload không phải JSON trên ${topic}`);
      }
    });
  }

  async onModuleDestroy() {
    this.inbound.complete();
    this.connection$.complete();
    await new Promise<void>((resolve) => {
      if (!this.client) {
        resolve();
        return;
      }
      this.client.end(false, {}, () => resolve());
    });
  }

  /** Lúc mất kết nối, mqtt.js tự giữ tin QoS 1 trong hàng đợi và gửi lại khi nối lại. */
  publish(topic: string, payload: unknown) {
    if (!this.client) return;
    this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
  }

  /** Stream payload của một topic. Nhiều subscriber dùng chung một lệnh subscribe. */
  stream<T>(topic: string): Observable<T> {
    if (!this.client) return EMPTY;
    return new Observable<T>((subscriber) => {
      this.retain(topic);
      const sub: Subscription = this.inbound
        .pipe(filter((message) => message.topic === topic))
        .subscribe({
          next: (message) => subscriber.next(message.payload as T),
          error: (error: unknown) => subscriber.error(error),
        });
      return () => {
        sub.unsubscribe();
        this.release(topic);
      };
    });
  }

  private retain(topic: string) {
    const next = (this.topicRefs.get(topic) ?? 0) + 1;
    this.topicRefs.set(topic, next);
    if (next === 1) this.client?.subscribe(topic, { qos: 1 });
  }

  private release(topic: string) {
    const next = (this.topicRefs.get(topic) ?? 1) - 1;
    if (next <= 0) {
      this.topicRefs.delete(topic);
      this.client?.unsubscribe(topic);
      return;
    }
    this.topicRefs.set(topic, next);
  }
}
