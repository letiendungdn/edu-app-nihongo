/**
 * Sinh sơ đồ ER (Mermaid) từ schema Prisma của DB nihongo → docs/db-erd.md
 *   npm run db:erd            (ở root; = npm run erd -w @edu/prisma-nihongo)
 * Mỗi phân hệ một sơ đồ; bảng thuộc phân hệ khác chỉ hiện tên (không kèm cột).
 */
import fs from 'node:fs';
import path from 'node:path';

type Field = { name: string; type: string; optional: boolean; list: boolean; attrs: string };
type Model = { name: string; fields: Field[]; doc?: string };

type Domain = { id: string; title: string; note: string; models: string[] };
type DbConfig = { name: string; schema: string; out: string; domains: Domain[] };

const ROOT = path.join(__dirname, '..', '..', '..');

/** Phân hệ → bảng (thứ tự = thứ tự sơ đồ). Bảng mới chưa xếp sẽ vào "Khác" và in cảnh báo. */
const NIHONGO_DOMAINS: Domain[] = [
  {
    id: 'content',
    title: 'Nội dung học',
    note: 'Bài học (Minna, JLPT, giáo trình Sou Matome/Shinkanzen/TRY — `Lesson.textbook`), kanji, đọc hiểu, mind map, danh mục giáo trình.',
    models: [
      'Lesson', 'Vocabulary', 'Grammar', 'Example', 'Exercise', 'ExerciseOption',
      'KanjiLesson', 'KanjiEntry', 'KanjiVocab', 'VocabularyKanjiLink', 'VocabularyExample',
      'ReadingPassage', 'ReadingQuestion', 'ReadingQuestionOption',
      'TextbookSeries', 'TextbookBook', 'MindMapLevel',
    ],
  },
  {
    id: 'jlpt',
    title: 'JLPT: lịch thi, lộ trình, thi thử',
    note: 'Lịch thi Đà Nẵng, lộ trình N5–N1, đề thi thử tùy chỉnh.',
    models: [
      'JlptOrganizer', 'JlptExamFeeInfo', 'JlptExamBriefing', 'JlptExamSession', 'JlptExamVenue', 'JlptExamDaySlot',
      'JlptRoadmapMeta', 'StudyTip', 'JlptRoadmapLevel', 'JlptRoadmapExamSection', 'JlptRoadmapMaterial',
      'JlptRoadmapPhase', 'JlptRoadmapTask',
      'MockExamTemplate', 'MockExamQuestion', 'MockExamQuestionOption',
    ],
  },
  {
    id: 'language-ref',
    title: 'Tham chiếu ngôn ngữ',
    note: 'Bảng kana, đếm số, tên quốc gia, hậu tố, quy tắc phát âm, tiếng Anh ↔ katakana.',
    models: [
      'KanaSection', 'KanaCell', 'KanaRomaji', 'CounterCategory', 'CounterItem', 'CountryRegion', 'CountryNameItem',
      'VocabSuffixGroup', 'VocabSuffixItem',
      'PronunciationRulesMeta', 'PronunciationRuleTip', 'PronunciationRuleSection', 'PronunciationRulePoint', 'PronunciationRuleExample',
      'EnglishKatakanaMeta', 'EnglishKatakanaTip', 'EnglishKatakanaSection', 'EnglishKatakanaPoint',
      'EnglishKatakanaMapping', 'EnglishKatakanaExample',
    ],
  },
  {
    id: 'static',
    title: 'Trang & nội dung tĩnh',
    note: 'Trang chủ, giao tiếp/đóng vai, nghe mỗi ngày, file nghe sách, banner.',
    models: [
      'HomeStat', 'HomeFeatureSection', 'HomeFeatureItem',
      'ConversationIntroLine', 'ConversationIntroSlot', 'ConversationIntroExample', 'ConversationPhraseGroup', 'ConversationPhraseItem',
      'RoleplayScene', 'RoleplayLine',
      'ListeningConfig', 'PodcastResource', 'ListeningPreset',
      'BookAudioMeta', 'BookAudioItem', 'BookAudioDriveFolder', 'BookAudioFile',
      'PageBanner', 'FeatureFlag',
    ],
  },
  {
    id: 'user',
    title: 'Người dùng & xác thực',
    note: 'Tài khoản, token, tùy chọn email, thiết bị push.',
    models: ['User', 'RefreshToken', 'PasswordResetToken', 'EmailVerificationToken', 'EmailPrefs', 'PushDeviceToken'],
  },
  {
    id: 'progress',
    title: 'Tiến độ học',
    note: 'SRS, kết quả thi, nghe, phiên học, streak, nhật ký, mục tiêu ngày; outbox event nộp bài (Kafka).',
    models: [
      'SrsCard', 'ExamResult', 'ExamSectionResult', 'ListeningLog', 'StudySession', 'StudyStreak', 'DailyActivity',
      'ReadingAttempt', 'DictationAttempt', 'DailyNote', 'DailyGoal', 'DailyGoalItem',
      'OutboxEvent', 'ProcessedEvent',
    ],
  },
  {
    id: 'payment',
    title: 'Thanh toán & marketplace coach',
    note: 'Gói thuê bao Stripe, coach, đặt lịch, thanh toán, chi trả, webhook.',
    models: [
      'SubscriptionPlanConfig', 'Subscription', 'CoachProfile', 'CoachAvailability', 'CoachingSession',
      'Payment', 'Payout', 'CoachReview', 'WebhookEvent',
    ],
  },
  {
    id: 'comm',
    title: 'Giao tiếp & thông báo',
    note: 'Chat coaching, thông báo, hỗ trợ, phòng chat cộng đồng, buổi live, email.',
    models: [
      'ChatMessage', 'Notification', 'SupportThread', 'SupportMessage',
      'LearnerChatRoom', 'LearnerChatMember', 'LearnerChatMessage', 'LiveSession',
      'EmailBroadcast', 'EmailTemplate',
    ],
  },
];

