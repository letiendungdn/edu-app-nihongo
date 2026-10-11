import { Injectable } from "@nestjs/common";
import {
  Observable,
  Subject,
  distinct,
  interval,
  merge,
  switchMap,
} from "rxjs";
import { filter, map } from "rxjs/operators";
import { MqttBus } from "./mqtt.bus";

export type ChatEventType = "support" | "community" | "session";

export interface ChatEvent {
  type: ChatEventType;
  roomId: number;
  message: unknown;
}

/** distinct giữ key trong một Set; xóa Set định kỳ để kết nối SSE mở lâu không phình bộ nhớ. */
const DEDUPE_WINDOW_MS = 60_000;

export function chatEventKey(event: ChatEvent): string {
  const message = event.message as { id?: number | string } | null;
  const id = message && typeof message === "object" ? message.id : undefined;
  return `${event.type}:${event.roomId}:${id ?? JSON.stringify(event.message)}`;
}

@Injectable()
export class ChatEventsService {
  private readonly subject = new Subject<ChatEvent>();

  constructor(private readonly mqtt: MqttBus) {}

  emit(event: ChatEvent) {
    this.subject.next(event);
    this.mqtt.publish(`chat/${event.type}/${event.roomId}`, event);
  }

  /** Fan-out tới app đang subscribe `user/{id}/notify`. */
  notifyUsers(userIds: number[], payload: unknown) {
    for (const userId of userIds) {
      this.mqtt.publish(`user/${userId}/notify`, payload);
    }
  }

  /**
   * Gộp tin trong process và tin từ broker.
   * switchMap hủy subscription cũ mỗi lần MQTT lên/xuống.
   * distinct bỏ bản echo QoS 1 của chính pod vừa publish. Echo về trong vài
   * mili giây nên cửa sổ 60 giây là đủ.
   */
  observe(type: ChatEventType, roomId: number): Observable<MessageEvent> {
    const topic = `chat/${type}/${roomId}`;
    return this.mqtt.connection$.pipe(
      switchMap(() =>
        merge(
          this.subject.asObservable(),
          this.mqtt.stream<ChatEvent>(topic),
        ).pipe(
          filter((event) => event.type === type && event.roomId === roomId),
        ),
      ),
      distinct(chatEventKey, interval(DEDUPE_WINDOW_MS)),
      map((event) => ({ data: event.message }) as MessageEvent),
    );
  }
}
