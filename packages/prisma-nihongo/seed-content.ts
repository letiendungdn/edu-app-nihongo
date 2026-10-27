import { PrismaClient } from './generated/client';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const SQL_PATH = path.join(
  __dirname,
  '../../infra/postgres/nihongo-content-seed.sql',
);

async function clearContentTables(prisma: PrismaClient) {
  await prisma.mockExamTemplate.deleteMany(); // câu hỏi + đáp án xóa theo (cascade)
  await prisma.bookAudioFile.deleteMany();
  await prisma.bookAudioDriveFolder.deleteMany();
  await prisma.bookAudioItem.deleteMany();
  await prisma.bookAudioMeta.deleteMany();
  await prisma.kanaRomaji.deleteMany();
  await prisma.mindMapLevel.deleteMany();
  await prisma.englishKatakanaExample.deleteMany();
  await prisma.englishKatakanaMapping.deleteMany();
  await prisma.englishKatakanaPoint.deleteMany();
  await prisma.englishKatakanaSection.deleteMany();
  await prisma.englishKatakanaTip.deleteMany();
  await prisma.englishKatakanaMeta.deleteMany();
  await prisma.roleplayLine.deleteMany();
  await prisma.roleplayScene.deleteMany();
  await prisma.conversationPhraseItem.deleteMany();
  await prisma.conversationPhraseGroup.deleteMany();
  await prisma.conversationIntroExample.deleteMany();
  await prisma.conversationIntroSlot.deleteMany();
  await prisma.conversationIntroLine.deleteMany();
  await prisma.homeFeatureItem.deleteMany();
  await prisma.homeFeatureSection.deleteMany();
  await prisma.homeStat.deleteMany();
  await prisma.countryNameItem.deleteMany();
  await prisma.countryRegion.deleteMany();
  await prisma.vocabularyKanjiLink.deleteMany();
  await prisma.vocabularyExample.deleteMany();
  await prisma.example.deleteMany();
  await prisma.exerciseOption.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.grammar.deleteMany();
  await prisma.vocabulary.deleteMany();
  await prisma.kanjiVocab.deleteMany();
  await prisma.kanjiEntry.deleteMany();
  await prisma.kanjiLesson.deleteMany();
  await prisma.readingQuestionOption.deleteMany();
  await prisma.readingQuestion.deleteMany();
  await prisma.readingPassage.deleteMany();
  await prisma.jlptRoadmapTask.deleteMany();
  await prisma.jlptRoadmapPhase.deleteMany();
  await prisma.jlptRoadmapMaterial.deleteMany();
  await prisma.jlptRoadmapExamSection.deleteMany();
  await prisma.jlptRoadmapLevel.deleteMany();
  await prisma.studyTip.deleteMany();
  await prisma.jlptRoadmapMeta.deleteMany();
  await prisma.jlptExamDaySlot.deleteMany();
  await prisma.jlptExamVenue.deleteMany();
  await prisma.jlptExamSession.deleteMany();
  await prisma.jlptExamBriefing.deleteMany();
  await prisma.jlptExamFeeInfo.deleteMany();
  await prisma.jlptOrganizer.deleteMany();
  await prisma.listeningPreset.deleteMany();
  await prisma.podcastResource.deleteMany();
  await prisma.listeningConfig.deleteMany();
  await prisma.counterItem.deleteMany();
  await prisma.counterCategory.deleteMany();
  await prisma.kanaCell.deleteMany();
  await prisma.kanaSection.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.textbookBook.deleteMany();
  await prisma.textbookSeries.deleteMany();
}

/** Database + user đích lấy từ DATABASE_URL — trước đây hard-code "nihongo" nên seed luôn ghi vào DB chính. */
function targetDb(): { database: string; user: string } {
  const url = process.env.DATABASE_URL;
  if (!url) return { database: 'nihongo', user: 'nihongo' };
  const parsed = new URL(url);
  return {
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'nihongo',
    user: decodeURIComponent(parsed.username) || 'nihongo',
  };
}

function runSqlFile(filePath: string) {
  const container = process.env.POSTGRES_CONTAINER ?? 'edu-postgres-nihongo';
  const sql = fs.readFileSync(filePath, 'utf8');
  const { database, user } = targetDb();
  // --single-transaction: lỗi giữa chừng thì rollback hết (dump có DISABLE TRIGGER, không được để dở).
  const psqlArgs = '-v ON_ERROR_STOP=1 --single-transaction';

  try {
    execSync(`docker exec -i ${container} psql -U ${user} -d ${database} ${psqlArgs}`, {
      input: sql,
      stdio: ['pipe', 'inherit', 'inherit'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return;
  } catch {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Không chạy được docker psql và thiếu DATABASE_URL');
    execSync(`psql ${psqlArgs}`, {
      input: sql,
      env: { ...process.env, PGDATABASE: url },
      stdio: ['pipe', 'inherit', 'inherit'],
      maxBuffer: 64 * 1024 * 1024,
    });
  }
}

/**
 * Dump chèn id cố định; setval trong dump có thể cũ hơn dữ liệu (vd Vocabulary: seq 29660, max id 29675)
 * → các seed sau bị trùng khóa chính. Đặt lại mọi sequence của cột "id" = max(id) thực tế.
 */
async function resyncIdSequences(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT table_name AS tbl,
               pg_get_serial_sequence(format('public.%I', table_name), 'id') AS seq
        FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'id'
          AND column_default LIKE 'nextval(%'
      LOOP
        EXECUTE format(
          'SELECT setval(%L, COALESCE((SELECT max(id) FROM public.%I), 1), (SELECT max(id) FROM public.%I) IS NOT NULL)',
          r.seq, r.tbl, r.tbl
        );
      END LOOP;
    END $$;
  `);
}

export async function seedContent(prisma: PrismaClient) {
  const lessonCount = await prisma.lesson.count();
  const force = process.env.FORCE_CONTENT_SEED === '1';

  if (lessonCount > 0 && !force) {
    console.log(
      `Nội dung học đã có trong DB (${lessonCount} bài). Bỏ qua import SQL.`,
    );
    console.log('  FORCE_CONTENT_SEED=1 để ghi đè từ infra/postgres/nihongo-content-seed.sql');
    return;
  }

  if (!fs.existsSync(SQL_PATH)) {
    throw new Error(
      `Thiếu ${SQL_PATH}. Chạy: npm run db:export-content (cần Docker postgres đang chạy)`,
    );
  }

  if (lessonCount > 0) {
    console.log('FORCE_CONTENT_SEED: xóa nội dung học cũ...');
    await clearContentTables(prisma);
  }

  console.log('Import nội dung học từ SQL...');
  runSqlFile(SQL_PATH);
  await resyncIdSequences(prisma);

  const [lessons, vocab, kanji] = await Promise.all([
    prisma.lesson.count(),
    prisma.vocabulary.count(),
    prisma.kanjiEntry.count(),
  ]);
  console.log(`Nội dung: ${lessons} bài, ${vocab} từ vựng, ${kanji} kanji.`);
}
