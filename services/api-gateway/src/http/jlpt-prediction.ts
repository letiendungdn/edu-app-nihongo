/**
 * Dự đoán điểm JLPT từ kết quả thi thử (hàm thuần, không chạm DB — có test riêng).
 *
 * Các phần của đề thi thử (vocab / kanji / grammar / reading / listening) được gộp thành
 * phần thi JLPT thật:
 *   - N1–N3: 言語知識 (từ vựng + kanji + ngữ pháp) 60 · 読解 60 · 聴解 60
 *   - N4–N5: 言語知識・読解 120 · 聴解 60
 * Mỗi phần ước lượng tỷ lệ đúng bằng phân phối Beta (bài gần đây nặng hơn), rồi mô phỏng
 * Monte Carlo để ra khoảng điểm và xác suất đỗ (đủ điểm tổng VÀ không phần nào dưới điểm sàn).
 * JLPT chấm điểm quy đổi (scaled) chứ không tuyến tính — đây là ước lượng, không phải điểm thật.
 */

export type JlptLevelKey = "n1" | "n2" | "n3" | "n4" | "n5";

/**
 * Kết quả luyện tập ngoài đề thi thử (ôn SRS, bài đọc, nghe chép), cùng tên phần như đề.
 * Luyện tập thường dễ hơn đề thật nên chỉ là bằng chứng phụ: mỗi phần tối đa
 * PRACTICE_CAP câu và nhân trọng số PRACTICE_WEIGHT.
 */
export interface PracticeEvidence {
  section: string;
  correct: number;
  total: number;
  source: string;
}

export interface ExamAttempt {
  submittedAt: Date | string;
  sections: Array<{ section: string; correct: number; total: number }>;
}

interface SectionRule {
  id: string;
  name: string;
  nameJa: string;
  max: number;
  minPass: number;
  parts: string[];
}

interface LevelRule {
  passMark: number;
  sections: SectionRule[];
}

const LANGUAGE = ["vocab", "kanji", "grammar"];

export const JLPT_RULES: Record<JlptLevelKey, LevelRule> = {
  n1: { passMark: 100, sections: threeSections() },
  n2: { passMark: 90, sections: threeSections() },
  n3: { passMark: 95, sections: threeSections() },
  n4: { passMark: 90, sections: twoSections() },
  n5: { passMark: 80, sections: twoSections() },
};

function threeSections(): SectionRule[] {
  return [
    {
      id: "language",
      name: "Kiến thức ngôn ngữ",
      nameJa: "言語知識（文字・語彙・文法）",
      max: 60,
      minPass: 19,
      parts: LANGUAGE,
    },
    {
      id: "reading",
      name: "Đọc hiểu",
      nameJa: "読解",
      max: 60,
      minPass: 19,
      parts: ["reading"],
    },
    {
      id: "listening",
      name: "Nghe",
      nameJa: "聴解",
      max: 60,
      minPass: 19,
      parts: ["listening"],
    },
  ];
}

function twoSections(): SectionRule[] {
  return [
    {
      id: "language",
      name: "Ngôn ngữ & Đọc hiểu",
      nameJa: "言語知識・読解",
      max: 120,
      minPass: 38,
      parts: [...LANGUAGE, "reading"],
    },
    {
      id: "listening",
      name: "Nghe",
      nameJa: "聴解",
      max: 60,
      minPass: 19,
      parts: ["listening"],
    },
  ];
}

export interface SectionPrediction {
  id: string;
  name: string;
  nameJa: string;
  max: number;
  minPass: number;
  /** Số câu đã làm ở phần này (trong các bài được tính) */
  questions: number;
  /** Số câu luyện tập (SRS, đọc, nghe chép) được tính phụ */
  practiceQuestions: number;
  practiceSources: string[];
  /** Tỷ lệ đúng ước lượng 0–1; null khi chưa có câu nào */
  accuracy: number | null;
  estimate: number;
  low: number;
  high: number;
  belowMinRisk: number;
}

export interface JlptPrediction {
  level: JlptLevelKey;
  attempts: number;
  passMark: number;
  maxTotal: number;
  total: { estimate: number; low: number; high: number };
  passProbability: number;
  confidence: "none" | "low" | "medium" | "high";
  sections: SectionPrediction[];
  missingSections: string[];
  weakestSection: string | null;
  advice: string[];
}

