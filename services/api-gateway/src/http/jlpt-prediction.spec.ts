import { predictJlpt, type ExamAttempt } from "./jlpt-prediction";

const attempt = (
  daysAgo: number,
  parts: Record<string, [number, number]>,
): ExamAttempt => ({
  submittedAt: new Date(Date.UTC(2026, 10, 1) - daysAgo * 86_400_000),
  sections: Object.entries(parts).map(([section, [correct, total]]) => ({
    section,
    correct,
    total,
  })),
});

describe("predictJlpt", () => {
  it("asks for a mock exam when there is no data", () => {
    const p = predictJlpt("n3", []);
    expect(p.confidence).toBe("none");
    expect(p.passProbability).toBe(0);
    expect(p.advice[0]).toContain("N3");
  });

  it("maps app sections onto the three N3 sections", () => {
    const p = predictJlpt("n3", [
      attempt(0, {
        vocab: [18, 20],
        kanji: [9, 10],
        grammar: [15, 20],
        reading: [12, 15],
        listening: [16, 20],
      }),
    ]);
    expect(p.sections.map((s) => s.id)).toEqual([
      "language",
      "reading",
      "listening",
    ]);
    expect(p.maxTotal).toBe(180);
    const language = p.sections[0];
    expect(language.questions).toBe(50);
    expect(language.estimate).toBeGreaterThan(40);
  });

  it("puts reading together with language for N5", () => {
    const p = predictJlpt("n5", [
      attempt(0, { vocab: [10, 10], reading: [5, 5], listening: [8, 10] }),
    ]);
    expect(p.sections.map((s) => s.max)).toEqual([120, 60]);
    expect(p.sections[0].questions).toBe(15);
  });

  it("gives a high pass chance to a strong, consistent learner", () => {
    const strong = Array.from({ length: 5 }, (_, i) =>
      attempt(i * 3, {
        vocab: [19, 20],
        kanji: [10, 10],
        grammar: [18, 20],
        reading: [14, 15],
        listening: [18, 20],
      }),
    );
    const p = predictJlpt("n2", strong);
    expect(p.passProbability).toBeGreaterThan(0.95);
    expect(p.confidence).toBe("high");
  });

  it("fails a learner who is good overall but weak in one section", () => {
    const lopsided = Array.from({ length: 4 }, (_, i) =>
      attempt(i, {
        vocab: [20, 20],
        kanji: [10, 10],
        grammar: [20, 20],
        reading: [15, 15],
        listening: [3, 20],
      }),
    );
    const p = predictJlpt("n1", lopsided);
    const listening = p.sections.find((s) => s.id === "listening")!;
    expect(listening.belowMinRisk).toBeGreaterThan(0.9);
    expect(p.passProbability).toBeLessThan(0.1);
    expect(p.advice.some((a) => a.includes("điểm sàn"))).toBe(true);
  });

  it("weights recent attempts more than old ones", () => {
    const improving = [
      attempt(30, { vocab: [4, 20], grammar: [4, 20] }),
      attempt(0, { vocab: [18, 20], grammar: [18, 20] }),
    ];
    const p = predictJlpt("n3", improving);
    expect(p.sections[0].accuracy!).toBeGreaterThan(0.55);
  });

  it("reports sections with no questions yet", () => {
    const p = predictJlpt("n3", [attempt(0, { vocab: [10, 20] })]);
    expect(p.missingSections).toEqual(["Đọc hiểu", "Nghe"]);
    expect(p.confidence).toBe("low");
  });

  it("predicts from practice alone, with low confidence", () => {
    const p = predictJlpt(
      "n3",
      [],
      [
        { section: "vocab", correct: 80, total: 100, source: "SRS" },
        { section: "reading", correct: 12, total: 20, source: "Đọc hiểu" },
      ],
    );
    expect(p.confidence).toBe("low");
    expect(p.passProbability).toBeGreaterThan(0);
    expect(p.missingSections).toEqual(["Nghe"]);
    expect(p.sections[0].practiceSources).toEqual(["SRS"]);
    expect(p.advice[0]).toContain("luyện tập");
  });

  it("keeps practice from outweighing a real mock exam", () => {
    const exam = attempt(0, { vocab: [6, 20], grammar: [6, 20] });
    const easyPractice = [
      { section: "vocab", correct: 990, total: 1000, source: "SRS" },
    ];
    const withPractice = predictJlpt("n3", [exam], easyPractice);
    const without = predictJlpt("n3", [exam]);
    const lift =
      withPractice.sections[0].accuracy! - without.sections[0].accuracy!;
    expect(lift).toBeGreaterThan(0);
    expect(lift).toBeLessThan(0.15);
  });
});

