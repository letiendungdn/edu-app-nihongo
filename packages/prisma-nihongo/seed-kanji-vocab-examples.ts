import { PrismaClient, type PrismaClient as PrismaClientType } from './generated/client';

type Example = { exampleJa: string; exampleKana: string | null; exampleVi: string };

/** Hand-tuned examples for high-traffic related-vocab rows (e.g. 一). */
const CURATED: Record<string, Example> = {
  '一|いち': {
    exampleJa: '一と二を足してください。',
    exampleKana: 'いちとにをたしてください。',
    exampleVi: 'Hãy cộng một với hai.',
  },
  '一つ|ひとつ': {
    exampleJa: 'りんごを一つください。',
    exampleKana: 'りんごをひとつください。',
    exampleVi: 'Cho tôi một quả táo.',
  },
  '一時|いちじ': {
    exampleJa: '一時に会いましょう。',
    exampleKana: 'いちじにあいましょう。',
    exampleVi: 'Hẹn gặp lúc 1 giờ.',
  },
  '一分|いっぷん': {
    exampleJa: '一分待ってください。',
    exampleKana: 'いっぷんまってください。',
    exampleVi: 'Xin đợi một phút.',
  },
  '一月|いちがつ': {
    exampleJa: '一月に日本へ行きます。',
    exampleKana: 'いちがつににほんへいきます。',
    exampleVi: 'Tháng 1 tôi đi Nhật.',
  },
  '一日|いちにち': {
    exampleJa: '一日中勉強しました。',
    exampleKana: 'いちにちじゅうべんきょうしました。',
    exampleVi: 'Tôi học suốt cả ngày.',
  },
  '一日|ついたち': {
    exampleJa: '今日は一日です。',
    exampleKana: 'きょうはついたちです。',
    exampleVi: 'Hôm nay là mùng 1.',
  },
  '一人|ひとり': {
    exampleJa: '一人で行きます。',
    exampleKana: 'ひとりでいきます。',
    exampleVi: 'Tôi đi một mình.',
  },
  '一番|いちばん': {
    exampleJa: 'これが一番好きです。',
    exampleKana: 'これがいちばんすきです。',
    exampleVi: 'Tôi thích cái này nhất.',
  },
  '一本|いっぽん': {
    exampleJa: 'ペンが一本あります。',
    exampleKana: 'ペンがいっぽんあります。',
    exampleVi: 'Có một cây bút.',
  },
};

function shortMeaning(meaningVi: string): string {
  const dash = meaningVi.split(/\s*[-–—]\s*/);
  const base = (dash.length > 1 ? dash[dash.length - 1] : meaningVi).trim();
  return base.replace(/^\([^)]*\)\s*/, '').trim() || meaningVi.trim();
}

function keyOf(word: string, reading: string): string {
  return `${word}|${reading}`;
}

/** Số đếm viết bằng chữ Hán hoặc chữ số: 三, 十二, ２… (chỉ những từ này mới ghép khuôn câu an toàn). */
const NUMERAL = /^[一二三四五六七八九十百千0-9０-９]+/;

/**
 * Chỉ sinh câu khi chắc chắn tự nhiên: câu soạn tay (CURATED) và vài khuôn cho từ chỉ số lượng/thời gian
 * (三分 → 三分待ってください). Trước đây mọi từ còn lại bị ghép vào 「これは〜です」/「このりんごは〜です」
 * và sinh ra hàng nghìn câu vô nghĩa (このりんごは忙しいです) — giờ để trống cho người soạn điền.
 */
function generateExample(word: string, reading: string, meaningVi: string): Example | null {
  const curated = CURATED[keyOf(word, reading)];
  if (curated) return curated;
  if (!NUMERAL.test(word)) return null;

  const meaning = shortMeaning(meaningVi);

  if (/分$/.test(word) && /ふん$|ぷん$/.test(reading)) {
    return {
      exampleJa: `${word}待ってください。`,
      exampleKana: `${reading}まってください。`,
      exampleVi: `Xin đợi ${meaning}.`,
    };
  }
  if (/月$/.test(word) && /がつ$/.test(reading)) {
    return {
      exampleJa: `${word}に旅行します。`,
      exampleKana: `${reading}にりょこうします。`,
      exampleVi: `${meaning} tôi đi du lịch.`,
    };
  }
  if (/時$/.test(word) && /じ$/.test(reading)) {
    return {
      exampleJa: `今、${word}です。`,
      exampleKana: `いま、${reading}です。`,
      exampleVi: `Bây giờ là ${meaning}.`,
    };
  }
  if (/本$/.test(word) && /ほん$|ぽん$|ぼん$/.test(reading)) {
    return {
      exampleJa: `ペンが${word}あります。`,
      exampleKana: `ペンが${reading}あります。`,
      exampleVi: `Có ${meaning} bút.`,
    };
  }
  return null;
}

export async function seedKanjiVocabExamples(prisma: PrismaClientType) {
  const force = process.env.FORCE_KANJI_VOCAB_EXAMPLES_SEED === '1';
  const missing = await prisma.kanjiVocab.count({
    where: { OR: [{ exampleJa: null }, { exampleJa: '' }] },
  });
  const total = await prisma.kanjiVocab.count();

  if (missing === 0 && !force) {
    console.log(`KanjiVocab examples đã đủ (${total} mục). Bỏ qua seed.`);
    console.log('  FORCE_KANJI_VOCAB_EXAMPLES_SEED=1 để ghi đè toàn bộ.');
    return;
  }

  if (force) {
    await prisma.kanjiVocab.updateMany({
      data: { exampleJa: null, exampleKana: null, exampleVi: null },
    });
  }

  // Copy from Vocabulary by written form when still empty
  await prisma.$executeRawUnsafe(`
    UPDATE "KanjiVocab" kv
    SET
      "exampleJa" = v."exampleJa",
      "exampleKana" = v."exampleKana",
      "exampleVi" = v."exampleVi"
    FROM (
      SELECT DISTINCT ON (kanji)
        kanji AS word,
        "exampleJa",
        "exampleKana",
        "exampleVi"
      FROM "Vocabulary"
      WHERE kanji IS NOT NULL
        AND kanji <> ''
        AND "exampleJa" IS NOT NULL
        AND "exampleJa" <> ''
      ORDER BY kanji, id
    ) v
    WHERE kv.word = v.word
      AND (kv."exampleJa" IS NULL OR kv."exampleJa" = '')
  `);

  const rows = await prisma.kanjiVocab.findMany({
    where: { OR: [{ exampleJa: null }, { exampleJa: '' }] },
    select: { id: true, word: true, reading: true, meaningVi: true },
  });

  const BATCH = 100;
  let updated = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const writes = chunk.flatMap((row) => {
        const ex = generateExample(row.word, row.reading, row.meaningVi);
        if (!ex) return [];
        return prisma.kanjiVocab.update({
          where: { id: row.id },
          data: {
            exampleJa: ex.exampleJa,
            exampleKana: ex.exampleKana,
            exampleVi: ex.exampleVi,
          },
        });
      });
    await prisma.$transaction(writes);
    updated += writes.length;
  }

  const filled = await prisma.kanjiVocab.count({
    where: { exampleJa: { not: null } },
  });
  console.log(
    `KanjiVocab examples: cập nhật ${updated} mục; hiện có ví dụ ${filled}/${total}.`,
  );
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedKanjiVocabExamples(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