/** Bài gần nhất trọng số 1, mỗi bài cũ hơn ×0.8; tính tối đa 10 bài. */
const RECENCY = 0.8;
const MAX_ATTEMPTS = 10;
const SAMPLES = 4000;
const PRACTICE_WEIGHT = 0.25;
const PRACTICE_CAP = 40;

export function predictJlpt(
  level: JlptLevelKey,
  attempts: ExamAttempt[],
  practice: PracticeEvidence[] = [],
  seed = 20261103,
): JlptPrediction {
  const rule = JLPT_RULES[level];
  const recent = [...attempts]
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    )
    .slice(0, MAX_ATTEMPTS);

  const posteriors = rule.sections.map((s) => {
    let alpha = 1;
    let beta = 1;
    let questions = 0;
    recent.forEach((attempt, i) => {
      const w = RECENCY ** i;
      for (const part of attempt.sections) {
        if (!s.parts.includes(part.section) || part.total <= 0) continue;
        alpha += w * part.correct;
        beta += w * (part.total - part.correct);
        questions += part.total;
      }
    });
    const evidence = practice.filter(
      (p) => s.parts.includes(p.section) && p.total > 0,
    );
    const practiceTotal = evidence.reduce((a, p) => a + p.total, 0);
    const scale = practiceTotal
      ? Math.min(1, PRACTICE_CAP / practiceTotal) * PRACTICE_WEIGHT
      : 0;
    for (const p of evidence) {
      alpha += scale * p.correct;
      beta += scale * (p.total - p.correct);
    }
    return {
      rule: s,
      alpha,
      beta,
      questions,
      practiceQuestions: practiceTotal,
      practiceSources: [...new Set(evidence.map((p) => p.source))],
    };
  });

  const rand = mulberry32(seed);
  const totals: number[] = [];
  const perSection: number[][] = posteriors.map(() => []);
  let passes = 0;
  for (let n = 0; n < SAMPLES; n++) {
    let total = 0;
    let allAboveMin = true;
    posteriors.forEach((p, i) => {
      const score = sampleBeta(p.alpha, p.beta, rand) * p.rule.max;
      perSection[i].push(score);
      total += score;
      if (score < p.rule.minPass) allAboveMin = false;
    });
    totals.push(total);
    if (allAboveMin && total >= rule.passMark) passes++;
  }

  const sections: SectionPrediction[] = posteriors.map((p, i) => {
    const scores = perSection[i].sort((a, b) => a - b);
    const mean = p.alpha / (p.alpha + p.beta);
    return {
      id: p.rule.id,
      name: p.rule.name,
      nameJa: p.rule.nameJa,
      max: p.rule.max,
      minPass: p.rule.minPass,
      questions: p.questions,
      practiceQuestions: p.practiceQuestions,
      practiceSources: p.practiceSources,
      accuracy: p.questions || p.practiceQuestions ? round(mean, 3) : null,
      estimate: Math.round(mean * p.rule.max),
      low: Math.round(quantile(scores, 0.1)),
      high: Math.round(quantile(scores, 0.9)),
      belowMinRisk: round(
        scores.filter((s) => s < p.rule.minPass).length / scores.length,
        3,
      ),
    };
  });

  totals.sort((a, b) => a - b);
  const maxTotal = rule.sections.reduce((a, s) => a + s.max, 0);
  const missingSections = sections
    .filter((s) => s.questions === 0 && s.practiceQuestions === 0)
    .map((s) => s.name);
  const answered = sections.filter(
    (s) => s.questions > 0 || s.practiceQuestions > 0,
  );
  const hasData = recent.length > 0 || practice.some((p) => p.total > 0);
  const weakest = answered.length
    ? answered.reduce((w, s) =>
        s.estimate / s.max < w.estimate / w.max ? s : w,
      )
    : null;

  return {
    level,
    attempts: recent.length,
    passMark: rule.passMark,
    maxTotal,
    total: {
      estimate: sections.reduce((a, s) => a + s.estimate, 0),
      low: Math.round(quantile(totals, 0.1)),
      high: Math.round(quantile(totals, 0.9)),
    },
    passProbability: hasData ? round(passes / SAMPLES, 3) : 0,
    confidence: confidenceOf(recent.length, sections, hasData),
    sections,
    missingSections,
    weakestSection: weakest?.name ?? null,
    advice: adviceFor(
      level,
      rule,
      sections,
      missingSections,
      recent.length,
      hasData,
    ),
  };
}

