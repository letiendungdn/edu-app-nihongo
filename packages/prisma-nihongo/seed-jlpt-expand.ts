/**
 * Bổ sung JLPT N2/N1 (kanji, từ vựng, ngữ pháp) — upsert idempotent, không xoá nội dung cũ.
 * Đồng thời gắn jlptLevel cho Minna (bài 1–50).
 *
 *   npm run seed:jlpt-expand -w @edu/prisma-nihongo
 */
import { PrismaClient, type PrismaClient as PrismaClientType } from './generated/client';
import { JLPT_KANJI_EXPAND } from './jlpt-kanji-expand.data';
import { JLPT_KANJI_BOOST2 } from './jlpt-kanji-boost2.data';
import { JLPT_KANJI_BOOST2_N2 } from './jlpt-kanji-boost2-n2.data';
import { JLPT_KANJI_BOOST2_N1 } from './jlpt-kanji-boost2-n1.data';
import { JLPT_KANJI_BOOST3_N2 } from './jlpt-kanji-boost3-n2.data';
import { JLPT_KANJI_BOOST4_N1_A } from './jlpt-kanji-boost4-n1a.data';
import { JLPT_KANJI_BOOST4_N1_B } from './jlpt-kanji-boost4-n1b.data';
import { JLPT_KANJI_BOOST4_N1_C } from './jlpt-kanji-boost4-n1c.data';
import { JLPT_KANJI_BOOST4_N1_D } from './jlpt-kanji-boost4-n1d.data';
import { JLPT_KANJI_BOOST4_N1_E } from './jlpt-kanji-boost4-n1e.data';
import { JLPT_KANJI_BOOST4_N1_F } from './jlpt-kanji-boost4-n1f.data';
import { JLPT_KANJI_BOOST4_N1_G } from './jlpt-kanji-boost4-n1g.data';
import { JLPT_KANJI_BOOST4_N1_H } from './jlpt-kanji-boost4-n1h.data';
import { JLPT_KANJI_BOOST4_N1_I } from './jlpt-kanji-boost4-n1i.data';
import { JLPT_KANJI_MISSING } from './jlpt-kanji-missing.data';
import { JLPT_VOCAB_EXPAND } from './jlpt-vocab-expand.data';
import { JLPT_VOCAB_GAP_TOPUP } from './jlpt-vocab-gap-topup.data';
import { JLPT_VOCAB_REVIEW_BOOST } from './jlpt-vocab-review-boost.data';
import { JLPT_VOCAB_BOOST3_N5 } from './jlpt-vocab-boost3-n5.data';
import { JLPT_VOCAB_BOOST3_N4 } from './jlpt-vocab-boost3-n4.data';
import { JLPT_VOCAB_BOOST3_N3 } from './jlpt-vocab-boost3-n3.data';
import { JLPT_VOCAB_BOOST3_N2 } from './jlpt-vocab-boost3-n2.data';
import { JLPT_VOCAB_BOOST3_N1 } from './jlpt-vocab-boost3-n1.data';
import { JLPT_VOCAB_BOOST4_N5 } from './jlpt-vocab-boost4-n5.data';
import { JLPT_VOCAB_BOOST4_N4 } from './jlpt-vocab-boost4-n4.data';
import { JLPT_VOCAB_BOOST4_N3_PART1 } from './jlpt-vocab-boost4-n3a.data';
import { JLPT_VOCAB_BOOST4_N3_PART2 } from './jlpt-vocab-boost4-n3b.data';
import { JLPT_VOCAB_BOOST4_N3_PART3 } from './jlpt-vocab-boost4-n3c.data';
import { JLPT_VOCAB_BOOST4_N3_PART4 } from './jlpt-vocab-boost4-n3d.data';
import { JLPT_VOCAB_BOOST4_N3_PART5 } from './jlpt-vocab-boost4-n3e.data';
import { JLPT_VOCAB_BOOST4_N3_PART6 } from './jlpt-vocab-boost4-n3f.data';
import { JLPT_VOCAB_BOOST4_N3_PART7 } from './jlpt-vocab-boost4-n3g.data';
import { JLPT_VOCAB_BOOST4_N3_PART8 } from './jlpt-vocab-boost4-n3h.data';
import { JLPT_VOCAB_BOOST4_N2_PART1 } from './jlpt-vocab-boost4-n2a.data';
import { JLPT_VOCAB_BOOST4_N2_PART2 } from './jlpt-vocab-boost4-n2b.data';
import { JLPT_VOCAB_BOOST4_N2_PART3 } from './jlpt-vocab-boost4-n2c.data';
import { JLPT_VOCAB_BOOST4_N2_PART4 } from './jlpt-vocab-boost4-n2d.data';
import { JLPT_VOCAB_BOOST4_N2_PART5 } from './jlpt-vocab-boost4-n2e.data';
import { JLPT_VOCAB_BOOST4_N2_PART6 } from './jlpt-vocab-boost4-n2f.data';
import { JLPT_VOCAB_BOOST4_N2_PART7 } from './jlpt-vocab-boost4-n2g.data';
import { JLPT_VOCAB_BOOST4_N2_PART8 } from './jlpt-vocab-boost4-n2h.data';
import { JLPT_VOCAB_BOOST4_N2_PART9 } from './jlpt-vocab-boost4-n2i.data';
import { JLPT_VOCAB_BOOST4_N1_PART1 } from './jlpt-vocab-boost4-n1a.data';
import { JLPT_VOCAB_BOOST4_N1_PART2 } from './jlpt-vocab-boost4-n1b.data';
import { JLPT_VOCAB_BOOST4_N1_PART3 } from './jlpt-vocab-boost4-n1c.data';
import { JLPT_VOCAB_BOOST4_N1_PART4 } from './jlpt-vocab-boost4-n1d.data';
import { JLPT_VOCAB_BOOST4_N1_PART5 } from './jlpt-vocab-boost4-n1e.data';
import { JLPT_VOCAB_BOOST4_N1_PART6 } from './jlpt-vocab-boost4-n1f.data';
import { JLPT_VOCAB_BOOST4_N1_PART7 } from './jlpt-vocab-boost4-n1g.data';
import { JLPT_VOCAB_BOOST4_N1_PART8 } from './jlpt-vocab-boost4-n1h.data';
import { JLPT_VOCAB_BOOST4_N1_PART9 } from './jlpt-vocab-boost4-n1i.data';
import { JLPT_VOCAB_BOOST4_N1_PART10 } from './jlpt-vocab-boost4-n1j.data';
import { JLPT_VOCAB_BOOST4_N1_PART11 } from './jlpt-vocab-boost4-n1k.data';
import { JLPT_VOCAB_BOOST4_N1_PART12 } from './jlpt-vocab-boost4-n1l.data';
import { JLPT_VOCAB_BOOST4_N1_PART13 } from './jlpt-vocab-boost4-n1m.data';
import { JLPT_VOCAB_BOOST4_N1_PART14 } from './jlpt-vocab-boost4-n1n.data';
import { JLPT_VOCAB_BOOST4_N1_PART15 } from './jlpt-vocab-boost4-n1o.data';
import { JLPT_VOCAB_BOOST4_N1_PART16 } from './jlpt-vocab-boost4-n1p.data';
import { JLPT_VOCAB_BOOST4_N1_PART17 } from './jlpt-vocab-boost4-n1q.data';
import { JLPT_VOCAB_BOOST4_N1_PART18 } from './jlpt-vocab-boost4-n1r.data';
import { JLPT_VOCAB_BOOST4_N1_PART19 } from './jlpt-vocab-boost4-n1s.data';
import { JLPT_VOCAB_BOOST4_N1_PART20 } from './jlpt-vocab-boost4-n1t.data';
import { JLPT_VOCAB_BOOST4_N1_PART21 } from './jlpt-vocab-boost4-n1u.data';
import { JLPT_VOCAB_BOOST4_N1_PART22 } from './jlpt-vocab-boost4-n1v.data';
import { JLPT_VOCAB_BOOST4_N1_PART23 } from './jlpt-vocab-boost4-n1w.data';
import { JLPT_VOCAB_BOOST5_N3 } from './jlpt-vocab-boost5-n3.data';
import { JLPT_VOCAB_BOOST5_N2 } from './jlpt-vocab-boost5-n2.data';
import { JLPT_VOCAB_BOOST5_N1 } from './jlpt-vocab-boost5-n1.data';
import { JLPT_GRAMMAR_EXPAND } from './jlpt-grammar-expand.data';
import { JLPT_GRAMMAR_GAP_FILL } from './jlpt-grammar-gap-fill.data';
import { JLPT_VOCAB_UNITS } from './jlpt-vocab.data';
import { JLPT_GRAMMAR_UNITS, type JlptGrammarUnit } from './jlpt-grammar.data';
import { seedJlptTags } from './seed-jlpt-tags';

