/**
 * Báo cáo khoảng trống từ vựng / kanji / ngữ pháp so với mục tiêu JLPT tham khảo.
 *
 *   npm run jlpt:gap-report -w @edu/prisma-nihongo
 */
import { PrismaClient, type JlptLevel } from '../generated/client';
import {
  JLPT_GRAMMAR_CUMULATIVE,
  JLPT_KANJI_CUMULATIVE,
  JLPT_VOCAB_CUMULATIVE,
} from '../jlpt-targets';

const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

function printLevelTable(
  label: string,
  map: Map<JlptLevel, number>,
  targets: Record<JlptLevel, number>,
) {
  console.log(`\n── ${label} ──`);
  console.log('Cấp | Trong DB | Tích lũy DB | Mục tiêu tích lũy | Thiếu');
  let cum = 0;
  for (const level of LEVELS) {
    const count = map.get(level) ?? 0;
    cum += count;
    const target = targets[level];
    const gap = Math.max(0, target - cum);
    console.log(
      `${level.padEnd(3)} | ${String(count).padStart(7)} | ${String(cum).padStart(11)} | ${String(target).padStart(17)} | ${gap}`,
    );
  }
}

async function main() {
  const prisma = new PrismaClient();

  // Đếm theo view *Unique: cùng một từ / kanji / mẫu ở nhiều sách chỉ tính một lần (cấp dễ nhất).
  type LevelRow = { jlptLevel: JlptLevel | null; n: number };
  const byLevel = (rows: LevelRow[]) => {
    const map = new Map<JlptLevel, number>();
    for (const row of rows) if (row.jlptLevel) map.set(row.jlptLevel, row.n);
    return map;
  };
  const [vocabRows, kanjiRows, grammarRows] = await Promise.all([
    prisma.$queryRaw<LevelRow[]>`SELECT "jlptLevel", count(*)::int AS n FROM "VocabularyUnique" GROUP BY 1`,
    prisma.$queryRaw<LevelRow[]>`SELECT "jlptLevel", count(*)::int AS n FROM "KanjiUnique" GROUP BY 1`,
    prisma.$queryRaw<LevelRow[]>`SELECT "jlptLevel", count(*)::int AS n FROM "GrammarUnique" GROUP BY 1`,
  ]);
  const vocabMap = byLevel(vocabRows);
  const kanjiMap = byLevel(kanjiRows);
  const grammarMap = byLevel(grammarRows);
  const sum = (rows: LevelRow[]) => rows.reduce((a, r) => a + r.n, 0);
  const untagged = (rows: LevelRow[]) => rows.find((r) => !r.jlptLevel)?.n ?? 0;
  const [rawVocab, rawKanji, rawGrammar] = await Promise.all([
    prisma.vocabulary.count(),
    prisma.kanjiEntry.count(),
    prisma.grammar.count(),
  ]);

  console.log('\n=== JLPT GAP REPORT (tham khảo) ===\n');
  console.log(`Từ vựng:  ${sum(vocabRows)} từ khác nhau (${rawVocab} dòng, ${untagged(vocabRows)} chưa gắn JLPT)`);
  console.log(`Kanji:    ${sum(kanjiRows)} chữ khác nhau (${rawKanji} dòng)`);
  console.log(`Ngữ pháp: ${sum(grammarRows)} mẫu khác nhau (${rawGrammar} dòng, ${untagged(grammarRows)} chưa gắn JLPT)`);

  printLevelTable('Từ vựng theo cấp', vocabMap, JLPT_VOCAB_CUMULATIVE);
  printLevelTable('Kanji theo cấp', kanjiMap, JLPT_KANJI_CUMULATIVE);
  printLevelTable('Ngữ pháp theo cấp', grammarMap, JLPT_GRAMMAR_CUMULATIVE);

  console.log('\nGhi chú:');
  console.log('- Số đã gộp trùng giữa các sách (view VocabularyUnique / KanjiUnique / GrammarUnique), cấp = cấp dễ nhất.\n- Minna bài 1–25 ≈ N5, 26–50 ≈ N4; Sou Matome / Shinkanzen / TRY! / KLL bổ sung N3–N1.');
  console.log('- Mục tiêu là ước lượng ôn thi, không phải list chính thức JLPT.');
  console.log('- Chạy seed:jlpt-tags để gắn nhãn Minna; thêm nội dung N2/N1 vào DB rồi npm run db:export-content.\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