function confidenceOf(
  attempts: number,
  sections: SectionPrediction[],
  hasData: boolean,
): JlptPrediction["confidence"] {
  if (!hasData) return "none";
  // Chỉ có luyện tập, chưa thi thử: luôn tin cậy thấp
  if (!attempts) return "low";
  const minQuestions = Math.min(...sections.map((s) => s.questions));
  if (minQuestions === 0 || attempts < 2) return "low";
  if (minQuestions >= 60 && attempts >= 4) return "high";
  return "medium";
}

function adviceFor(
  level: JlptLevelKey,
  rule: LevelRule,
  sections: SectionPrediction[],
  missing: string[],
  attempts: number,
  hasData: boolean,
): string[] {
  if (!hasData)
    return [`Làm ít nhất một đề thi thử ${level.toUpperCase()} để có dự đoán.`];
  const out: string[] = [];
  if (!attempts) {
    out.push(
      `Đây là dự đoán chỉ dựa trên kết quả luyện tập — làm một đề thi thử ${level.toUpperCase()} để biết sát hơn.`,
    );
  }
  if (missing.length) {
    out.push(
      `Chưa có dữ liệu phần ${missing.join(", ")} — hãy làm đề "đầy đủ" hoặc "luyện nghe" để dự đoán chính xác hơn.`,
    );
  }
  for (const s of sections) {
    if ((s.questions || s.practiceQuestions) && s.belowMinRisk >= 0.3) {
      out.push(
        `Phần ${s.name} có nguy cơ dưới điểm sàn (${s.minPass}/${s.max}) — dù tổng điểm đủ vẫn trượt.`,
      );
    }
  }
  const answered = sections.filter((s) => s.questions || s.practiceQuestions);
  if (answered.length) {
    const weakest = answered.reduce((w, s) =>
      s.estimate / s.max < w.estimate / w.max ? s : w,
    );
    const need = Math.max(
      0,
      rule.passMark - sections.reduce((a, s) => a + s.estimate, 0),
    );
    out.push(
      need > 0
        ? `Còn thiếu khoảng ${need} điểm để đạt mốc ${rule.passMark}. Phần nên ưu tiên: ${weakest.name} (${weakest.estimate}/${weakest.max}).`
        : `Điểm ước lượng đã qua mốc ${rule.passMark}. Giữ phong độ và củng cố phần ${weakest.name}.`,
    );
  }
  if (attempts > 0 && attempts < 3)
    out.push(
      "Mới có ít bài nên khoảng dao động còn rộng — làm thêm đề để dự đoán ổn định hơn.",
    );
  return out;
}

// ── Toán