const DBS: DbConfig[] = [
  {
    name: 'nihongo',
    schema: 'packages/prisma-nihongo/schema.prisma',
    out: 'docs/db-erd.md',
    domains: NIHONGO_DOMAINS,
  },
];

function parseSchema(src: string) {
  const models: Model[] = [];
  const enums: Array<{ name: string; values: string[] }> = [];
  const lines = src.split(/\r?\n/);
  let doc: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('///')) {
      doc.push(line.slice(3).trim());
      continue;
    }
    const m = /^(model|enum)\s+(\w+)\s*\{/.exec(line);
    if (!m) {
      if (line) doc = [];
      continue;
    }
    const body: string[] = [];
    for (i++; i < lines.length && lines[i].trim() !== '}'; i++) body.push(lines[i].trim());
    if (m[1] === 'enum') {
      enums.push({ name: m[2], values: body.filter((l) => /^\w+$/.test(l)) });
    } else {
      const fields: Field[] = [];
      for (const l of body) {
        if (!l || l.startsWith('//') || l.startsWith('@@')) continue;
        const f = /^(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$/.exec(l);
        if (f) fields.push({ name: f[1], type: f[2], list: Boolean(f[3]), optional: Boolean(f[4]), attrs: f[5] });
      }
      models.push({ name: m[2], fields, doc: doc.join(' ') || undefined });
    }
    doc = [];
  }
  return { models, enums };
}

const SCALAR: Record<string, string> = {
  Int: 'int', BigInt: 'bigint', Float: 'float', Decimal: 'decimal', String: 'string',
  Boolean: 'bool', DateTime: 'datetime', Json: 'json', Bytes: 'bytes',
};

function attrType(f: Field, enumNames: Set<string>): string {
  const base = SCALAR[f.type] ?? (enumNames.has(f.type) ? f.type : f.type);
  return f.list ? `${base}_list` : base;
}

