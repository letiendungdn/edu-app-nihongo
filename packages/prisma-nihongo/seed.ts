import { PrismaClient } from './generated/client';
import { seedContent } from './seed-content';
import { seedJlptExercises } from './seed-jlpt-exercises';
import { seedListeningPresetsExpand } from './seed-listening-presets-expand';
import { seedMockExamRecent } from './seed-mock-exam-recent';
import { seedKanaRomaji } from './seed-kana-romaji';
import { seedBookAudio } from './seed-book-audio';
import { seedBookAudioOfficial } from './seed-book-audio-official';
import { seedTextbooks } from './seed-textbooks';
import { seedSubscriptionPlans } from './seed-plans';
import { seedVocabSuffixes } from './seed-vocab-suffixes';
import { seedKanjiVocabExamples } from './seed-kanji-vocab-examples';
import { seedJlptTags } from './seed-jlpt-tags';
import { seedMockExamTemplates } from './seed-mock-exam-templates';

const prisma = new PrismaClient();

async function main() {
  // Nội dung học (từ vựng, câu ví dụ, kanji, ngữ pháp, JLPT, hội thoại, sơ đồ…) nạp từ
  // infra/postgres/nihongo-content-seed.sql — DB là nguồn gốc, không còn file .data.ts.
  await seedContent(prisma);
  await seedJlptExercises(prisma);
  await seedListeningPresetsExpand(prisma);
  await seedJlptTags(prisma);
  await seedMockExamTemplates(prisma);
  await seedMockExamRecent(prisma);
  await seedKanaRomaji(prisma);
  await seedBookAudio(prisma);
  await seedBookAudioOfficial(prisma);
  await seedTextbooks(prisma);
  await seedSubscriptionPlans(prisma);
  await seedVocabSuffixes(prisma);
  await seedKanjiVocabExamples(prisma);
  console.log('\nSeeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