function round(x: number, digits: number) {
  const f = 10 ** digits;
  return Math.round(x * f) / f;
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** RNG có hạt giống để kết quả lặp lại được (test ổn định, người dùng không thấy số nhảy). */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleNormal(rand: () => number) {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Marsaglia–Tsang. */
function sampleGamma(shape: number, rand: () => number): number {
  if (shape < 1) return sampleGamma(shape + 1, rand) * rand() ** (1 / shape);
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = sampleNormal(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function sampleBeta(alpha: number, beta: number, rand: () => number) {
  const x = sampleGamma(alpha, rand);
  const y = sampleGamma(beta, rand);
  return x / (x + y);
}

// ── Ngữ pháp: phần cố định của mẫu để đếm trong kho câu

const PLACEHOLDER =
  /(?:^|(?<=[\s～〜~／/＋+]))(?:N|V|A|Adj|Vる|Vた|Vて|Vない|Vます|普通形|名詞)(?=[ぁ-んァ-ン一-龯])/g;

/**
 * Các đoạn tiếng Nhật cố định của một mẫu (đủ dài để tìm trong câu):
 * 「〜うちに」→ [うちに], 「V(た)とたん(に)」→ [とたん], 「〜に関して／〜に関する」→ [に関して, に関する].
 * Bỏ phần đọc trong ngoặc, ký hiệu ～ và các chỗ trống N/V/A.
 */
export function grammarFragments(pattern: string): string[] {
  const cleaned = pattern
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/［[^］]*］|\[[^\]]*\]/g, "")
    .replace(PLACEHOLDER, "");
  const out = new Set<string>();
  for (const variant of cleaned.split(/[／/、,]/)) {
    // 「から こそ」→「からこそ」: dấu cách giữa hai phần tiếng Nhật chỉ là cách trình bày
    const joined = variant.replace(
      /(?<=[ぁ-んァ-ヶー一-龯々])\s+(?=[ぁ-んァ-ヶー一-龯々])/g,
      "",
    );
    const runs = joined.match(/[ぁ-んァ-ヶー一-龯々]+/g) ?? [];
    const longest = runs.sort((a, b) => b.length - a.length)[0];
    if (longest && isDistinctive(longest)) out.add(longest);
  }
  return [...out];
}

/** Động từ phụ / đuôi quá chung — đếm trong câu sẽ ra hàng nghìn kết quả vô nghĩa. */
const GENERIC_FRAGMENTS = new Set([
  "する",
  "ある",
  "いる",
  "なる",
  "れる",
  "られる",
  "させる",
  "たす",
  "です",
  "ます",
]);

/**
 * Đủ đặc trưng để đếm: ≥3 ký tự, hoặc 2 ký tự có kanji. Bỏ đoạn 1 chữ (「末」 khớp cả 週末, 月末)
 * và đoạn 2 chữ kana (「って」「もの」 trùng quá nhiều chữ khác).
 */
function isDistinctive(fragment: string) {
  if (GENERIC_FRAGMENTS.has(fragment)) return false;
  return (
    fragment.length >= 3 ||
    (fragment.length === 2 && /[一-龯々]/.test(fragment))
  );
}

// Cột chữ đứng trước đuôi ます (連用形) — dùng cho mẫu "V(ます bỏ) + …"
const STEM = "[いきしちにひみりぎじびえけせてねへめれげべ]";

/**
 * Luật cho mẫu không có đoạn cố định đủ dài (toàn chỗ trống V/N, hoặc lõi chỉ 1–2 chữ):
 * [điều kiện trên mẫu, các biểu thức tìm trong câu]. Luật đầu tiên khớp được dùng.
 * Các mục kiểu "Thể て của động từ" cố ý không có luật — câu nào cũng có, đếm vô nghĩa.
 */
const GRAMMAR_RULES: Array<[RegExp, RegExp[]]> = [
  // ── động từ ghép sau thể て
  [/て\)?\s*\+?\s*ある/, [/[てで]あ(?:る|り|っ)/]],
  [/て\)?\s*\+?\s*おく/, [/[てで]お(?:く|き|い|か|け)/]],
  [
    /て\)?\s*\+?\s*(?:くる|いく)/,
    [/[てで](?:く(?:る|れ)|き(?:た|ま|て))/, /[てで]い(?:く|き|っ)/],
  ],
  [/て\)?\s*\+?\s*みる/, [/[てで]み(?:る|た|ま|て|よ)/]],
  [/て\)?\s*\+?\s*こそ/, [/[てで]こそ/]],
  [/て\)?\s*\+?\s*まで/, [/[てで]まで/]],
  [/て\)?\s*\+?\s*でも/, [/[てで]でも/]],
  [/て\)?\s*\+?\s*は$/, [/[てで]は(?:いけ|だめ|なら|困)/]],
  [/[てで]\)?\s*[＋+]?\s*も|〜ても/, [/[てで]も/]],
  // ── thể chia
  [/使役受身/, [/(?:させ|[わかさたなばまらが]され)(?:る|た|ま|て)/]],
  // 合わせる, 欠かせない, 済ませる, 知らせる, 任せる là động từ riêng, không phải thể sai khiến.
  [
    /sai khiến|使役/,
    [/(?:させ|(?<![合欠済知任])[わかさたなばまらが]せ)(?:る|た|ま|て|な)/],
  ],
  [/bị động|受身/, [/(?:られ|[わかさたなばまらが]れ)(?:る|た|ま|て)/]],
  [/khả năng|可能/, [/(?:でき|られ)(?:る|ま|た|な)/]],
  [/ý chí|意向/, [/(?:よう|[おこそとのぼもろご]う)と(?:思|する|し)/]],
  [/たり.*たり|り\s*\+.*り\s*\+?\s*する/, [/[たっだ]り.{1,10}[たっだ]り/]],
  [/ば\s*[＋+～〜]?\s*.*ほど/, [/ば.{1,8}ほど/]],
  [/たら|\(た\)\s*\+\s*ら|quá khứ\s*＋\s*ら/, [/[たっだ]ら/]],
  [
    /つ\s*[＋+〜]?\s*.*つ$|〜つ〜つ/,
    [/(?:行きつ戻りつ|浮きつ沈みつ|持ちつ持たれつ|差しつ差されつ)/],
  ],
  [/つつ/, [/つつ/]],
  [/ます bỏ.*方|\+ 方/, [new RegExp(`${STEM}方`)]],
  [/ます bỏ.*かけ/, [new RegExp(`${STEM}かけ(?:の|て|た|だ)`)]],
  [/がち/, [/がち/]],
  [/まい/, [/まい(?:が|と|か)/]],
  [/だす/, [new RegExp(`${STEM}(?:だ|出)(?:す|し)`)]],
  [/ぶる/, [/ぶ(?:る|って|った)/]],
  [/めく/, [/め(?:く|いて|いた)/]],
  [/べく/, [/べく/]],
  [/ぎみ/, [/気味|ぎみ/]],
  [/〜げ$/, [/げ(?:に|な)/]],
  [/のが\s*[＋+]?\s*好き/, [/のが好き/]],
  [/のは\s*[＋+]/, [/のは.{1,10}です/]],
  // ── lõi 1–2 chữ
  [/末/, [/末に|の末/]],
  [/際/, [/際に|際は|の際/]],
  [/折/, [/折に|折り/]],
  [/ゆえ/, [/ゆえ|故に/]],
  [/たび/, [/たびに|度に/]],
  [/ため/, [/ために|ため、|のため/]],
  [/きり/, [/きり/]],
  [/なり/, [/るなり|なり、/]],
  [/だに/, [/だに/]],
  [/とて/, [/とて/]],
  [/さえ.*ば/, [/さえ.{1,10}ば/]],
  [/さえ|すら/, [/さえ|すら/]],
  [/しか/, [/しか.{0,10}(?:ない|ません)/]],
  [/ほど.*ない/, [/ほど.{0,10}(?:ない|ません)/]],
  [/ほど/, [/ほど/]],
  [/もの|もん/, [/ものですから|ものだから|もん/]],
  [/のに/, [/のに/]],
  [/ので/, [/ので/]],
  [/けど/, [/けど/]],
  [/だけ/, [/だけ/]],
  [/とか/, [/とか/]],
  [/って/, [/って(?:言|いう|聞|。)/]],
  [/し、.*し/, [/し、.{1,12}し/]],
  [/し、/, [/し、/]],
  [/[てで]、\s*V\s*[てで]/, [/[てで]、.{1,10}[てで]、/]],
  [/Số đếm/, [/[一二三四五六七八九十0-9０-９]+(?:つ|人|台|枚|回)/]],
  [/V\(ば\)|điều kiện ば/, [/[えけせてねへめれげべ]ば[、,]/]],
  [/から.*まで/, [/から.{0,12}まで/]],
  [/より/, [/より/]],
  [/なら/, [/なら/]],
  [/とき/, [/とき|時、|時に/]],
  [/から、|〜から$/, [/から、/]],
  [/が、/, [/が、/]],
  [/と、/, [/と、/]],
  // ── từ chỉ định, từ để hỏi, trợ từ N5
  [/この.*その.*あの/, [/この|その|あの/]],
  [/これ.*それ.*あれ/, [/これ|それ|あれ/]],
  [/どれ/, [/どれ/]],
  [/どの/, [/どの/]],
  [/いつ/, [/いつ/]],
  [/ぜひ/, [/ぜひ/]],
  [/まだ/, [/まだ/]],
  [/さん/, [/さん/]],
  [/は\s*N2\s*です|は.*です$/, [/は.{1,12}です/]],
  [/や\s*N2|や$/, [/や/]],
  [/と\s*N2|（người.*と/, [/と/]],
  [/N\s*も$|＋\s*も$/, [/も/]],
  [/の\s*N2/, [/の/]],
  [/を\s*V/, [/を/]],
  [/で\s*V|で（|）で$/, [/で/]],
  [/に\s*V|）に/, [/に/]],
  [/か[、。]?$|S\s*＋\s*か/, [/か[。？?]/]],
  [/～ね$/, [/ね[。！!]/]],
  [/～よ$/, [/よ[。！!]/]],
];