// ⚠️ ĐÃ TẮT: JLPT_KANJI_GAP_FILL (jlpt-kanji-gap-fill.data.ts) và
// JLPT_VOCAB_GAP_FILL (jlpt-vocab-gap-fill.data.ts) — cả hai được sinh tự động
// bởi scripts/build-jlpt-{kanji,vocab}-gap-fill.mjs từ dữ liệu tiếng Anh của
// OpenJLPT. Bộ dịch EN→VI trong script chỉ tra một bảng ~70 từ đơn rồi giữ
// nguyên phần còn lại — phần lớn "meaning"/"meaningVi" bị bỏ sót vẫn là tiếng
// Anh, hoặc thành "để" vô nghĩa (do EN_VI['to'] = 'để' áp lên mọi cụm bắt đầu
// bằng "to "). App này chủ yếu Việt–Nhật nên KHÔNG được seed dữ liệu này cho
// tới khi có bản dịch tiếng Việt đáng tin cậy. Đừng import lại hai file trên
// vào mảng seed bên dưới trừ khi đã dịch lại toàn bộ "meaning"/"meaningVi".

function dedupeBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function findGrammarUnit(lessonNumber: number): JlptGrammarUnit | undefined {
  return (
    JLPT_GRAMMAR_UNITS.find((g) => g.lessonNumber === lessonNumber) ??
    JLPT_GRAMMAR_EXPAND.find((g) => g.lessonNumber === lessonNumber) ??
    JLPT_GRAMMAR_GAP_FILL.find((g) => g.lessonNumber === lessonNumber)
  );
}

