/**
 * Xoá bản ghi trùng từ vựng / ngữ pháp / kanji trong DB.
 * Ưu tiên giữ Minna (bài 1–50 / kanji 1–32), bản đầy đủ hơn.
 *
 * Run: npx tsx scripts/dedupe-jlpt-content.ts
 * Dry-run: npx tsx scripts/dedupe-jlpt-content.ts --dry-run
 */
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function vocabKey(v: { kana: string; kanji: string | null; meaning: string }): string {
  return `${v.kana}\0${v.kanji ?? ''}\0${norm(v.meaning)}`;
}

function meaningKey(v: { kana: string; meaning: string }): string {
  return `${v.kana}\0${norm(v.meaning)}`;
}

function scoreVocab(
  v: {
    id: number;
    kanji: string | null;
    _count: { examples: number };
    jlptLevel: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
  },
  lessonNumber: number,
): number {
  let s = 0;
  if (lessonNumber <= 50) s += 10_000;
  if (v._count.examples) s += 100;
  if (v.kanji) s += 50;
  if (v.audioUrl) s += 20;
  if (v.imageUrl) s += 10;
  if (v.jlptLevel) s += 5;
  s -= v.id / 1_000_000; // tie-break: lower id
  return s;
}

function scoreKanjiEntry(
  e: {
    id: number;
    hanViet: string | null;
    onyomi: string | null;
    kunyomi: string | null;
    mnemonicVi: string | null;
    _count: { vocabularies: number };
  },
  lessonNumber: number,
): number {
  let s = 0;
  if (lessonNumber <= 32) s += 10_000;
  if (e.onyomi) s += 50;
  if (e.kunyomi) s += 50;
  if (e.hanViet) s += 30;
  if (e.mnemonicVi) s += 20;
  s += e._count.vocabularies * 5;
  s -= e.id / 1_000_000;
  return s;
}

function scoreGrammar(
  g: { id: number; explanation: string | null; _count: { examples: number } },
  lessonNumber: number,
): number {
  let s = 0;
  if (lessonNumber <= 50) s += 10_000;
  s += g._count.examples * 10;
  if (g.explanation) s += 50;
  s -= g.id / 1_000_000;
  return s;
}

async function dedupeVocabulary(): Promise<number> {
  const rows = await prisma.vocabulary.findMany({
    include: {
      lesson: { select: { lessonNumber: true } },
      _count: { select: { examples: true } },
    },
    orderBy: { id: 'asc' },
  });

  const byExact = new Map<string, typeof rows>();
  const byKanaMeaning = new Map<string, typeof rows>();

  for (const v of rows) {
    const ek = vocabKey(v);
    if (!byExact.has(ek)) byExact.set(ek, []);
    byExact.get(ek)!.push(v);

    const mk = meaningKey(v);
    if (!byKanaMeaning.has(mk)) byKanaMeaning.set(mk, []);
    byKanaMeaning.get(mk)!.push(v);
  }

  const toDelete = new Set<number>();
  const keepMap = new Map<number, number>(); // deletedId -> keeperId

  // 1) Trùng y hệt kana + kanji + nghĩa
  for (const group of byExact.values()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort(
      (a, b) =>
        scoreVocab(b, b.lesson.lessonNumber) - scoreVocab(a, a.lesson.lessonNumber),
    );
    const keeper = sorted[0]!;
    for (const v of sorted.slice(1)) {
      toDelete.add(v.id);
      keepMap.set(v.id, keeper.id);
    }
  }

  // 2) Cùng kana + nghĩa (bỏ qua kanji khác nhau nếu cả hai đều có kanji — đồng âm)
  for (const group of byKanaMeaning.values()) {
    if (group.length <= 1) continue;
    const alive = group.filter((v) => !toDelete.has(v.id));
    if (alive.length <= 1) continue;

    const withKanji = alive.filter((v) => v.kanji);
    if (withKanji.length >= 2 && new Set(withKanji.map((v) => v.kanji)).size >= 2) {
      continue; // đồng âm khác kanji
    }

    const sorted = [...alive].sort(
      (a, b) =>
        scoreVocab(b, b.lesson.lessonNumber) - scoreVocab(a, a.lesson.lessonNumber),
    );
    const keeper = sorted[0]!;
    for (const v of sorted.slice(1)) {
      toDelete.add(v.id);
      keepMap.set(v.id, keeper.id);
    }
  }

  const deleteIds = [...toDelete];
  if (!deleteIds.length) return 0;

  console.log(`\n── Từ vựng: xoá ${deleteIds.length} bản ghi trùng ──`);

  if (!dryRun) {
    for (const [fromId, toId] of keepMap) {
      await prisma.dictationAttempt.updateMany({
        where: { vocabId: fromId },
        data: { vocabId: toId },
      });
    }
    await prisma.vocabulary.deleteMany({ where: { id: { in: deleteIds } } });
  }

  return deleteIds.length;
}