/** Người bề trên — có mặt trong câu (không phải làm tác nhân 「…に」) thì đuôi れる/られる là tôn kính. */
const HONORED =
  "(?:先生|社長|会長|部長|課長|店長|校長|教授|先輩|お客様|皆様|皆さん|お父様|お母様|奥様|ご主人)";
/** Một câu (không vượt qua dấu kết câu). */
const IN_SENTENCE = "[^。！？!?\\n]";
/** に chỉ thời gian (何時に, 3日に, 前に…) không phải tác nhân của câu bị động. */
const AGENT_NI = "(?<![時日年月分週頃前後中間度])(?:に|によって)";
/** Tác nhân bị động kể cả 「…から」 (課長から叱られた) — trừ から chỉ thời gian (来月から, 午後から). */
const AGENT_ANY = "(?<![時日年月分週頃前後中間度])(?:に|によって|から)";
/** Đuôi れる/られる đã chia (dùng chung cho tôn kính và bị động). */
// 「〜になれます」 là thể khả năng của なる, không phải bị động.
const PASSIVE_END = "(?:ます|ました|ません|る|た|て|ない|なかった)";
const PASSIVE_FORM =
  "(?:られ|(?<!に)なれ|[わかさたばまらが]れ)(?:ます|ました|る|た|て)";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Luật xét TRƯỚC đoạn cố định: mẫu chỉ khác mẫu khác ở trợ từ đứng trước nên đoạn cố định
 * giống hệt nhau. 「N1（địa điểm）で N2（sự kiện）が あります」 (sự kiện diễn ra ở đâu) và
 * 「N が あります」 (tồn tại) cùng có 「があります」 nhưng là hai điểm ngữ pháp khác nhau.
 */
