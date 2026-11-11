/**
 * Điền (và tính lại) cột Vocabulary.furigana cho mọi từ (từ thêm/sửa sau này content-service tự tính).
 *
 * Run (thư mục packages/prisma-nihongo, cần DATABASE_URL): npx tsx scripts/vocab-enrich/furigana.ts
 */
import { PrismaClient } from '../../generated/client';
import { toFurigana } from '../../../nest-common/src/utils/furigana';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.vocabulary.findMany({
    select: { id: true, kanji: true, kana: true, furigana: true },
  });
  let filled = 0;
  let unmatched = 0;
  let changed = 0;
  for (const r of rows) {
    const seg = toFurigana(r.kanji, r.kana);
    if (seg) filled++;
    else if (r.kanji && /[\u4e00-\u9fff]/.test(r.kanji)) unmatched++;
    // Từ sửa chữ/cách đọc xong không còn tách được thì xóa furigana cũ, không để lệch
    const json = seg ? JSON.stringify(seg) : null;
    if (json !== r.furigana) {
      await prisma.vocabulary.update({ where: { id: r.id }, data: { furigana: json } });
      changed++;
    }
  }
  console.log(`có furigana: ${filled}; có kanji mà không tách được: ${unmatched}; đã cập nhật: ${changed}`);
}

main().finally(() => prisma.$disconnect());
