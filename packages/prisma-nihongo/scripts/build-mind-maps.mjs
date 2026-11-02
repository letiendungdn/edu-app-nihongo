/**
 * Sinh lại 15 sơ đồ tư duy (VOCAB / GRAMMAR / KANJI × N5–N1) từ dữ liệu thật trong DB,
 * để mọi mục đều có trong DB và trỏ đúng bài / đúng chữ.
 *
 *   node packages/prisma-nihongo/scripts/build-mind-maps.mjs   → ghi scripts/mind-maps.sql
 *
 * Từ vựng: 8 nhóm chủ đề gộp từ các bài "Từ vựng bổ sung". Ngữ pháp: N3–N1 theo bài chủ đề,
 * N5/N4 theo nhóm 5 bài Minna. Kanji: theo bộ thủ (cây KanjiVG + bảng KanjiComponent).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(ROOT, 'packages/prisma-nihongo/scripts/mind-maps.sql');
const INDEX = path.join(ROOT, 'apps/nihongo-web/public/media/kanji-components.json');
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
const MAX_ITEMS = 80;

function query(sql) {
  const out = execSync(`docker exec -i edu-postgres-nihongo psql -U nihongo -d nihongo -At`, { input: `SELECT coalesce(json_agg(t), '[]') FROM (${sql}) t;`, encoding: 'utf8', maxBuffer: 1 << 28 });
  return JSON.parse(out.trim());
}

/** Lấy tối đa n phần tử rải đều trong danh sách (giữ thứ tự bài). */
function spread(list, n) {
  if (list.length <= n) return list;
  return Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]);
}

// ── Ngữ pháp
const MINNA_GROUPS = {
  N5: [
    [1, 5, 'Câu cơ bản, chỉ định, nơi chốn, giờ giấc, đi lại', '基本文'],
    [6, 10, 'Tân ngữ, rủ rê, cho nhận, tính từ, tồn tại', '動詞・形容詞'],
    [11, 15, 'Số đếm, so sánh, mong muốn, thể て', 'て形'],
    [16, 20, 'Nối câu, thể ない, khả năng, kinh nghiệm, thể thường', '普通形'],
    [21, 25, 'Trích dẫn, bổ nghĩa danh từ, khi, cho nhận hành động, điều kiện', '名詞修飾・条件'],
  ],
  N4: [
    [26, 30, 'Giải thích, thể khả năng, đồng thời, trạng thái', 'んです・可能形'],
    [31, 35, 'Ý định, lời khuyên, mệnh lệnh, điều kiện ば', '意向形・条件'],
    [36, 40, 'Mục đích, thay đổi, bị động, danh từ hóa, nguyên nhân', '受身・ので'],
    [41, 45, 'Cho nhận kính ngữ, mục đích, dáng vẻ, mức độ', '授受・様子'],
    [46, 50, 'Thời điểm, truyền đạt, sai khiến, kính ngữ', '使役・敬語'],
  ],
};
// ── Từ vựng
const VOCAB_GROUPS = [
  { id: 'people', label: 'Con người & cảm xúc', labelJa: '人と心', topics: ['Con người & quan hệ', 'Cơ thể & sức khỏe', 'Cảm xúc & tính cách'] },
  { id: 'think', label: 'Suy nghĩ & khái niệm', labelJa: '考え・概念', topics: ['Suy nghĩ & giao tiếp', 'Khái niệm trừu tượng', 'Khái niệm & đời sống'] },
  { id: 'society', label: 'Công việc & xã hội', labelJa: '仕事・社会', topics: ['Công việc & kinh tế', 'Xã hội & pháp luật', 'Xã hội, kinh tế & pháp luật'] },
  { id: 'culture', label: 'Học tập & văn hóa', labelJa: '学び・文化', topics: ['Học tập & khoa học', 'Văn hóa & giải trí', 'Văn chương & ngôn ngữ', 'Công nghệ & truyền thông'] },
  { id: 'life', label: 'Đời sống hằng ngày', labelJa: '生活', topics: ['Nhà cửa & sinh hoạt', 'Ăn uống', 'Đi lại & nơi chốn', 'Chủ đề khác'] },
  { id: 'nature', label: 'Tự nhiên, thời gian & số lượng', labelJa: '自然・時間', topics: ['Thiên nhiên & thời tiết', 'Thời gian', 'Số lượng & mức độ'] },
  { id: 'action', label: 'Hành động & trạng thái', labelJa: '動き・様子', topics: ['Hành động & thay đổi', 'Trạng thái & tính chất', 'Động từ', 'Tính từ & trạng thái'] },
  { id: 'adverb', label: 'Phó từ, thành ngữ & từ ngoại lai', labelJa: '副詞・表現', topics: ['Phó từ & từ nối', 'Thành ngữ bốn chữ', 'Từ ngoại lai'] },
];
const vocabRows = query(`
  SELECT l."jlptLevel" AS level, l."lessonNumber" AS lesson,
         regexp_replace(regexp_replace(l.title, '^N\\d · Từ vựng bổ sung( 2)? · ', ''), ' \\(\\d+/\\d+\\)$', '') AS topic,
         coalesce(v.kanji, v.kana) AS word, v.meaning
  FROM "Vocabulary" v JOIN "Lesson" l ON l.id = v."lessonId"
  WHERE l.title LIKE '%Từ vựng bổ sung%'
  ORDER BY l."lessonNumber", v."sortOrder", v.id`);

