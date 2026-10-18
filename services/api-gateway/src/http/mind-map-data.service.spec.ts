import {
  MAX_BRANCHES,
  kanjiSpeakList,
  buildDataLevel,
  partitionLessons,
  posBucket,
  shortTitle,
  type SourceItem,
} from "./mind-map-data.service";

const item = (
  lessonNumber: number,
  pos?: string,
  title: string | null = null,
): SourceItem => ({
  lessonNumber,
  lessonTitle: title,
  partOfSpeech: pos,
  item: {
    pattern: `w${lessonNumber}`,
    meaning: "m",
    href: "/x",
    linkLabel: `Bài ${lessonNumber}`,
  },
});

describe("mind map data grouping", () => {
  it("posBucket uses the first listed part of speech", () => {
    expect(posBucket("danh từ")).toBe("noun");
    expect(posBucket("danh từ, động từ する")).toBe("suru-noun");
    expect(posBucket("danh từ, tính từ na")).toBe("noun");
    expect(posBucket("tính từ na, danh từ")).toBe("na-adj");
    expect(posBucket("động từ nhóm 1")).toBe("verb");
    expect(posBucket("phó từ, động từ する")).toBe("adverb");
    expect(posBucket("tính từ i")).toBe("i-adj");
    expect(posBucket("thán từ")).toBe("other");
    expect(posBucket(null)).toBeNull();
    // mã từ loại do API ghi khi admin sửa
    expect(posBucket("na-adj")).toBe("na-adj");
    expect(posBucket("verb")).toBe("verb");
  });

  it("partitionLessons keeps order, never exceeds n groups and uses every lesson once", () => {
    const lessons = Array.from({ length: 30 }, (_, i) => ({
      lessonNumber: i + 1,
      title: null,
      items: Array.from({ length: (i % 5) + 1 }, () => item(i + 1).item),
    }));
    const groups = partitionLessons(lessons, 8);
    expect(groups.length).toBeLessThanOrEqual(8);
    expect(groups.flat().map((l) => l.lessonNumber)).toEqual(
      lessons.map((l) => l.lessonNumber),
    );
  });

  it("vocab with part of speech groups by POS; without it groups by lesson ranges", () => {
    const withPos = buildDataLevel("VOCAB", "N3", [
      item(301, "danh từ"),
      item(301, "động từ nhóm 2"),
    ]);
    expect(withPos.groupedBy).toBe("partOfSpeech");
    expect(withPos.branches.map((b) => b.label)).toEqual([
      "Danh từ",
      "Động từ",
    ]);

    const minna = Array.from({ length: 25 }, (_, i) => item(i + 1));
    const n5 = buildDataLevel("VOCAB", "N5", [...minna, item(220), item(221)]);
    expect(n5.groupedBy).toBe("lesson");
    expect(n5.branches.length).toBeLessThanOrEqual(MAX_BRANCHES);
    expect(n5.branches[0].label).toMatch(/^Minna bài 1/);
    // bài bổ sung không bị trộn chung nhánh với Minna
    expect(n5.branches.at(-1)!.label).toMatch(/Bổ sung/);
    expect(n5.branches.reduce((s, b) => s + b.patterns.length, 0)).toBe(27);
  });

  it("levels without a core textbook are not labelled 'Bổ sung'", () => {
    const n2 = buildDataLevel(
      "GRAMMAR",
      "N2",
      Array.from({ length: 20 }, (_, i) => item(401 + i)),
    );
    expect(n2.branches.every((b) => !b.label.includes("Bổ sung"))).toBe(true);
    expect(n2.branches[0].label).toMatch(/^Bài 401/);
  });

  it("kanji lessons 1–32 are labelled as Kanji Look and Learn", () => {
    const lvl = buildDataLevel(
      "KANJI",
      "N5",
      Array.from({ length: 10 }, (_, i) => item(i + 1)),
    );
    expect(lvl.branches[0].label).toBe("KLL bài 1–2");
  });

  it("single-lesson branches use the lesson topic as label", () => {
    expect(shortTitle("N3 · Bài 1 — Nguyên nhân, điều kiện, mục đích")).toBe(
      "Nguyên nhân, điều kiện, mục đích",
    );
    const lvl = buildDataLevel("GRAMMAR", "N3", [
      item(301, undefined, "N3 · Bài 1 — Nguyên nhân"),
    ]);
    expect(lvl.branches[0].label).toBe("Nguyên nhân");
  });

  it("kanjiSpeakList strips okurigana markers and de-duplicates", () => {
    expect(kanjiSpeakList("いち, いつ", "ひと-つ、ひと")).toEqual([
      "いち",
      "いつ",
      "ひとつ",
      "ひと",
    ]);
    expect(kanjiSpeakList(null, null)).toEqual([]);
  });
});
