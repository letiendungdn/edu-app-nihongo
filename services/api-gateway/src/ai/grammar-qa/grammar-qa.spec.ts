import {
  buildUserPrompt,
  bytesToVector,
  cacheKey,
  contentHash,
  docText,
  lexicalScore,
  normalize,
  parseCitations,
  rank,
  vectorToBytes,
  type IndexedDoc,
} from "./grammar-qa";

const doc = (
  id: number,
  pattern: string,
  vector: number[],
  jlptLevel = "N4",
): IndexedDoc => ({
  grammarId: id,
  pattern,
  meaning: `nghĩa ${id}`,
  jlptLevel,
  lessonId: 1,
  lessonNumber: 1,
  text: `Mẫu: ${pattern}`,
  vector: normalize(vector),
});

describe("grammar-qa (RAG)", () => {
  it("docText gồm mẫu, cấp, nghĩa, giải thích và tối đa 3 ví dụ", () => {
    const text = docText({
      grammarId: 1,
      pattern: "V たことがあります",
      meaning: "đã từng V",
      explanation: "Kinh nghiệm trong quá khứ",
      jlptLevel: "N5",
      lessonId: 19,
      examples: [1, 2, 3, 4].map((i) => ({ jp: `例${i}`, vi: `ví dụ ${i}` })),
    });
    expect(text).toContain("Mẫu: V たことがあります");
    expect(text).toContain("Cấp: N5");
    expect(text).toContain("Giải thích: Kinh nghiệm");
    expect(text.match(/Ví dụ:/g)).toHaveLength(3);
  });

  it("contentHash đổi khi nội dung hoặc model đổi", () => {
    const a = contentHash("x", "m1");
    expect(contentHash("x", "m1")).toBe(a);
    expect(contentHash("y", "m1")).not.toBe(a);
    expect(contentHash("x", "m2")).not.toBe(a);
  });

  it("vector ↔ bytes giữ nguyên giá trị (float32)", () => {
    const v = normalize([0.1, -2, 3.5, 0]);
    const back = bytesToVector(new Uint8Array(vectorToBytes(v)));
    expect(Array.from(back)).toEqual(Array.from(v));
  });

  it("xếp theo độ giống, gộp mẫu trùng giữa các giáo trình", () => {
    const docs = [
      doc(1, "V たことがあります", [1, 0, 0]),
      doc(2, "V たことがあります", [0.99, 0.1, 0]), // cùng mẫu, giáo trình khác
      doc(3, "V たいです", [0.6, 0.8, 0]),
      doc(4, "N が すきです", [0, 0, 1]),
    ];
    const out = rank(normalize([1, 0.05, 0]), "đã từng làm gì", docs, 3);
    expect(out.map((s) => s.grammarId)).toEqual([1, 3, 4]);
    expect(out[0].score).toBeGreaterThan(out[1].score);
  });

  it("câu hỏi có chữ Nhật của mẫu thì mẫu đó được đẩy lên", () => {
    expect(
      lexicalScore("たことがある nghĩa là gì?", "V たことがあります"),
    ).toBe(1);
    expect(lexicalScore("đã từng làm gì", "V たことがあります")).toBe(0);
    const docs = [
      doc(1, "V たいです", [1, 0]),
      doc(2, "V ばかりです", [0.9, 0.44]),
    ];
    expect(
      rank(normalize([1, 0]), "ばかり dùng thế nào", docs, 2)[0].grammarId,
    ).toBe(2);
  });

  it("prompt đánh số nguồn [1]..[n] để AI trích", () => {
    const p = buildUserPrompt("hỏi gì", [{ text: "A" }, { text: "B" }]);
    expect(p).toContain("[1]\nA");
    expect(p).toContain("[2]\nB");
    expect(p).toContain("CÂU HỎI: hỏi gì");
  });

  it("chỉ nhận trích dẫn hợp lệ, bỏ số AI bịa ngoài phạm vi", () => {
    expect(
      parseCitations("Dùng để kể kinh nghiệm [1][3]. Xem thêm [7] và [0].", 5),
    ).toEqual([1, 3]);
    expect(parseCitations("Không có trích dẫn", 5)).toEqual([]);
  });

  it("cache coi câu hỏi khác hoa thường, khoảng trắng là một", () => {
    expect(cacheKey("  Cách   dùng ばかり ")).toBe(
      cacheKey("cách dùng ばかり"),
    );
  });
});
