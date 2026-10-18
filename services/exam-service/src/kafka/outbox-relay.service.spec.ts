import { OutboxRelayService, groupByTopic } from "./outbox-relay.service";

type Row = { id: number; topic: string; key: string | null; payload: object };

function setup(rows: Row[], sendImpl: (topic: string) => Promise<void>) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue(rows),
    outboxEvent: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const prisma = {
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const kafka = { send: jest.fn(sendImpl) };
  const relay = new OutboxRelayService(prisma as never, kafka as never);
  return { relay, tx, kafka };
}

const row = (
  id: number,
  topic = "edu.exam.submitted",
  key: string | null = "7",
): Row => ({
  id,
  topic,
  key,
  payload: { eventId: `exam-result-${id}` },
});

describe("OutboxRelayService", () => {
  it("gửi event chưa publish kèm key và đánh dấu publishedAt", async () => {
    const { relay, tx, kafka } = setup([row(1), row(2)], () =>
      Promise.resolve(),
    );
    await expect(relay.tick()).resolves.toBe(2);
    expect(kafka.send).toHaveBeenCalledWith("edu.exam.submitted", [
      { key: "7", value: JSON.stringify({ eventId: "exam-result-1" }) },
      { key: "7", value: JSON.stringify({ eventId: "exam-result-2" }) },
    ]);
    expect(tx.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [1, 2] } },
      data: { publishedAt: expect.any(Date) },
    });
  });

  it("Kafka lỗi → KHÔNG mất event: tăng attempts, ghi lastError, để lượt sau thử lại", async () => {
    const { relay, tx } = setup([row(3)], () =>
      Promise.reject(new Error("broker down")),
    );
    await expect(relay.tick()).resolves.toBe(0);
    expect(tx.outboxEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [3] } },
      data: {
        attempts: { increment: 1 },
        lastError: expect.stringContaining("broker down"),
      },
    });
    expect(tx.outboxEvent.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: { publishedAt: expect.any(Date) } }),
    );
  });

  it("một topic lỗi không chặn topic khác", async () => {
    const { relay } = setup([row(4, "a"), row(5, "b")], (topic) =>
      topic === "a" ? Promise.reject(new Error("x")) : Promise.resolve(),
    );
    await expect(relay.tick()).resolves.toBe(1);
  });

  it("không chạy chồng lượt khi lượt trước chưa xong", async () => {
    let release!: () => void;
    const { relay } = setup(
      [row(6)],
      () => new Promise<void>((r) => (release = r)),
    );
    const first = relay.tick();
    await new Promise((r) => setImmediate(r));
    await expect(relay.tick()).resolves.toBe(0);
    release();
    await expect(first).resolves.toBe(1);
  });

  it("groupByTopic gom đúng theo topic, giữ thứ tự", () => {
    const groups = groupByTopic([
      row(1, "a"),
      row(2, "b"),
      row(3, "a"),
    ] as never);
    expect([...groups.keys()]).toEqual(["a", "b"]);
    expect(groups.get("a")!.map((r) => r.id)).toEqual([1, 3]);
  });
});