const minnaVocab = query(`
  SELECT l."jlptLevel" AS level, l."lessonNumber" AS lesson, coalesce(v.kanji, v.kana) AS word, v.meaning
  FROM "Vocabulary" v JOIN "Lesson" l ON l.id = v."lessonId"
  WHERE l.textbook = 'MINNA' AND l."lessonNumber" BETWEEN 1 AND 50
  ORDER BY l."lessonNumber", v."sortOrder", v.id`);

/** N5/N4: từ Minna không chia chủ đề → thêm nhánh theo nhóm 5 bài (tên theo MINNA_GROUPS). */
const MINNA_VOCAB_GROUPS = {
  N5: [[1, 12, 'みんなの日本語 I（前半）'], [13, 25, 'みんなの日本語 I（後半）']],
  N4: [[26, 37, 'みんなの日本語 II（前半）'], [38, 50, 'みんなの日本語 II（後半）']],
};

function minnaVocabBranches(level) {
  return (MINNA_VOCAB_GROUPS[level] ?? []).map(([from, to, labelJa]) => {
    const seen = new Set();
    const words = minnaVocab.filter((r) => r.lesson >= from && r.lesson <= to && !seen.has(r.word) && seen.add(r.word));
    return { id: `v-${level.toLowerCase()}-minna-${from}`, label: `Minna bài ${from}–${to}`, labelJa, hint: `${words.length} từ trong giáo trình Minna`, patterns: spread(words, MAX_ITEMS).map((r) => ({ pattern: r.word, meaning: r.meaning, lessonNumber: r.lesson })) };
  }).filter((b) => b.patterns.length);
}

function vocabMap(level) {
  const rows = vocabRows.filter((r) => r.level === level);
  const unknown = [...new Set(rows.map((r) => r.topic))].filter((t) => !VOCAB_GROUPS.some((g) => g.topics.includes(t)));
  if (unknown.length) throw new Error(`Chủ đề chưa xếp nhóm (${level}): ${unknown.join(', ')}`);
  return VOCAB_GROUPS.map((g) => {
    const seen = new Set();
    const words = rows.filter((r) => g.topics.includes(r.topic) && !seen.has(r.word) && seen.add(r.word));
    return {
      id: `v-${level.toLowerCase()}-${g.id}`,
      label: g.label,
      labelJa: g.labelJa,
      hint: `${words.length} từ · ${g.topics.filter((t) => rows.some((r) => r.topic === t)).join(', ')}`,
      patterns: spread(words, MAX_ITEMS).map((r) => ({ pattern: r.word, meaning: r.meaning, lessonNumber: r.lesson })),
    };
  }).filter((b) => b.patterns.length).concat(minnaVocabBranches(level));
}

const grammarRows = query(`
  SELECT l."jlptLevel" AS level, l."lessonNumber" AS lesson, l.title, g.pattern, g.meaning
  FROM "Grammar" g JOIN "Lesson" l ON l.id = g."lessonId"
  WHERE l.textbook IS NULL OR l.textbook = 'MINNA'
  ORDER BY l."lessonNumber", g."sortOrder", g.id`);

