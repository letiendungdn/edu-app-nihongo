import { BehaviorSubject, type Observable, Subject } from "rxjs";
import { ChatEventsService, type ChatEvent } from "./chat-events.service";
import type { MqttBus } from "./mqtt.bus";

class FakeMqtt {
  readonly connection$ = new BehaviorSubject(false);
  readonly published: { topic: string; payload: unknown }[] = [];
  readonly opened: Subject<ChatEvent>[] = [];

  publish(topic: string, payload: unknown) {
    this.published.push({ topic, payload });
  }

  stream<T>(): Observable<T> {
    const subject = new Subject<ChatEvent>();
    this.opened.push(subject);
    return subject.asObservable() as Observable<T>;
  }
}

describe("ChatEventsService", () => {
  it("publish MQTT, bỏ echo trùng id, và bỏ tin của subscription cũ sau reconnect", () => {
    const mqtt = new FakeMqtt();
    const service = new ChatEventsService(mqtt as unknown as MqttBus);
    const received: unknown[] = [];
    // Phải unsubscribe: interval xóa dedupe giữ timer sống, giống SSE chưa đóng.
    const sub = service
      .observe("community", 7)
      .subscribe((event) => received.push(event.data));

    service.emit({
      type: "community",
      roomId: 7,
      message: { id: 1, content: "a" },
    });
    mqtt.opened[0].next({
      type: "community",
      roomId: 7,
      message: { id: 1, content: "a" },
    });

    mqtt.connection$.next(true);
    mqtt.opened[0].next({
      type: "community",
      roomId: 7,
      message: { id: 9, content: "cũ" },
    });
    mqtt.opened[1].next({
      type: "community",
      roomId: 7,
      message: { id: 2, content: "b" },
    });

    sub.unsubscribe();

    expect(received).toEqual([
      { id: 1, content: "a" },
      { id: 2, content: "b" },
    ]);
    expect(mqtt.published.map((item) => item.topic)).toEqual([
      "chat/community/7",
    ]);
  });

  it("xóa bộ nhớ dedupe sau mỗi cửa sổ 60 giây", () => {
    jest.useFakeTimers();
    try {
      const mqtt = new FakeMqtt();
      const service = new ChatEventsService(mqtt as unknown as MqttBus);
      const received: unknown[] = [];
      const sub = service
        .observe("support", 3)
        .subscribe((event) => received.push(event.data));
      const event: ChatEvent = {
        type: "support",
        roomId: 3,
        message: { id: 5 },
      };

      service.emit(event);
      service.emit(event);
      jest.advanceTimersByTime(60_000);
      service.emit(event);
      sub.unsubscribe();

      expect(received).toEqual([{ id: 5 }, { id: 5 }]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("fan-out notify theo user id", () => {
    const mqtt = new FakeMqtt();
    const service = new ChatEventsService(mqtt as unknown as MqttBus);
    service.notifyUsers([4, 5], { type: "GROUP_MESSAGE" });
    expect(mqtt.published.map((item) => item.topic)).toEqual([
      "user/4/notify",
      "user/5/notify",
    ]);
  });
});
