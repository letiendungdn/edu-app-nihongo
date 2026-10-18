process.env.EXAM_CONSUMER_RETRY_DELAY_MS = "0";

import { Logger } from "@nestjs/common";
import type { EachMessagePayload } from "kafkajs";
import { EXAM_SUBMITTED_DLQ, ExamEventsConsumer } from "./exam-events.consumer";

function payload(value: string): EachMessagePayload {
  return {
    topic: "edu.exam.submitted",
    partition: 0,
    message: { key: Buffer.from("7"), value: Buffer.from(value), offset: "5" },
  } as unknown as EachMessagePayload;
}

function setup(handle: jest.Mock) {
  const producer = { send: jest.fn().mockResolvedValue(undefined) };
  const consumer = new ExamEventsConsumer(
    { get: () => undefined } as never,
    { handle } as never,
    producer as never,
  );
  return { consumer, producer };
}

describe("ExamEventsConsumer.onMessage", () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it("xử lý thành công → không đụng DLQ", async () => {
    const handle = jest.fn().mockResolvedValue(true);
    const { consumer, producer } = setup(handle);
    await consumer.onMessage(
      payload(JSON.stringify({ eventId: "e1", userId: 7 })),
    );
    expect(handle).toHaveBeenCalledTimes(1);
    expect(producer.send).not.toHaveBeenCalled();
  });

  it("lỗi tạm thời rồi thành công ở lần 2 → không DLQ", async () => {
    const handle = jest
      .fn()
      .mockRejectedValueOnce(new Error("db blip"))
      .mockResolvedValue(true);
    const { consumer, producer } = setup(handle);
    await consumer.onMessage(
      payload(JSON.stringify({ eventId: "e2", userId: 7 })),
    );
    expect(handle).toHaveBeenCalledTimes(2);
    expect(producer.send).not.toHaveBeenCalled();
  });

  it("lỗi 3 lần → đẩy nguyên message sang DLQ và đi tiếp", async () => {
    const handle = jest.fn().mockRejectedValue(new Error("always"));
    const { consumer, producer } = setup(handle);
    const raw = JSON.stringify({ eventId: "e3", userId: 7 });
    await consumer.onMessage(payload(raw));
    expect(handle).toHaveBeenCalledTimes(3);
    expect(producer.send).toHaveBeenCalledWith(EXAM_SUBMITTED_DLQ, [
      { key: "7", value: raw },
    ]);
  });

  it("JSON hỏng → DLQ ngay, không thử lại vô ích", async () => {
    const handle = jest.fn();
    const { consumer, producer } = setup(handle);
    await consumer.onMessage(payload("{not json"));
    expect(handle).not.toHaveBeenCalled();
    expect(producer.send).toHaveBeenCalledTimes(1);
  });

  it("gửi DLQ cũng lỗi → ném ra để Kafka không commit offset", async () => {
    const handle = jest.fn().mockRejectedValue(new Error("always"));
    const { consumer, producer } = setup(handle);
    producer.send.mockRejectedValue(new Error("kafka down"));
    await expect(
      consumer.onMessage(payload(JSON.stringify({ eventId: "e4" }))),
    ).rejects.toThrow("kafka down");
  });
});
