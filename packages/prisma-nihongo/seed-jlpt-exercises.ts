import { PrismaClient, type PrismaClient as PrismaClientType } from './generated/client';

/**
 * Sinh Exercise (trắc nghiệm) cho MỌI Lesson N3/N2/N1 đã tồn tại trong DB —
 * kể cả các lesson JLPT bổ sung (boost/expand) đã nạp vào DB,
 * vốn không bao giờ tạo Exercise. Đây là nguồn câu hỏi chính cho mock exam
 * ở sourceMode=GENERATED (xem mock-exams.service.ts).
 *
 * Idempotent: chỉ tạo câu cho từ / mẫu ngữ pháp chưa có câu hỏi trong lesson (so theo
 * nội dung câu hỏi), nên lesson có sẵn một phần bài tập cũng được bù đủ.
 * FORCE_JLPT_EXERCISES_SEED=1 xoá Exercise cũ của các lesson đang xử lý rồi tạo lại.
 */

const DIFFICULTY: Record<'N3' | 'N2' | 'N1', number> = { N3: 2, N2: 3, N1: 4 };

function pickDistractors(pool: string[], answer: string, n: number): string[] {
  const uniq = [...new Set(pool)].filter((x) => x && x !== answer);
  for (let i = uniq.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [uniq[i], uniq[j]] = [uniq[j], uniq[i]];
  }
  return uniq.slice(0, n);
}

function shuffleStrings(arr: string[]): string[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function seedJlptExercises(prisma: PrismaClientType) {
  const force = process.env.FORCE_JLPT_EXERCISES_SEED === '1';
  const levels = ['N3', 'N2', 'N1'] as const;
  let totalCreated = 0;
  let lessonsTouched = 0;
  let lessonsSkipped = 0;

  for (const level of levels) {
    const lessons = await prisma.lesson.findMany({
      where: { jlptLevel: level },
      select: { id: true, lessonNumber: true },
    });
    if (lessons.length === 0) continue;
    const lessonIds = lessons.map((l) => l.id);

    // Pool nhiễu (distractor) dùng chung cho cả cấp độ, để lesson nhỏ vẫn đủ 4 lựa chọn.
    const allVocab = await prisma.vocabulary.findMany({
      where: { lessonId: { in: lessonIds } },
      select: { id: true, lessonId: true, kanji: true, kana: true, meaning: true },
    });
    const meaningPool = allVocab.map((w) => w.meaning).filter((m): m is string => !!m?.trim());

    const allGrammar = await prisma.grammar.findMany({
      where: { lessonId: { in: lessonIds } },
      // Thứ tự cố định: examples[0] phải là cùng một câu trên mọi DB, kể cả DB vừa khôi phục từ SQL
      include: { examples: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] } },
    });
    const viPool = allGrammar.flatMap((g) =>
      g.examples.map((e) => e.vi).filter((v): v is string => !!v?.trim()),
    );

    for (const lesson of lessons) {
      if (force) {
        await prisma.exerciseOption.deleteMany({ where: { exercise: { lessonId: lesson.id } } });
        await prisma.exercise.deleteMany({ where: { lessonId: lesson.id } });
      }
      const existing = await prisma.exercise.findMany({
        where: { lessonId: lesson.id },
        select: { question: true, sortOrder: true },
      });
      const existingQuestions = new Set(existing.map((e) => e.question));
      const createdBefore = totalCreated;

      let exOrder = existing.reduce((max, e) => Math.max(max, e.sortOrder), -1) + 1;
      const mkExercise = async (question: string, answer: string, optionTexts: string[]) => {
        if (optionTexts.length < 2 || existingQuestions.has(question)) return;
        existingQuestions.add(question);
        await prisma.exercise.create({
          data: {
            type: 'MULTIPLE_CHOICE',
            question,
            answer,
            difficulty: DIFFICULTY[level],
            sortOrder: exOrder++,
            lessonId: lesson.id,
            options: {
              create: optionTexts.map((text, oi) => ({
                text,
                isCorrect: text === answer,
                sortOrder: oi,
              })),
            },
          },
        });
        totalCreated += 1;
      };

      const lessonVocab = allVocab.filter((w) => w.lessonId === lesson.id);
      for (const w of lessonVocab) {
        if (!w.meaning?.trim()) continue;
        const head = w.kanji ? `${w.kanji}（${w.kana}）` : w.kana;
        const opts = [w.meaning, ...pickDistractors(meaningPool, w.meaning, 3)];
        await mkExercise(`「${head}」 nghĩa là gì?`, w.meaning, shuffleStrings(opts));
      }

      const lessonGrammar = allGrammar.filter((g) => g.lessonId === lesson.id);
      for (const g of lessonGrammar) {
        const ex = g.examples[0];
        if (!ex?.vi?.trim() || !ex.jp?.trim()) continue;
        const opts = [ex.vi, ...pickDistractors(viPool, ex.vi, 3)];
        await mkExercise(`Câu 「${ex.jp}」 có nghĩa là gì?`, ex.vi, shuffleStrings(opts));
      }

      if (totalCreated > createdBefore) lessonsTouched += 1;
      else lessonsSkipped += 1;
    }
  }

  console.log(
    `JLPT exercises: +${totalCreated} câu hỏi trắc nghiệm trên ${lessonsTouched} lesson ` +
      `(${lessonsSkipped} lesson đã đủ, bỏ qua).`,
  );
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedJlptExercises(prisma);
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