describe("grammarFragments", () => {
  const { grammarFragments } =
    jest.requireActual<typeof import("./jlpt-prediction")>("./jlpt-prediction");

  it("keeps the fixed Japanese part of a pattern", () => {
    expect(grammarFragments("〜うちに")).toEqual(["うちに"]);
    expect(grammarFragments("〜に関して／〜に関する")).toEqual([
      "に関して",
      "に関する",
    ]);
    expect(grammarFragments("Vたとたん（に）")).toEqual(["たとたん"]);
  });

  it("drops readings and one-character leftovers", () => {
    expect(grammarFragments("〜わけ（訳）だ")).toEqual(["わけだ"]);
    expect(grammarFragments("〜は")).toEqual([]);
  });

  it("joins parts split by a space and skips fragments too common to count", () => {
    expect(grammarFragments("〜から こそ")).toEqual(["からこそ"]);
    expect(grammarFragments("V(て) + ある")).toEqual([]);
    expect(grammarFragments("〜って")).toEqual([]);
    expect(grammarFragments("〜末（に）")).toEqual([]);
    expect(grammarFragments("〜べきだ／〜べきでは ない")).toEqual([
      "べきだ",
      "べきではない",
    ]);
  });
});

describe("grammarMatchers", () => {
  const { grammarMatchers } =
    jest.requireActual<typeof import("./jlpt-prediction")>("./jlpt-prediction");
  const finds = (pattern: string, sentence: string) =>
    grammarMatchers(pattern).some((r) => r.test(sentence));

  it("matches conjugated verbs for placeholder-only patterns", () => {
    expect(finds("V(て) + おく", "資料を読んでおきました。")).toBe(true);
    expect(finds("V(て) + ある", "窓が開けてあります。")).toBe(true);
    expect(
      finds("V(sai khiến) — させる / せる", "子どもに野菜を食べさせた。"),
    ).toBe(true);
    expect(
      finds(
        "V(た) + り + V(た) + り + する",
        "本を読んだり音楽を聞いたりします。",
      ),
    ).toBe(true);
  });

  it("matches one-kanji cores only in their grammatical use", () => {
    expect(finds("〜末（に）", "悩んだ末に決めた。")).toBe(true);
    expect(finds("〜末（に）", "週末は家にいます。")).toBe(false);
  });

  it("prefers a pattern's own fixed part over the broad rules", () => {
    expect(finds("〜せいか", "疲れたせいか、頭が痛い。")).toBe(true);
    expect(finds("〜せいか", "それは本当ですか。")).toBe(false);
    expect(finds("〜上で", "駅で待っています。")).toBe(false);
  });

  it("tells an event's place apart from plain existence", () => {
    const event = "N1（địa điểm）で N2（sự kiện）が あります";
    expect(finds(event, "大阪で祭りがあります。")).toBe(true);
    expect(finds(event, "机の上に本があります。")).toBe(false);
    expect(grammarMatchers(event).map(String)).not.toEqual(
      grammarMatchers("N が あります").map(String),
    );
  });

  it("falls back to fixed fragments and leaves verb forms unmeasured", () => {
    expect(finds("〜うちに", "温かいうちに食べてください。")).toBe(true);
    expect(grammarMatchers("Thể て của động từ")).toEqual([]);
  });
});

