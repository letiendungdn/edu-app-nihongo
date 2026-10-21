import { FcmSender } from "./fcm.sender";

describe("FcmSender", () => {
  const reply = (status: number, body = "") =>
    Promise.resolve(new Response(body, { status }));

  it("gọi FCM HTTP v1 đúng project, kèm Bearer token và payload", async () => {
    const http = jest.fn().mockReturnValue(reply(200, "{}"));
    const sender = new FcmSender(
      "nihongo-app",
      async () => "ya29.token",
      http as never,
    );

    expect(
      await sender.send("dev-token", {
        title: "T",
        body: "B",
        data: { screen: "srs" },
      }),
    ).toBe("sent");

    const [url, init] = http.mock.calls[0];
    expect(url).toBe(
      "https://fcm.googleapis.com/v1/projects/nihongo-app/messages:send",
    );
    expect(init.headers.Authorization).toBe("Bearer ya29.token");
    expect(JSON.parse(init.body).message).toMatchObject({
      token: "dev-token",
      notification: { title: "T", body: "B" },
      data: { screen: "srs" },
    });
  });

  it("404 / 400 UNREGISTERED → token hỏng; 500 → lỗi tạm thời (không xóa token)", async () => {
    const make = (status: number, body = "") =>
      new FcmSender(
        "p",
        async () => "t",
        jest.fn().mockReturnValue(reply(status, body)) as never,
      );

    expect(await make(404).send("x", { title: "", body: "" })).toBe(
      "invalid-token",
    );
    expect(
      await make(400, '{"error":{"status":"INVALID_ARGUMENT"}}').send("x", {
        title: "",
        body: "",
      }),
    ).toBe("invalid-token");
    expect(await make(500).send("x", { title: "", body: "" })).toBe("error");
  });

  it("không cấu hình service account → tắt (null)", () => {
    expect(FcmSender.fromEnv({})).toBeNull();
  });
});