function grammarMap(level) {
  const rows = grammarRows.filter((r) => r.level === level);
  const item = (r) => ({ pattern: r.pattern, meaning: r.meaning, lessonNumber: r.lesson });
  let branches;
  if (MINNA_GROUPS[level]) {
    branches = MINNA_GROUPS[level].map(([from, to, label, labelJa]) => {
      const list = rows.filter((r) => r.lesson >= from && r.lesson <= to);
      return { id: `g-${level.toLowerCase()}-${from}`, label: `Minna bài ${from}–${to}`, labelJa, hint: `${label} · ${list.length} mẫu`, patterns: list.map(item) };
    });
  } else {
    const themed = [...new Set(rows.filter((r) => / — /.test(r.title)).map((r) => r.lesson))];
    branches = themed.map((lesson) => {
      const list = rows.filter((r) => r.lesson === lesson);
      const [, theme] = list[0].title.split(' — ');
      return { id: `g-${level.toLowerCase()}-${lesson}`, label: theme, labelJa: `第${lesson % 100}課`, hint: `Bài ${lesson} · ${list.length} mẫu`, patterns: list.map(item) };
    });
  }
  const extra = rows.filter((r) => /Ngữ pháp bổ sung/.test(r.title));
  if (extra.length) branches.push({ id: `g-${level.toLowerCase()}-extra`, label: 'Mẫu bổ sung', labelJa: '補足', hint: `${extra.length} mẫu ngoài giáo trình chính`, patterns: extra.map(item) });
  return branches.filter((b) => b.patterns.length);
}

// ── Kanji theo bộ thủ
const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const components = Object.fromEntries(query(`SELECT component, "hanViet", "nameJp", "isRadical" FROM "KanjiComponent"`).map((c) => [c.component, c]));
const kanjiRows = query(`
  SELECT k.character, min(k."jlptLevel") AS level, min(k."hanViet") AS hv, min(k."meaningVi") AS meaning
  FROM "KanjiEntry" k WHERE k."jlptLevel" IS NOT NULL GROUP BY k.character`);
const rank = (r) => (r === 'general' ? 3 : r === 'tradit' ? 2 : r ? 1 : 0);
function radicalOf(char) {
  const root = index[char];
  if (!root) return null;
  let best = null;
  const walk = (n) => { if (n.e && rank(n.r) > rank(best?.r)) best = n; n.c?.forEach(walk); };
  root.c?.forEach(walk);
  if (best) return best.e;
  return root.r ? char : null;
}
function kanjiMap(level) {
  const rows = kanjiRows.filter((r) => r.level === level);
  const groups = new Map();
  for (const r of rows) {
    const key = radicalOf(r.character) ?? '?';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const top = [...groups.entries()].filter(([k, list]) => k !== '?' && list.length >= 3).sort((a, b) => b[1].length - a[1].length).slice(0, 9);
  const topKeys = new Set(top.map(([k]) => k));
  const item = (r) => ({ pattern: r.character, meaning: `${r.hv ? `${r.hv.toUpperCase()} — ` : ''}${r.meaning}`, href: `/kanji/structure?c=${encodeURIComponent(r.character)}`, linkLabel: 'Cấu tạo' });
  const branches = top.map(([key, list]) => {
    const c = components[key];
    const name = c ? (c.isRadical ? `Bộ ${c.hanViet}` : c.hanViet) : key;
    return { id: `k-${level.toLowerCase()}-${key.codePointAt(0).toString(16)}`, label: `${name} ${key}`, labelJa: c?.nameJp ?? key, hint: `${list.length} chữ có bộ ${key}`, patterns: list.map(item) };
  });
  const rest = rows.filter((r) => !topKeys.has(radicalOf(r.character) ?? '?'));
  if (rest.length) branches.push({ id: `k-${level.toLowerCase()}-other`, label: 'Bộ khác', labelJa: 'その他', hint: `${rest.length} chữ thuộc các bộ ít gặp hơn`, patterns: rest.map(item) });
  return branches;
}

// ── Ghi SQL
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
let sql = '-- Sơ đồ tư duy sinh từ DB (scripts/build-mind-maps.mjs). Ghi đè branches + summary, giữ title/accent.\nBEGIN;\n';
const stats = [];
for (const [kind, build, unit] of [['VOCAB', vocabMap, 'từ'], ['GRAMMAR', grammarMap, 'mẫu'], ['KANJI', kanjiMap, 'chữ']]) {
  for (const level of LEVELS) {
    const branches = build(level);
    const total = branches.reduce((a, b) => a + b.patterns.length, 0);
    stats.push(`${kind} ${level}: ${branches.length} nhánh, ${total} ${unit}`);
    const summary = `${branches.length} nhánh · ${total} ${unit} lấy từ dữ liệu bài học — bấm một mục để mở đúng bài.`;
    sql += `UPDATE "MindMapLevel" SET branches = ${q(JSON.stringify(branches))}::jsonb, summary = ${q(summary)}, "updatedAt" = CURRENT_TIMESTAMP WHERE kind = '${kind}' AND level = '${level}';\n`;
  }
}
sql += 'COMMIT;\n';
fs.writeFileSync(OUT, sql);
console.log(stats.join('\n'));
