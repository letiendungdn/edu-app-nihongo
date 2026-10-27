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

  const vocabByLevel = await prisma.vocabulary.groupBy({
    by: ['jlptLevel'],
    _count: { _all: true },
    where: { jlptLevel: { not: null } },
  });

  const kanjiByLevel = await prisma.kanjiEntry.groupBy({
    by: ['jlptLevel'],
    _count: { _all: true },
    where: { jlptLevel: { not: null } },
  });

  const grammarByLevel = await prisma.grammar.groupBy({
    by: ['jlptLevel'],
    _count: { _all: true },
    where: { jlptLevel: { not: null } },
  });

  const untaggedVocab = await prisma.vocabulary.count({ where: { jlptLevel: null } });
  const untaggedGrammar = await prisma.grammar.count({ where: { jlptLevel: null } });
  const totalVocab = await prisma.vocabulary.count();
  const totalKanji = await prisma.kanjiEntry.count();
  const totalGrammar = await prisma.grammar.count();

  const vocabMap = new Map<JlptLevel, number>();
  for (const row of vocabByLevel) {
    if (row.jlptLevel) vocabMap.set(row.jlptLevel, row._count._all);
  }

  const kanjiMap = new Map<JlptLevel, number>();
  for (const row of kanjiByLevel) {
    if (row.jlptLevel) kanjiMap.set(row.jlptLevel, row._count._all);
  }

  const grammarMap = new Map<JlptLevel, number>();
  for (const row of grammarByLevel) {
    if (row.jlptLevel) grammarMap.set(row.jlptLevel, row._count._all);
  }

  console.log('\n=== JLPT GAP REPORT (tham khảo) ===\n');
  console.log(`Tổng từ vựng:  ${totalVocab} (${untaggedVocab} chưa gắn JLPT)`);
  console.log(`Tổng kanji:    ${totalKanji}`);
  console.log(`Tổng ngữ pháp: ${totalGrammar} (${untaggedGrammar} chưa gắn JLPT)`);

  printLevelTable('Từ vựng theo cấp', vocabMap, JLPT_VOCAB_CUMULATIVE);
  printLevelTable('Kanji theo cấp', kanjiMap, JLPT_KANJI_CUMULATIVE);
  printLevelTable('Ngữ pháp theo cấp', grammarMap, JLPT_GRAMMAR_CUMULATIVE);

  console.log('\nGhi chú:');
  console.log('- Minna bài 1–50 ≈ N5→N2; JLPT seed (bài 301+) ≈ N3/N2/N1 bổ sung.');
  console.log('- Mục tiêu là ước lượng ôn thi, không phải list chính thức JLPT.');
  console.log('- Chạy seed:jlpt-tags để gắn nhãn Minna; thêm nội dung N2/N1 vào DB rồi npm run db:export-content.\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
