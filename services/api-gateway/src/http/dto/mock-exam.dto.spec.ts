import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  MAX_ANSWERS,
  MAX_ANSWER_LENGTH,
  SubmitMockExamDto,
} from "./mock-exam.dto";

async function errorsFor(body: unknown) {
  const dto = plainToInstance(SubmitMockExamDto, body);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

describe("SubmitMockExamDto", () => {
  it("nhận đúng dạng web/Android/iOS đang gửi", async () => {
    await expect(
      errorsFor({ answers: { "q-1": "A", "q-2": "こんにちは", "q-3": "" } }),
    ).resolves.toHaveLength(0);
  });

  it("nhận bài nộp trống (chưa chọn câu nào)", async () => {
    await expect(errorsFor({ answers: {} })).resolves.toHaveLength(0);
  });

  it.each([
    ["thiếu answers", {}],
    ["answers là mảng", { answers: ["A", "B"] }],
    ["đáp án không phải chuỗi", { answers: { "q-1": 2 } }],
    ["đáp án là object lồng", { answers: { "q-1": { $ne: "" } } }],
    [
      "đáp án quá dài",
      { answers: { "q-1": "x".repeat(MAX_ANSWER_LENGTH + 1) } },
    ],
    [
      "quá nhiều câu",
      {
        answers: Object.fromEntries(
          Array.from({ length: MAX_ANSWERS + 1 }, (_, i) => [`q-${i}`, "A"]),
        ),
      },
    ],
    ["field lạ", { answers: {}, userId: 1 }],
  ])("từ chối: %s", async (_name, body) => {
    const errors = await errorsFor(body);
    expect(errors.length).toBeGreaterThan(0);
  });
});