async function dedupeKanji(): Promise<number> {
  const rows = await prisma.kanjiEntry.findMany({
    include: {
      lesson: { select: { lessonNumber: true } },
      _count: { select: { vocabularies: true } },
    },
    orderBy: { id: 'asc' },
  });

  const byChar = new Map<string, typeof rows>();
  for (const e of rows) {
    if (!byChar.has(e.character)) byChar.set(e.character, []);
    byChar.get(e.character)!.push(e);
  }

  const toDelete = new Set<number>();
  const mergePlans: { fromId: number; toId: number; vocabs: { word: string; reading: string; meaningVi: string }[] }[] =
    [];

  for (const group of byChar.values()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort(
      (a, b) =>
        scoreKanjiEntry(b, b.lesson.lessonNumber) - scoreKanjiEntry(a, a.lesson.lessonNumber),
    );
    const keeper = sorted[0]!;
    for (const e of sorted.slice(1)) {
      toDelete.add(e.id);
      const vocabs = await prisma.kanjiVocab.findMany({
        where: { kanjiEntryId: e.id },
        select: { word: true, reading: true, meaningVi: true },
      });
      if (vocabs.length) mergePlans.push({ fromId: e.id, toId: keeper.id, vocabs });
    }
  }

  const deleteIds = [...toDelete];
  if (!deleteIds.length) return 0;

  console.log(`\n── Kanji: xoá ${deleteIds.length} bản ghi trùng character ──`);

  if (!dryRun) {
    for (const plan of mergePlans) {
      const existing = await prisma.kanjiVocab.findMany({
        where: { kanjiEntryId: plan.toId },
        select: { word: true, reading: true, meaningVi: true },
      });
      const keys = new Set(existing.map((v) => `${v.word}\0${v.reading}\0${norm(v.meaningVi)}`));
      let sortOrder = existing.length;
      for (const v of plan.vocabs) {
        const k = `${v.word}\0${v.reading}\0${norm(v.meaningVi)}`;
        if (keys.has(k)) continue;
        keys.add(k);
        await prisma.kanjiVocab.create({
          data: {
            kanjiEntryId: plan.toId,
            word: v.word,
            reading: v.reading,
            meaningVi: v.meaningVi,
            sortOrder: sortOrder++,
          },
        });
      }
    }
    await prisma.kanjiEntry.deleteMany({ where: { id: { in: deleteIds } } });
  }

  return deleteIds.length;
}

async function dedupeGrammar(): Promise<number> {
  const rows = await prisma.grammar.findMany({
    include: {
      lesson: { select: { lessonNumber: true } },
      _count: { select: { examples: true } },
    },
    orderBy: { id: 'asc' },
  });

  const byPattern = new Map<string, typeof rows>();
  for (const g of rows) {
    const key = norm(g.pattern);
    if (!byPattern.has(key)) byPattern.set(key, []);
    byPattern.get(key)!.push(g);
  }

  const toDelete = new Set<number>();
  for (const group of byPattern.values()) {
    if (group.length <= 1) continue;
    const sorted = [...group].sort(
      (a, b) =>
        scoreGrammar(b, b.lesson.lessonNumber) - scoreGrammar(a, a.lesson.lessonNumber),
    );
    for (const g of sorted.slice(1)) toDelete.add(g.id);
  }

  const deleteIds = [...toDelete];
  if (!deleteIds.length) return 0;

  console.log(`\n── Ngữ pháp: xoá ${deleteIds.length} bản ghi trùng pattern ──`);

  if (!dryRun) {
    await prisma.grammar.deleteMany({ where: { id: { in: deleteIds } } });
  }

  return deleteIds.length;
}

async function main() {
  console.log(`\n=== DEDUPE JLPT CONTENT${dryRun ? ' (dry-run)' : ''} ===`);

  const before = {
    vocab: await prisma.vocabulary.count(),
    grammar: await prisma.grammar.count(),
    kanji: await prisma.kanjiEntry.count(),
  };

  const nVocab = await dedupeVocabulary();
  const nKanji = await dedupeKanji();
  const nGrammar = await dedupeGrammar();

  const after = {
    vocab: await prisma.vocabulary.count(),
    grammar: await prisma.grammar.count(),
    kanji: await prisma.kanjiEntry.count(),
  };

  console.log('\n── Kết quả ──');
  console.log(
    `  Từ vựng: ${before.vocab} → ${after.vocab} (−${dryRun ? nVocab : before.vocab - after.vocab})`,
  );
  console.log(
    `  Kanji:   ${before.kanji} → ${after.kanji} (−${dryRun ? nKanji : before.kanji - after.kanji})`,
  );
  console.log(
    `  Ngữ pháp: ${before.grammar} → ${after.grammar} (−${dryRun ? nGrammar : before.grammar - after.grammar})`,
  );
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
