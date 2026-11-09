#!/usr/bin/env node
/**
 * Đánh giá hỏi đáp ngữ pháp (RAG): phần TÌM NGUỒN (không gọi AI, rẻ) cho các câu đúng chủ đề,
 * và phần TỪ CHỐI (gọi AI thật) cho các câu ngoài phạm vi.
 *
 *   node services/api-gateway/scripts/grammar-qa-eval.mjs [baseUrl]
 *
 * Mặc định baseUrl = http://localhost:8080, đăng nhập bằng admin dev. In:
 * - hit@1, hit@5: tỷ lệ câu hỏi có mẫu đúng ở vị trí 1 / trong 5 nguồn đầu
 * - MRR: trung bình 1/(vị trí mẫu đúng)
 * - câu ngoài phạm vi: hỏi AI thật (POST /ask), phải ra grounded=false (không trích nguồn nào).
 *   Chỉ dùng ngưỡng điểm thì không đủ: câu hỏi thời tiết có điểm ~0,53, cao hơn vài câu đúng chủ đề.
 * Thoát mã 1 nếu hit@5 < 0.8 hoặc có câu ngoài phạm vi được trả lời như có nguồn: dùng được làm kiểm tra hồi quy
 * khi đổi model embedding, cách ghép nội dung hay trọng số xếp hạng.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = (process.argv[2] ?? 'http://localhost:8080').replace(/\/$/, '');
const minScore = Number(process.env.GRAMMAR_QA_MIN_SCORE) || 0.45;
const here = path.dirname(fileURLToPath(import.meta.url));
const { questions, offTopic } = JSON.parse(readFileSync(path.join(here, 'grammar-qa-eval.json'), 'utf8'));

const login = await (
  await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.EVAL_EMAIL ?? 'admin@nihongo.local', password: process.env.EVAL_PASSWORD ?? 'admin123' }),
  })
).json();
const token = (login.data ?? login).access_token;
if (!token) {
  console.error('Không đăng nhập được:', JSON.stringify(login).slice(0, 200));
  process.exit(2);
}

async function search(q) {
  const res = await fetch(`${base}/api/ai/grammar-qa/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  return (body.data ?? body).sources;
}

let hit1 = 0;
let hit5 = 0;
let rr = 0;
console.log('Câu hỏi'.padEnd(46), 'Vị trí', ' Điểm ', ' Nguồn đầu tiên');
for (const { q, expect } of questions) {
  const re = new RegExp(expect);
  const sources = await search(q);
  // DB lưu mẫu có khoảng trắng (「V た ことが あります」): bỏ khoảng trắng trước khi so.
  const pos = sources.findIndex((s) => re.test(s.pattern.replace(/\s+/g, '')) || re.test(s.meaning));
  if (pos === 0) hit1++;
  if (pos >= 0) {
    hit5++;
    rr += 1 / (pos + 1);
  }
  console.log(
    q.slice(0, 44).padEnd(46),
    (pos >= 0 ? String(pos + 1) : '✗').padStart(6),
    sources[0]?.score.toFixed(3).padStart(6),
    ' ' + (sources[0]?.pattern ?? '').slice(0, 40),
  );
}

console.log('\nNgoài phạm vi (hỏi AI thật, phải ra grounded=false):');
let offFail = 0;
for (const q of offTopic) {
  const res = await fetch(`${base}/api/ai/grammar-qa/ask`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: q }),
  });
  const body = await res.json();
  const out = body.data ?? body;
  const ok = res.ok && out.grounded === false;
  if (!ok) offFail++;
  const how = out.model ? 'AI từ chối' : 'dưới ngưỡng, không gọi AI';
  console.log(`  ${ok ? '✓' : '✗'} ${q}  →  ${ok ? how : JSON.stringify(out).slice(0, 120)}`);
}

const n = questions.length;
const summary = { hit1: +(hit1 / n).toFixed(2), hit5: +(hit5 / n).toFixed(2), mrr: +(rr / n).toFixed(2), offTopicPassed: `${offTopic.length - offFail}/${offTopic.length}` };
console.log('\nKết quả:', JSON.stringify(summary));
process.exit(summary.hit5 < 0.8 || offFail > 0 ? 1 : 0);
