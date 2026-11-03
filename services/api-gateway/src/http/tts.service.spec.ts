jest.mock("./edge-tts-ws-patch", () => ({}));
const edgeSynthesize = jest.fn();
jest.mock("edge-tts-universal", () => ({
  EdgeTTS: jest.fn().mockImplementation(() => ({ synthesize: edgeSynthesize })),
}));

import { ConfigService } from "@nestjs/config";
import { TtsService, TtsUnavailableError, buildSsml } from "./tts.service";

const config = (values: Record<string, string>) =>
  ({ get: (k: string) => values[k] }) as unknown as ConfigService;

const mp3 = (bytes: string) => ({
  ok: true,
  status: 200,
  arrayBuffer: async () => new TextEncoder().encode(bytes).buffer,
});

describe("TtsService", () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    edgeSynthesize.mockReset();
  });

  it("có khóa Azure → gọi Azure Speech với SSML đúng giọng, không đụng Edge", async () => {
    const fetchMock = jest.fn().mockResolvedValue(mp3("azure"));
    global.fetch = fetchMock as unknown as typeof fetch;
    const svc = new TtsService(
      config({ AZURE_SPEECH_KEY: "k", AZURE_SPEECH_REGION: "southeastasia" }),
    );

    const out = await svc.synthesize("先生 & <生徒>", "ja-JP");

    expect(out.toString()).toBe("azure");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://southeastasia.tts.speech.microsoft.com/cognitiveservices/v1");
    expect(init.headers["Ocp-Apim-Subscription-Key"]).toBe("k");
    expect(init.body).toBe(
      '<speak version="1.0" xml:lang="ja-JP"><voice name="ja-JP-NanamiNeural">先生 &amp; &lt;生徒&gt;</voice></speak>',
    );
    expect(edgeSynthesize).not.toHaveBeenCalled();
  });

  it("Azure lỗi → thử Edge", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 }) as unknown as typeof fetch;
    edgeSynthesize.mockResolvedValue({ audio: { arrayBuffer: async () => new TextEncoder().encode("edge").buffer } });
    const svc = new TtsService(config({ AZURE_SPEECH_KEY: "k", AZURE_SPEECH_REGION: "r" }));

    expect((await svc.synthesize("xin chào", "vi-VN")).toString()).toBe("edge");
  });

  it("Edge lỗi → báo không đọc được, và các lần sau bỏ qua Edge (không chờ lại)", async () => {
    edgeSynthesize.mockRejectedValue(new Error("403"));
    const svc = new TtsService(config({}));

    await expect(svc.synthesize("xin chào", "vi-VN")).rejects.toBeInstanceOf(TtsUnavailableError);
    await expect(svc.synthesize("xin chào", "vi-VN")).rejects.toBeInstanceOf(TtsUnavailableError);
    expect(edgeSynthesize).toHaveBeenCalledTimes(1);
  });

  it("ngôn ngữ không hỗ trợ / văn bản rỗng → lỗi đầu vào, không phải lỗi dịch vụ", async () => {
    const svc = new TtsService(config({}));
    await expect(svc.synthesize("x", "en-US")).rejects.not.toBeInstanceOf(TtsUnavailableError);
    await expect(svc.synthesize("   ", "vi-VN")).rejects.not.toBeInstanceOf(TtsUnavailableError);
  });

  it("buildSsml escape ký tự XML", () => {
    expect(buildSsml(`a"b'c`, "vi-VN", "v")).toContain("a&quot;b&apos;c");
  });
});
