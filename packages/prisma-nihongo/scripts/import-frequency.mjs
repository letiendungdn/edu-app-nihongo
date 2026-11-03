/**
 * Điền tần suất sử dụng thật (báo chí) cho từ vựng và kanji, dùng cho "Nội dung dễ ra":
 *   - Vocabulary.frequencyRank ← JMdict (nf01–nf48: nhóm 500 từ hay gặp nhất trên báo Mainichi;
 *     news1/ichi1/spec1 = thông dụng; news2/ichi2/spec2 = ít hơn)
 *   - KanjiEntry.frequency     ← KANJIDIC2 <freq> (hạng 1–2500 trên báo chí)
 *
 *   node packages/prisma-nihongo/scripts/import-frequency.mjs   → ghi scripts/frequency.sql
 *
 * Dữ liệu JMdict / KANJIDIC2 © Electronic Dictionary Research and Development Group (EDRDG),
 * giấy phép CC BY-SA 4.0 — https://www.edrdg.org/edrdg/licence.html
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = path.join(ROOT, 'packages/prisma-nihongo/scripts/frequency.sql');
const CACHE = path.join(os.tmpdir(), 'nihongo-edrdg');
const SOURCES = {
  jmdict: 'http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz',
  kanjidic: 'http://www.edrdg.org/kanjidic/kanjidic2.xml.gz',
};

async function load(name) {
  fs.mkdirSync(CACHE, { recursive: true });
  const file = path.join(CACHE, `${name}.gz`);
  if (!fs.existsSync(file)) {
    const res = await fetch(SOURCES[name]);
    if (!res.ok) throw new Error(`${res.status} ${SOURCES[name]}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return zlib.gunzipSync(fs.readFileSync(file)).toString('utf8');
}

/** Hạng xấp xỉ từ các nhãn ưu tiên của JMdict (số nhỏ = hay gặp hơn). */
function rankFromPri(pris) {
  let best = null;
  for (const p of pris) {
    let r = null;
    const nf = /^nf(\d\d)$/.exec(p);
    if (nf) r = (Number(nf[1]) - 1) * 500 + 250;
    else if (/^(news1|ichi1|spec1|gai1)$/.test(p)) r = 12000;
    else if (/^(news2|ichi2|spec2|gai2)$/.test(p)) r = 20000;
    if (r != null && (best == null || r < best)) best = r;
  }
  return best;
}

const clean = (s) => s.replace(/[\s～〜~（）()［］[\]]/g, '');

const jmdict = await load('jmdict');
const byKanji = new Map();
const byKana = new Map();
for (const m of jmdict.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
  const body = m[1];
  for (const k of body.matchAll(/<k_ele>([\s\S]*?)<\/k_ele>/g)) {
    const keb = /<keb>([^<]+)<\/keb>/.exec(k[1])?.[1];
    const rank = rankFromPri([...k[1].matchAll(/<ke_pri>([^<]+)<\/ke_pri>/g)].map((x) => x[1]));
    if (keb && rank != null && !(byKanji.get(keb) <= rank)) byKanji.set(keb, rank);
  }
  for (const r of body.matchAll(/<r_ele>([\s\S]*?)<\/r_ele>/g)) {
    const reb = /<reb>([^<]+)<\/reb>/.exec(r[1])?.[1];
    const rank = rankFromPri([...r[1].matchAll(/<re_pri>([^<]+)<\/re_pri>/g)].map((x) => x[1]));
    if (reb && rank != null && !(byKana.get(reb) <= rank)) byKana.set(reb, rank);
  }
}

const kanjidic = await load('kanjidic');
const kanjiFreq = new Map();
for (const m of kanjidic.matchAll(/<character>\s*<literal>([^<]+)<\/literal>[\s\S]*?<\/character>/g)) {
  const freq = /<freq>(\d+)<\/freq>/.exec(m[0])?.[1];
  if (freq) kanjiFreq.set(m[1], Number(freq));
}

function query(sql) {
  const out = execSync('docker exec -i edu-postgres-nihongo psql -U nihongo -d nihongo -At', {
    input: `SELECT coalesce(json_agg(t), '[]') FROM (${sql}) t;`, encoding: 'utf8', maxBuffer: 1 << 28,
  });
  return JSON.parse(out.trim());
}

const vocab = query(`SELECT id, kanji, kana FROM "Vocabulary"`);
const kanji = query(`SELECT id, character FROM "KanjiEntry"`);
let sql = '-- Tần suất từ JMdict / KANJIDIC2 (© EDRDG, CC BY-SA 4.0) — scripts/import-frequency.mjs\nBEGIN;\nUPDATE "Vocabulary" SET "frequencyRank" = NULL;\nUPDATE "KanjiEntry" SET frequency = NULL;\n';
const groups = new Map();
let vHit = 0;
for (const v of vocab) {
  const k = v.kanji && /[一-龯々]/.test(v.kanji) ? clean(v.kanji) : null;
  const rank = k ? byKanji.get(k) ?? null : byKana.get(clean(v.kana)) ?? byKanji.get(clean(v.kana)) ?? null;
  if (rank == null) continue;
  vHit++;
  if (!groups.has(rank)) groups.set(rank, []);
  groups.get(rank).push(v.id);
}
for (const [rank, ids] of groups) sql += `UPDATE "Vocabulary" SET "frequencyRank" = ${rank} WHERE id IN (${ids.join(',')});\n`;
const kGroups = new Map();
let kHit = 0;
for (const k of kanji) {
  const f = kanjiFreq.get(k.character);
  if (!f) continue;
  kHit++;
  if (!kGroups.has(f)) kGroups.set(f, []);
  kGroups.get(f).push(k.id);
}
for (const [f, ids] of kGroups) sql += `UPDATE "KanjiEntry" SET frequency = ${f} WHERE id IN (${ids.join(',')});\n`;
sql += 'COMMIT;\n';
fs.writeFileSync(OUT, sql);
console.log(`JMdict: ${byKanji.size} kanji forms, ${byKana.size} kana forms có nhãn tần suất`);
console.log(`Từ vựng có tần suất: ${vHit}/${vocab.length} · Kanji có tần suất: ${kHit}/${kanji.length}`);