function normPattern(p: string): string {
  return p.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function seedGrammarForLesson(
  prisma: PrismaClientType,
  unit: JlptGrammarUnit,
  globalGrammarPatterns: Set<string>,
): Promise<number> {
  const items = dedupeBy(unit.items, (i) => i.pattern);
  const lesson = await prisma.lesson.upsert({
    where: { lessonNumber: unit.lessonNumber },
    update: { title: unit.title, jlptLevel: unit.jlptLevel, sortOrder: unit.sortOrder },
    create: {
      lessonNumber: unit.lessonNumber,
      title: unit.title,
      jlptLevel: unit.jlptLevel,
      sortOrder: unit.sortOrder,
    },
  });

  const existing = await prisma.grammar.findMany({
    where: { lessonId: lesson.id },
    select: { pattern: true, sortOrder: true },
  });
  const existingPatterns = new Set(existing.map((g) => g.pattern));
  let sortOrder = existing.reduce((max, g) => Math.max(max, g.sortOrder), -1) + 1;
  let added = 0;

  for (const item of items) {
    if (existingPatterns.has(item.pattern)) continue;
    if (globalGrammarPatterns.has(normPattern(item.pattern))) continue;
    await prisma.grammar.create({
      data: {
        pattern: item.pattern,
        meaning: item.meaning,
        explanation: item.explanation ?? null,
        formalityLevel: item.formalityLevel ?? null,
        jlptLevel: unit.jlptLevel,
        sortOrder: sortOrder++,
        lessonId: lesson.id,
        examples: {
          create: item.examples.map((ex, i) => ({
            jp: ex.jp,
            romaji: ex.romaji,
            vi: ex.vi,
            sortOrder: i,
          })),
        },
      },
    });
    globalGrammarPatterns.add(normPattern(item.pattern));
    added++;
  }

  return added;
}

export async function seedJlptExpand(prisma: PrismaClientType) {
  await seedJlptTags(prisma);

  let kanjiAdded = 0;
  let vocabAdded = 0;
  let grammarAdded = 0;
  let lessonCreated = 0;

  const globalKanjiChars = new Set(
    (await prisma.kanjiEntry.findMany({ select: { character: true } })).map((e) => e.character),
  );
  const globalGrammarPatterns = new Set(
    (await prisma.grammar.findMany({ select: { pattern: true } })).map((g) => normPattern(g.pattern)),
  );

  // ─── Kanji (KanjiLesson) ───────────────────────────────────────────
  for (const kl of [
    ...JLPT_KANJI_EXPAND,
    ...JLPT_KANJI_BOOST2,
    ...JLPT_KANJI_BOOST2_N2,
    ...JLPT_KANJI_BOOST2_N1,
    ...JLPT_KANJI_BOOST3_N2,
    ...JLPT_KANJI_BOOST4_N1_A,
    ...JLPT_KANJI_BOOST4_N1_B,
    ...JLPT_KANJI_BOOST4_N1_C,
    ...JLPT_KANJI_BOOST4_N1_D,
    ...JLPT_KANJI_BOOST4_N1_E,
    ...JLPT_KANJI_BOOST4_N1_F,
    ...JLPT_KANJI_BOOST4_N1_G,
    ...JLPT_KANJI_BOOST4_N1_H,
    ...JLPT_KANJI_BOOST4_N1_I,
    ...JLPT_KANJI_MISSING,
  ]) {
    const entries = dedupeBy(kl.entries, (e) => e.character);
    const lesson = await prisma.kanjiLesson.upsert({
      where: { lessonNumber: kl.lessonNumber },
      update: { title: kl.title, jlptLevel: kl.jlptLevel, sortOrder: kl.sortOrder },
      create: {
        lessonNumber: kl.lessonNumber,
        title: kl.title,
        jlptLevel: kl.jlptLevel,
        sortOrder: kl.sortOrder,
      },
    });

    const existing = await prisma.kanjiEntry.findMany({
      where: { lessonId: lesson.id },
      select: { character: true, sortOrder: true },
    });
    const existingChars = new Set(existing.map((e) => e.character));
    let sortOrder = existing.reduce((max, e) => Math.max(max, e.sortOrder), -1) + 1;

    for (const e of entries) {
      if (existingChars.has(e.character)) continue;
      if (globalKanjiChars.has(e.character)) continue;
      await prisma.kanjiEntry.create({
        data: {
          character: e.character,
          hanViet: e.hanViet ?? null,
          onyomi: e.onyomi ?? null,
          kunyomi: e.kunyomi ?? null,
          meaningVi: e.meaningVi,
          mnemonicVi: e.mnemonicVi ?? null,
          jlptLevel: kl.jlptLevel,
          strokeCount: e.strokeCount ?? null,
          grade: e.grade ?? null,
          sortOrder: sortOrder++,
          lessonId: lesson.id,
          vocabularies: e.vocabularies?.length
            ? {
                create: e.vocabularies.map((v, index) => ({
                  word: v.word,
                  reading: v.reading,
                  meaningVi: v.meaningVi,
                  exampleJa: v.exampleJa ?? null,
                  exampleKana: v.exampleKana ?? null,
                  exampleVi: v.exampleVi ?? null,
                  sortOrder: index,
                })),
              }
            : undefined,
        },
      });
      globalKanjiChars.add(e.character);
      kanjiAdded++;
    }
  }

  // ─── Grammar expand ────────────────────────────────────────────────
  for (const unit of [...JLPT_GRAMMAR_EXPAND, ...JLPT_GRAMMAR_GAP_FILL]) {
    grammarAdded += await seedGrammarForLesson(prisma, unit, globalGrammarPatterns);
  }

  // ─── Vocab expand units ────────────────────────────────────────────
  const globalVocabKana = new Set(
    (await prisma.vocabulary.findMany({ select: { kana: true } })).map((v) => v.kana),
  );

  for (const unit of [
    ...JLPT_VOCAB_EXPAND,
    ...JLPT_VOCAB_GAP_TOPUP,
    ...JLPT_VOCAB_REVIEW_BOOST,
    ...JLPT_VOCAB_BOOST3_N5,
    ...JLPT_VOCAB_BOOST4_N5,
    ...JLPT_VOCAB_BOOST3_N4,
    ...JLPT_VOCAB_BOOST4_N4,
    ...JLPT_VOCAB_BOOST3_N3,
    ...JLPT_VOCAB_BOOST4_N3_PART1,
    ...JLPT_VOCAB_BOOST4_N3_PART2,
    ...JLPT_VOCAB_BOOST4_N3_PART3,
    ...JLPT_VOCAB_BOOST4_N3_PART4,
    ...JLPT_VOCAB_BOOST4_N3_PART5,
    ...JLPT_VOCAB_BOOST4_N3_PART6,
    ...JLPT_VOCAB_BOOST4_N3_PART7,
    ...JLPT_VOCAB_BOOST4_N3_PART8,
    ...JLPT_VOCAB_BOOST3_N2,
    ...JLPT_VOCAB_BOOST4_N2_PART1,
    ...JLPT_VOCAB_BOOST4_N2_PART2,
    ...JLPT_VOCAB_BOOST4_N2_PART3,
    ...JLPT_VOCAB_BOOST4_N2_PART4,
    ...JLPT_VOCAB_BOOST4_N2_PART5,
    ...JLPT_VOCAB_BOOST4_N2_PART6,
    ...JLPT_VOCAB_BOOST4_N2_PART7,
    ...JLPT_VOCAB_BOOST4_N2_PART8,
    ...JLPT_VOCAB_BOOST4_N2_PART9,
    ...JLPT_VOCAB_BOOST3_N1,
    ...JLPT_VOCAB_BOOST4_N1_PART1,
    ...JLPT_VOCAB_BOOST4_N1_PART2,
    ...JLPT_VOCAB_BOOST4_N1_PART3,
    ...JLPT_VOCAB_BOOST4_N1_PART4,
    ...JLPT_VOCAB_BOOST4_N1_PART5,
    ...JLPT_VOCAB_BOOST4_N1_PART6,
    ...JLPT_VOCAB_BOOST4_N1_PART7,
    ...JLPT_VOCAB_BOOST4_N1_PART8,
    ...JLPT_VOCAB_BOOST4_N1_PART9,
    ...JLPT_VOCAB_BOOST4_N1_PART10,
    ...JLPT_VOCAB_BOOST4_N1_PART11,
    ...JLPT_VOCAB_BOOST4_N1_PART12,
    ...JLPT_VOCAB_BOOST4_N1_PART13,
    ...JLPT_VOCAB_BOOST4_N1_PART14,
    ...JLPT_VOCAB_BOOST4_N1_PART15,
    ...JLPT_VOCAB_BOOST4_N1_PART16,
    ...JLPT_VOCAB_BOOST4_N1_PART17,
    ...JLPT_VOCAB_BOOST4_N1_PART18,
    ...JLPT_VOCAB_BOOST4_N1_PART19,
    ...JLPT_VOCAB_BOOST4_N1_PART20,
    ...JLPT_VOCAB_BOOST4_N1_PART21,
    ...JLPT_VOCAB_BOOST4_N1_PART22,
    ...JLPT_VOCAB_BOOST4_N1_PART23,
    ...JLPT_VOCAB_BOOST5_N3,
    ...JLPT_VOCAB_BOOST5_N2,
    ...JLPT_VOCAB_BOOST5_N1,
  ]) {
    const words = dedupeBy(unit.words, (w) => w.kana);
    const grammarUnit = findGrammarUnit(unit.lessonNumber);
    const title =
      grammarUnit?.title ?? `${unit.jlptLevel} · Từ vựng bổ sung (bài ${unit.lessonNumber})`;
    const sortOrder = grammarUnit?.sortOrder ?? unit.lessonNumber * 10;

    const lesson = await prisma.lesson.upsert({
      where: { lessonNumber: unit.lessonNumber },
      update: { title, jlptLevel: unit.jlptLevel, sortOrder },
      create: { lessonNumber: unit.lessonNumber, title, jlptLevel: unit.jlptLevel, sortOrder },
    });
    if (lesson.createdAt.getTime() === lesson.updatedAt.getTime()) lessonCreated++;

    const existing = await prisma.vocabulary.findMany({
      where: { lessonId: lesson.id },
      select: { kana: true, sortOrder: true },
    });
    const existingKana = new Set(existing.map((v) => v.kana));
    let wordOrder = existing.reduce((max, v) => Math.max(max, v.sortOrder), -1) + 1;

    for (const w of words) {
      if (existingKana.has(w.kana)) continue;
      if (globalVocabKana.has(w.kana)) continue;
      await prisma.vocabulary.create({
        data: {
          kanji: w.kanji ?? null,
          kana: w.kana,
          romaji: w.romaji,
          meaning: w.meaning,
          partOfSpeech: w.partOfSpeech ?? null,
          jlptLevel: unit.jlptLevel,
          exampleJa: w.exampleJa ?? null,
          exampleKana: w.exampleKana ?? null,
          exampleVi: w.exampleVi ?? null,
          sortOrder: wordOrder++,
          lessonId: lesson.id,
        },
      });
      vocabAdded++;
      globalVocabKana.add(w.kana);
    }
  }

  // ─── Bài 405 (vocab + grammar có thể chưa đủ trong DB) ───────────
  const lesson405Grammar = JLPT_GRAMMAR_UNITS.find((g) => g.lessonNumber === 405);
  if (lesson405Grammar) {
    grammarAdded += await seedGrammarForLesson(prisma, lesson405Grammar, globalGrammarPatterns);
  }

  const lesson405Vocab = JLPT_VOCAB_UNITS.find((u) => u.lessonNumber === 405);
  if (lesson405Vocab) {
    const title = lesson405Grammar?.title ?? `${lesson405Vocab.jlptLevel} · Từ vựng (bài 405)`;
    const lesson = await prisma.lesson.upsert({
      where: { lessonNumber: 405 },
      update: { title, jlptLevel: 'N2', sortOrder: 4050 },
      create: { lessonNumber: 405, title, jlptLevel: 'N2', sortOrder: 4050 },
    });
    const existing = await prisma.vocabulary.findMany({
      where: { lessonId: lesson.id },
      select: { kana: true, sortOrder: true },
    });
    const existingKana = new Set(existing.map((v) => v.kana));
    let wordOrder = existing.reduce((max, v) => Math.max(max, v.sortOrder), -1) + 1;
    for (const w of dedupeBy(lesson405Vocab.words, (x) => x.kana)) {
      if (existingKana.has(w.kana)) continue;
      if (globalVocabKana.has(w.kana)) continue;
      await prisma.vocabulary.create({
        data: {
          kanji: w.kanji ?? null,
          kana: w.kana,
          romaji: w.romaji,
          meaning: w.meaning,
          partOfSpeech: w.partOfSpeech ?? null,
          jlptLevel: 'N2',
          exampleJa: w.exampleJa ?? null,
          exampleKana: w.exampleKana ?? null,
          exampleVi: w.exampleVi ?? null,
          sortOrder: wordOrder++,
          lessonId: lesson.id,
        },
      });
      vocabAdded++;
      globalVocabKana.add(w.kana);
    }
  }

  console.log(
    `JLPT expand: +${kanjiAdded} kanji, +${vocabAdded} từ vựng, +${grammarAdded} ngữ pháp (${lessonCreated} lesson mới).`,
  );
}

if (require.main === module) {
  const prisma = new PrismaClient();
  seedJlptExpand(prisma)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