const PRIORITY_RULES: Array<[RegExp, RegExp[]]> = [
  [
    /で\s*N2[^が]*が\s*あります/,
    [/で[^。、]{1,15}が(?:あります|ありました|ある)/],
  ],
  // Tôn kính và bị động cùng dạng れる/られる — tách theo ngữ cảnh: tôn kính có chủ ngữ là
  // người bề trên, bị động có tác nhân 「…に / …によって」 đứng trước động từ.
  // Tôn kính: trong câu có người bề trên không đứng ngay trước 「に」, chủ ngữ có thể lược
  // (「社長、何時に来られますか」 vẫn tính).
  // Câu đã có tác nhân bị động 「…に…られた」 thì không tính là tôn kính.
  // Người bề trên phải là chủ ngữ / người được gọi (「社長は」「社長、」), không phải người
  // sở hữu (「社長の手腕」) hay tác nhân (「社長に」「課長から」).
  // Sai khiến bị động: させられる luôn đúng; dạng rút gọn 〜される chỉ nhận với động từ quen thuộc
  // (待たされる, 聞かされる…) vì 減らされる, 動かされる là bị động thường của động từ đuôi す.
  [
    /sai khiến bị động|使役受身|させられる/,
    [
      new RegExp(
        `(?:[かがさたなばまらわ]せられ|(?:待た|聞か|飲ま|行か|書か|読ま|歌わ|買わ|言わ|立た|驚か|歩か|働か|習わ|払わ|持た|作ら|座ら|走ら|帰ら|泣か|笑わ|思わ|手伝わ|やら|吸わ)され)${PASSIVE_END}`,
      ),
    ],
  ],
  // お＋V(ます bỏ)＋になる / ご＋N＋になる — cần đủ お/ご và gốc động từ, không chỉ 「になります」.
  [
    /お\s*\+?\s*V.*に\s*な(?:り|る)/,
    [
      /(?:お(?!金持)[一-龯]{1,2}[ぁ-ん]?[いきしちにひみりぎじびえけせてねめれげべ]|ご[一-龯]{2})に(?:なり|なる|なっ|なら|なれ)/,
    ],
  ],
  // Động từ tôn kính đặc biệt (いらっしゃる, 召し上がる…) là từ riêng, không phải dạng れる/られる.
  // なさい đứng một mình là mệnh lệnh (選びなさい) nên không tính.
  [
    /tôn kính đặc biệt|特別尊敬/,
    [
      /いらっしゃ|召し上が|めしあが|おっしゃ|(?:ご|御)覧に|ごらんに|なさ(?:いま|る|った|って|らない)/,
    ],
  ],
  // 「V(受身/使役) trong văn viết trang trọng」 là kính ngữ dạng られる, không phải bị động.
  [
    /tôn kính|尊敬|受身\/使役/,
    [
      new RegExp(
        `(?=${IN_SENTENCE}*${HONORED}(?:は|が|も|、|,))(?!${IN_SENTENCE}*${AGENT_ANY}[^。、]{0,15}${PASSIVE_FORM})${IN_SENTENCE}*${PASSIVE_FORM}`,
      ),
    ],
  ],
  // 「N1 は N2 が A です」 (象は鼻が長いです) khác câu 「N1 は N2 です」
  [/は\s*N2\s*が\s*A/, [/は[^。、]{1,10}が[^。、]{1,10}です/]],
  // 「もう V ました」 (đã … rồi) khác thì quá khứ thường
  [/^もう\s*V/, [/もう[^。]{0,12}ました/]],
  // Hỏi lựa chọn 「A か、B か」 khác câu hỏi thường 「〜か」
  [/S1\s*か、\s*S2\s*か/, [/か、[^。]{1,15}か[。？?]/]],
  // 「もし／いくら〜ても」 (giả định, dù cho) khác từ để hỏi いくら (bao nhiêu)
  [/^もし／いくら/, [/(?:もし|いくら)[^。]{1,15}(?:ても|でも|たら|ば)/]],
  // Kính ngữ 「お待ちください／ご確認ください」 khác 「V て ください」
  [/お\s*V.*ご\s*N.*ください/, [/[おご][ぁ-ん一-龯]{1,5}ください/]],
  // 「V(た) + ばかり」 (vừa mới) khác 「V(て) + ばかりいる」 (toàn là)
  [/\(た\)\s*\+\s*ばかり/, [/[たっだ]ばかり/]],
  [/\(て\)\s*\+\s*ばかり/, [/[てで]ばかり(?:い|だ|で)/]],
  [
    /bị động|受身|によって\s*V\s*られ|に\s*(?:N\d\s*を\s*)?V\s*られ/,
    [new RegExp(`${AGENT_NI}[^。、]{0,15}${PASSIVE_FORM}`)],
  ],
];