describe("sameGrammarFunction", () => {
  const { sameGrammarFunction } =
    jest.requireActual<typeof import("./jlpt-prediction")>("./jlpt-prediction");

  it("keeps honorific and passive られます apart", () => {
    expect(
      sameGrammarFunction(
        "V れます／V られます（tôn kính）",
        "N1 は N2 に N3 を V られます",
      ),
    ).toBe(false);
  });

  it("allows merging two spellings of the same point", () => {
    expect(sameGrammarFunction("〜結果", "V(た) + 結果 / N + の結果")).toBe(
      true,
    );
    expect(
      sameGrammarFunction(
        "〜ため（に）（nguyên nhân）",
        "N + のため（nguyên nhân）",
      ),
    ).toBe(true);
  });
});

describe("honorific vs passive", () => {
  const { grammarMatchers } =
    jest.requireActual<typeof import("./jlpt-prediction")>("./jlpt-prediction");
  const finds = (pattern: string, sentence: string) =>
    grammarMatchers(pattern).some((r) => r.test(sentence));
  const honorific = "V れます／V られます（tôn kính）";
  const passive = "N1 は N2 に N3 を V られます";

  it("keeps special honorific verbs apart from れる/られる honorifics", () => {
    const special = "Động từ tôn kính đặc biệt";
    expect(finds(special, "先生はもうお昼を召し上がりましたか。")).toBe(true);
    expect(finds(special, "社長は会議室にいらっしゃいます。")).toBe(true);
    expect(finds(special, "先生は毎朝新聞を読まれます。")).toBe(false);
    expect(finds(special, "正しいものを一つ選びなさい。")).toBe(false);
    expect(finds(special, "社長はどうなさいますか。")).toBe(true);
    expect(finds(honorific, "社長は会議室にいらっしゃいます。")).toBe(false);
  });

  it("matches お V に なります only with the honorific prefix and verb stem", () => {
    const oni = "Kính ngữ お V に なります";
    expect(finds(oni, "先生はもうお帰りになりました。")).toBe(true);
    expect(finds(oni, "お客様はご利用になりますか。")).toBe(true);
    expect(finds(oni, "部屋が静かになりました。")).toBe(false);
    expect(
      finds(
        "Thể bị động（V れる／V られる）",
        "お客様は駐車場をご利用になれます。",
      ),
    ).toBe(false);
    expect(
      finds("Thể bị động（V れる／V られる）", "子どものころ、犬に死なれた。"),
    ).toBe(true);
    expect(finds(oni, "それはお金になります。")).toBe(false);
    expect(finds(oni, "お金持ちになったら家を買いたい。")).toBe(false);
    expect(finds(oni, "将来はお医者さんになりたい。")).toBe(false);
  });

  it("counts causative-passive sentences apart from plain passives", () => {
    const cp = "V(sai khiến bị động) — させられる / せられる";
    expect(finds(cp, "会議に参加させられた。")).toBe(true);
    expect(finds(cp, "駅で四十分も待たされた。")).toBe(true);
    expect(finds(cp, "毎日同じ話を聞かされている。")).toBe(true);
    expect(finds(cp, "不況のため、出張が減らされた。")).toBe(false);
    expect(finds(cp, "先生に名前を呼ばれた。")).toBe(false);
    expect(finds(cp, "友達に写真を見せられた。")).toBe(false);
    expect(finds(cp, "作文を三回も書かせられました。")).toBe(true);
    expect(finds("V(使役受身)", "子どものころ、ピアノを習わされた。")).toBe(
      true,
    );
  });

  it("does not count lexical せる verbs as causative", () => {
    const c = "V(sai khiến) — させる / せる";
    expect(finds(c, "母は子どもに野菜を食べさせた。")).toBe(true);
    expect(finds(c, "子どもにピアノを習わせる。")).toBe(true);
    expect(finds(c, "明日、打ち合わせをします。")).toBe(false);
    expect(finds(c, "水は生活に欠かせない。")).toBe(false);
    expect(finds(c, "昼ご飯はパンで済ませた。")).toBe(false);
    expect(finds(c, "結果をメールで知らせてください。")).toBe(false);
  });

  it("treats the formal られる pattern as honorific", () => {
    const formal = "V(受身/使役) trong văn viết trang trọng";
    expect(finds(formal, "部長はもう出発されました。")).toBe(true);
    expect(finds(formal, "先生に名前を呼ばれた。")).toBe(false);
  });

  it("counts honorific sentences only for the honorific pattern", () => {
    expect(finds(honorific, "社長は明日大阪へ行かれます。")).toBe(true);
    expect(finds(passive, "社長は明日大阪へ行かれます。")).toBe(false);
  });

  it("counts honorific sentences where the superior is not the subject", () => {
    expect(finds(honorific, "社長、明日は何時に来られますか。")).toBe(true);
    expect(finds(honorific, "この本はお客様がよく読まれます。")).toBe(true);
    expect(finds(passive, "社長、明日は何時に来られますか。")).toBe(false);
    expect(finds(honorific, "田中さんは先生に褒められました。")).toBe(false);
    expect(finds(honorific, "部長は社長に呼ばれました。")).toBe(false);
    expect(finds(honorific, "大きなミスをして、課長から降格された。")).toBe(
      false,
    );
    expect(finds(honorific, "新社長の手腕が問われる。")).toBe(false);
    expect(finds(honorific, "先生は来月から新しい授業を始められます。")).toBe(
      true,
    );
    expect(finds(honorific, "社長は午後から出かけられる予定です。")).toBe(true);
  });

  it("counts sentences with an agent only for the passive pattern", () => {
    expect(finds(passive, "弟は先生に褒められました。")).toBe(true);
    expect(finds(honorific, "弟は先生に褒められました。")).toBe(false);
  });
});

