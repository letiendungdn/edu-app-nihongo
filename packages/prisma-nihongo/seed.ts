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
  const analysisTokens = [
    ['は','particle','は','wa','Trợ từ chủ đề (wa), đánh dấu phần đang nói đến.','Trợ từ chủ đề','Topic marker — đánh dấu chủ đề của câu.'],
    ['が','particle','が','ga','Trợ từ chủ ngữ / nhấn mạnh đối tượng.','Trợ từ chủ ngữ','Subject / focus marker.'],
    ['を','particle','を','o','Trợ từ tân ngữ trực tiếp (o), đối tượng của hành động.','Trợ từ tân ngữ','Direct object marker.'],
    ['に','particle','に','ni','Trợ từ đích / thời điểm / đối tượng gián tiếp.','Trợ từ','Destination / time / indirect object.'],
    ['で','particle','で','de','Trợ từ nơi diễn ra hành động hoặc phương tiện.','Trợ từ','Place of action / means.'],
    ['と','particle','と','to','Trợ từ “với / và” hoặc mở phần trích dẫn.','Trợ từ','With / and / quotation.'],
    ['も','particle','も','mo','Trợ từ “cũng”.','Trợ từ','Also / too.'],
    ['へ','particle','へ','e','Trợ từ hướng đi (e).','Trợ từ hướng','Direction marker (e).'],
    ['から','particle','から','kara','Trợ từ “từ / vì”.','Trợ từ','From / because.'],
    ['まで','particle','まで','made','Trợ từ “đến / tới”.','Trợ từ','Until / to.'],
    ['より','particle','より','yori','Trợ từ so sánh “hơn”.','Trợ từ','Than (comparison).'],
    ['の','particle','の','no','Trợ từ sở hữu / liên kết danh từ.','Trợ từ sở hữu','Possessive / noun linker.'],
    ['です','particle','です','desu','Động từ copula thể lịch sự (là / thì).','Hệ từ / đuôi lịch sự','Polite copula — is / am / are.'],
    ['ます','particle','ます','masu','Hậu tố lịch sự của động từ nhóm I/II.','Hậu tố lịch sự','Polite verb ending.'],
    ['でした','particle','でした','deshita','Thể quá khứ lịch sự của です.','Hệ từ quá khứ','Past polite copula.'],
    ['ません','particle','ません','masen','Phủ định lịch sự của động từ -masu.','Phủ định lịch sự','Polite negative verb ending.'],
    ['おはようございます','greeting','おはようございます','ohayou gozaimasu','Lời chào buổi sáng lịch sự.','Câu chào','Good morning.'],
    ['こんにちは','greeting','こんにちは','konnichiwa','Lời chào buổi trưa / xin chào.','Câu chào','Hello / good afternoon.'],
    ['こんばんは','greeting','こんばんは','konbanwa','Lời chào buổi tối.','Câu chào','Good evening.'],
    ['私','common','わたし','watashi','Từ đang học: tôi.','Đại từ','Tôi (I, me) · Kanji: Tư (riêng tư, cá nhân)'],
    ['学生','common','がくせい','gakusei','Học sinh, sinh viên.','Danh từ','Học sinh, sinh viên (student)'],
    ['先生','common','せんせい','sensei','Thầy giáo, cô giáo.','Danh từ','Teacher'],
    ['人','common','ひと','hito','Người.','Danh từ','Person / people'],
    ['日本','common','にほん','nihon','Nhật Bản.','Danh từ','Japan'],
    ['本','common','ほん','hon','Sách.','Danh từ','Book'],
    ['方','common','かた','kata','Vị / người (kính ngữ).','Danh từ kính ngữ','Person (polite) — かた'],
    ['木村','common','きむら','kimura','Họ Kimura (tên người).','Tên riêng','Family name: Kimura'],
  ] as const;
  for (const [index, token] of analysisTokens.entries()) {
    const [surface, kind, reading, romaji, gloss, pos, detail] = token;
    await prisma.vocabAnalysisToken.upsert({
      where: { surface },
      update: { kind, reading, romaji, gloss, pos, detail, sortOrder: index },
      create: { surface, kind, reading, romaji, gloss, pos, detail, sortOrder: index },
    });
  }
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