/**
 * Biểu thức để tìm một mẫu ngữ pháp trong câu: các đoạn cố định của mẫu nếu đủ đặc trưng
 * (「〜せいか」, 「〜上で」), chỉ khi không có mới dùng luật riêng (GRAMMAR_RULES) — luật rộng
 * hơn nên để sau, tránh 「〜せいか」 rơi vào luật trợ từ か. Rỗng = không đo được.
 */
export function grammarMatchers(pattern: string): RegExp[] {
  const priority = PRIORITY_RULES.find(([test]) => test.test(pattern));
  if (priority) return priority[1];
  const fragments = grammarFragments(pattern);
  if (fragments.length)
    return fragments.map((f) => new RegExp(escapeRegExp(f)));
  return GRAMMAR_RULES.find(([test]) => test.test(pattern))?.[1] ?? [];
}

/** Nhãn chức năng ghi trong mẫu — cùng hình thức nhưng khác chức năng thì không phải một mẫu. */
const FUNCTION_TAGS = [
  "tôn kính",
  "khiêm nhường",
  "bị động",
  "sai khiến",
  "khả năng",
  "nguyên nhân",
  "mục đích",
  "lý do",
  "trình tự",
  "đối chiếu",
  "tỷ lệ",
  "bất ngờ",
  "giới hạn",
  "điều kiện",
  "nhượng bộ",
  "đang diễn ra",
  "thói quen",
  "trạng thái",
  "nghề nghiệp",
  "kết quả",
  "nhìn thấy",
  "nghe nói",
  "dáng vẻ",
  "truyền đạt",
  "có vẻ",
  "biến đổi",
  "quyết định",
  "sau khi",
  "đúng chất",
  "受身",
  "使役",
  "可能",
  "尊敬",
  "謙譲",
];

/**
 * Hai cách ghi có phải cùng một điểm ngữ pháp không, xét theo nhãn chức năng:
 * 「V られます（tôn kính）」 và 「N1 は N2 に V られます」 (bị động) cùng dạng られます nhưng khác nhau.
 */
export function sameGrammarFunction(a: string, b: string): boolean {
  const tags = (text: string) =>
    FUNCTION_TAGS.filter((t) => text.toLowerCase().includes(t))
      .sort()
      .join("|");
  return tags(a) === tags(b);
}