describe("look-alike patterns stay apart", () => {
  const { grammarMatchers, sameGrammarFunction } =
    jest.requireActual<typeof import("./jlpt-prediction")>("./jlpt-prediction");
  const finds = (pattern: string, sentence: string) =>
    grammarMatchers(pattern).some((r) => r.test(sentence));
  const key = (p: string) => grammarMatchers(p).map(String).join("|");

  it("does not treat から、 or なら、 as たら", () => {
    expect(key("〜から、〜")).not.toBe(key("V たら、～（sau khi）"));
    expect(key("N なら、～")).not.toBe(key("〜たら"));
    expect(finds("V たら、～（sau khi）", "雨が降ったら、行きません。")).toBe(
      true,
    );
  });

  it("separates choice questions, concessive もし/いくら and polite requests", () => {
    expect(finds("S1 か、S2 か", "コーヒーか、紅茶か。")).toBe(true);
    expect(finds("S1 か、S2 か", "これは本ですか。")).toBe(false);
    expect(finds("もし／いくら", "いくら高くても買います。")).toBe(true);
    expect(finds("もし／いくら", "これはいくらですか。")).toBe(false);
    expect(
      finds("お V（ます bỏ）／ご N ＋ ください", "少々お待ちください。"),
    ).toBe(true);
  });

  it("separates 'just did' ばかり from 'nothing but' ばかり", () => {
    expect(finds("V(た) + ばかり", "日本に来たばかりです。")).toBe(true);
    expect(finds("V(た) + ばかり", "テレビを見てばかりいる。")).toBe(false);
  });

  it("keeps different uses of the same form apart", () => {
    expect(
      sameGrammarFunction(
        "V て います（đang diễn ra）",
        "V て います（nghề nghiệp, công việc thường xuyên）",
      ),
    ).toBe(false);
    expect(
      sameGrammarFunction(
        "V(ます bỏ) + そうです (nhìn thấy)",
        "V(普通形) + そうです (nghe nói)",
      ),
    ).toBe(false);
  });

  it("separates は〜が〜A, もう〜ました and らしい (đúng chất)", () => {
    expect(finds("N1 は N2 が A です", "象は鼻が長いです。")).toBe(true);
    expect(finds("N1 は N2 が A です", "私は学生です。")).toBe(false);
    expect(finds("もう V ました", "もう昼ご飯を食べました。")).toBe(true);
    expect(finds("もう V ました", "昨日映画を見ました。")).toBe(false);
    expect(
      sameGrammarFunction(
        "〜らしい（đúng chất）",
        "V/A/N(thể thường) + らしい",
      ),
    ).toBe(false);
  });
});