function build({ name, schema, out: outRel, domains: DOMAINS }: DbConfig) {
  const OUT = path.join(ROOT, outRel);
  const { models, enums } = parseSchema(fs.readFileSync(path.join(ROOT, schema), 'utf8'));
  const modelNames = new Set(models.map((m) => m.name));
  const enumNames = new Set(enums.map((e) => e.name));
  const byName = new Map(models.map((m) => [m.name, m]));

  const assigned = new Set(DOMAINS.flatMap((d) => d.models));
  const unknown = DOMAINS.flatMap((d) => d.models).filter((n) => !modelNames.has(n));
  if (unknown.length) throw new Error(`DOMAINS nhắc tới bảng không có trong schema: ${unknown.join(', ')}`);
  const other = models.map((m) => m.name).filter((n) => !assigned.has(n));
  if (other.length) console.warn(`⚠ Bảng chưa xếp phân hệ (đưa vào "Khác"): ${other.join(', ')}`);
  const domains = other.length
    ? [...DOMAINS, { id: 'other', title: 'Khác', note: 'Bảng chưa được xếp phân hệ trong packages/prisma-nihongo/scripts/gen-erd.ts.', models: other }]
    : DOMAINS;

  /** Quan hệ: bảng con (giữ FK) → bảng cha */
  type Rel = { child: string; parent: string; label: string; optional: boolean; oneToOne: boolean };
  const rels: Rel[] = [];
  for (const m of models) {
    for (const f of m.fields) {
      if (!modelNames.has(f.type) || f.list) continue;
      const fk = /@relation\([^)]*fields:\s*\[([^\]]+)\]/.exec(f.attrs);
      if (!fk) continue; // phía còn lại của quan hệ 1-1
      const fkNames = fk[1].split(',').map((s) => s.trim());
      const fkFields = fkNames.map((n) => m.fields.find((x) => x.name === n)!).filter(Boolean);
      const oneToOne = fkFields.length === 1 && /@unique\b/.test(fkFields[0].attrs);
      rels.push({ child: m.name, parent: f.type, label: f.name, optional: f.optional, oneToOne });
    }
  }
  const fkSet = new Set<string>();
  for (const m of models) {
    for (const f of m.fields) {
      const fk = /@relation\([^)]*fields:\s*\[([^\]]+)\]/.exec(f.attrs);
      if (fk) fk[1].split(',').forEach((n) => fkSet.add(`${m.name}.${n.trim()}`));
    }
  }

  const entity = (m: Model, full: boolean) => {
    if (!full) return `  ${m.name} {\n    string ref "→ xem phân hệ khác"\n  }`;
    const cols = m.fields
      .filter((f) => !modelNames.has(f.type))
      .map((f) => {
        const keys = [
          /@id\b/.test(f.attrs) ? 'PK' : '',
          fkSet.has(`${m.name}.${f.name}`) ? 'FK' : '',
          /@unique\b/.test(f.attrs) ? 'UK' : '',
        ].filter(Boolean);
        const note = f.optional ? ' "null"' : '';
        return `    ${attrType(f, enumNames)} ${f.name}${keys.length ? ` ${keys.join(', ')}` : ''}${note}`;
      });
    return `  ${m.name} {\n${cols.join('\n')}\n  }`;
  };

  const rel = (r: Rel) => {
    const parentSide = r.optional ? 'o|' : '||';
    const childSide = r.oneToOne ? '|o' : '}o';
    return `  ${r.parent} ${parentSide}--${childSide} ${r.child} : ${r.label}`;
  };

  const sections = domains.map((d) => {
    const own = new Set(d.models);
    const related = rels.filter((r) => own.has(r.child) || own.has(r.parent));
    const external = [...new Set(related.flatMap((r) => [r.child, r.parent]).filter((n) => !own.has(n)))].sort();
    const tables = d.models.map((n) => byName.get(n)!);
    const docs = tables
      .filter((t) => t.doc)
      .map((t) => `- **${t.name}** — ${t.doc}`)
      .join('\n');
    return [
      `## ${d.title}`,
      '',
      `${d.note} (${d.models.length} bảng${external.length ? `; liên kết ngoài: ${external.map((e) => `\`${e}\``).join(', ')}` : ''})`,
      '',
      '```mermaid',
      'erDiagram',
      ...tables.map((t) => entity(t, true)),
      ...external.map((n) => entity(byName.get(n)!, false)),
      ...related.map(rel),
      '```',
      ...(docs ? ['', docs] : []),
      '',
    ].join('\n');
  });

  const enumTable = enums
    .map((e) => `| \`${e.name}\` | ${e.values.map((v) => `\`${v}\``).join(' · ')} |`)
    .join('\n');

  const out = [
    `# Sơ đồ ER — DB ${name}`,
    '',
    `> **Tự sinh** từ \`${schema}\` bởi \`npm run db:erd\`.`,
    '> Đừng sửa tay — sửa schema (hoặc cách chia phân hệ trong `packages/prisma-nihongo/scripts/gen-erd.ts`) rồi chạy lại.',
    '',
    `**${models.length} bảng · ${enums.length} enum · ${rels.length} quan hệ khóa ngoại.**`,
    'Ký hiệu: `PK` khóa chính · `FK` khóa ngoại · `UK` duy nhất · `"null"` cho phép null · `_list` mảng (Postgres array).',
    'Bảng thu gọn (`→ xem phân hệ khác`) thuộc phân hệ khác, chỉ vẽ để thấy liên kết.',
    '',
    '## Mục lục',
    '',
    ...domains.map((d) => `- [${d.title}](#${d.title.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/ /g, '-')}) — ${d.models.length} bảng`),
    '',
    ...sections,
    '## Enum',
    '',
    '| Enum | Giá trị |',
    '|------|---------|',
    enumTable,
    '',
  ].join('\n');

  fs.writeFileSync(OUT, out);
  console.log(`[${name}] Đã ghi ${outRel}: ${models.length} bảng, ${enums.length} enum, ${rels.length} quan hệ, ${domains.length} sơ đồ.`);
}

DBS.forEach(build);
