import { parseSentenceFeedback } from "./ai.service";

describe("parseSentenceFeedback", () => {
  const full = {
    corrected: "",
    reading: "わたしは がくせいです",
    meaning: "Tôi là học sinh",
    explanation: "Câu đúng.",
    examples: ["かれは せんせいです。"],
  };

  it("JSON thuần", () => {
    expect(parseSentenceFeedback(JSON.stringify(full))).toEqual(full);
  });

  it("bọc ```json … ``` như model hay làm", () => {
    expect(
      parseSentenceFeedback("```json\n" + JSON.stringify(full) + "\n```"),
    ).toEqual(full);
  });

  it("có chữ thừa trước/sau JSON", () => {
    expect(
      parseSentenceFeedback(
        `Đây là kết quả: ${JSON.stringify(full)} Chúc học tốt!`,
      ),
    ).toEqual(full);
  });

  it("thiếu field, sai kiểu → chuẩn hóa về chuỗi rỗng / mảng rỗng", () => {
    expect(parseSentenceFeedback('{"meaning": 3, "examples": "x"}')).toEqual({
      corrected: "",
      reading: "",
      meaning: "",
      explanation: "",
      examples: [],
    });
  });

  it("tối đa 5 ví dụ, bỏ phần tử không phải chuỗi", () => {
    const res = parseSentenceFeedback(
      JSON.stringify({ examples: ["1", 2, "3", "4", "5", "6", "7"] }),
    );
    expect(res?.examples).toEqual(["1", "3", "4", "5", "6"]);
  });

  it("không phải JSON → null", () => {
    expect(parseSentenceFeedback("Xin lỗi, tôi không hiểu.")).toBeNull();
  });
});
