/**
 * Chạy app signaling thật (Socket.IO + Redis thật). Cần REDIS_URL trỏ tới một Redis RIÊNG cho test,
 * ví dụ: docker run -d --rm -p 6390:6379 redis:7-alpine  →  REDIS_URL=redis://localhost:6390
 */
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "@jest/globals";
import { sign } from "jsonwebtoken";
import { io, Socket } from "socket.io-client";
import { AppModule } from "../app.module";

const SECRET = "signaling-test-secret";
const SESSION = 501;

describe("Signaling: quyền vào phòng video call", () => {
  let app: INestApplication;
  let url: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    if (!process.env.REDIS_URL)
      throw new Error("Đặt REDIS_URL (Redis riêng cho test)");
    process.env.JWT_SECRET = SECRET;
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    const addr = app.getHttpServer().address() as { port: number };
    url = `http://localhost:${addr.port}/signal`;
  });

  afterEach(async () => {
    sockets.splice(0).forEach((s) => s.disconnect());
    await new Promise((r) => setTimeout(r, 150)); // để server dọn xong kết nối trước test sau / trước khi tắt
  });

  afterAll(async () => {
    await app.close();
  });

  const login = (userId: number) =>
    sign({ sub: userId, email: `u${userId}@t` }, SECRET);
  const ticket = (userId: number, sessionId = SESSION) =>
    sign({ sub: userId, sessionId, typ: "call" }, SECRET, { expiresIn: 600 });

  async function connect(userId: number): Promise<Socket> {
    const socket = io(url, {
      auth: { token: login(userId) },
      transports: ["websocket"],
      forceNew: true,
    });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", reject);
    });
    return socket;
  }

  /** Gửi join-room, chờ "joined" hoặc lỗi. */
  function join(
    socket: Socket,
    payload: Record<string, unknown>,
  ): Promise<"joined" | "rejected"> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve("rejected"), 1500);
      socket.once("joined", () => {
        clearTimeout(timer);
        resolve("joined");
      });
      socket.once("exception", () => {
        clearTimeout(timer);
        resolve("rejected");
      });
      socket.emit("join-room", payload);
    });
  }

  /** Có nhận được sự kiện trong khoảng thời gian không. */
  const receives = (socket: Socket, event: string, ms = 700) =>
    new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), ms);
      socket.once(event, () => {
        clearTimeout(timer);
        resolve(true);
      });
    });

  it("không có vé → không vào được phòng (bản cũ: ai đăng nhập cũng vào)", async () => {
    const s = await connect(1);
    expect(await join(s, { sessionId: SESSION })).toBe("rejected");
  });

  it("vé của phòng khác, hoặc vé của người khác → không vào được", async () => {
    const s = await connect(1);
    expect(
      await join(s, { sessionId: SESSION, callToken: ticket(1, SESSION + 1) }),
    ).toBe("rejected");
    expect(await join(s, { sessionId: SESSION, callToken: ticket(2) })).toBe(
      "rejected",
    );
  });

  it("access token đăng nhập dùng làm vé → không được (vé phải là loại call)", async () => {
    const s = await connect(1);
    expect(await join(s, { sessionId: SESSION, callToken: login(1) })).toBe(
      "rejected",
    );
  });

  it("học viên và coach có vé → vào được, nhận peer-joined", async () => {
    const learner = await connect(1);
    const coach = await connect(2);
    expect(
      await join(learner, { sessionId: SESSION, callToken: ticket(1) }),
    ).toBe("joined");
    const peerJoined = receives(learner, "peer-joined");
    expect(
      await join(coach, { sessionId: SESSION, callToken: ticket(2) }),
    ).toBe("joined");
    expect(await peerJoined).toBe(true);
  });

  it("người ngoài (chưa vào phòng) gửi offer / leave-room vào phòng người khác → không tới được ai", async () => {
    const learner = await connect(1);
    const coach = await connect(2);
    await join(learner, { sessionId: SESSION, callToken: ticket(1) });
    await join(coach, { sessionId: SESSION, callToken: ticket(2) });
    const outsider = await connect(3);

    const gotOffer = receives(learner, "offer");
    const gotPeerLeft = receives(learner, "peer-left");
    outsider.emit("offer", {
      sessionId: SESSION,
      sdp: { type: "offer", sdp: "fake" },
    });
    outsider.emit("leave-room", { sessionId: SESSION });

    expect(await gotOffer).toBe(false);
    expect(await gotPeerLeft).toBe(false);
  });

  it("thành viên trong phòng vẫn trao đổi offer bình thường", async () => {
    const learner = await connect(1);
    const coach = await connect(2);
    await join(learner, { sessionId: SESSION, callToken: ticket(1) });
    await join(coach, { sessionId: SESSION, callToken: ticket(2) });

    const gotOffer = receives(coach, "offer");
    learner.emit("offer", {
      sessionId: SESSION,
      sdp: { type: "offer", sdp: "v=0" },
    });

    expect(await gotOffer).toBe(true);
  });
});
