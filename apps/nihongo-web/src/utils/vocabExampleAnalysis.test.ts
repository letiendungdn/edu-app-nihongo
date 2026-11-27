import { describe, expect, it } from 'vitest';
import { buildExampleAnalysis, type VocabAnalysisTokenMeta } from './vocabExampleAnalysis';

const ANALYSIS_META: VocabAnalysisTokenMeta[] = [
  {
    surface: 'です',
    kind: 'particle',
    reading: 'です',
    romaji: 'desu',
    gloss: 'Động từ copula thể lịch sự (là / thì).',
    pos: 'Hệ từ / đuôi lịch sự',
    detail: 'Polite copula — is / am / are.',
  },
  {
    surface: 'ます',
    kind: 'particle',
    reading: 'ます',
    romaji: 'masu',
    gloss: 'Hậu tố lịch sự của động từ nhóm I/II.',
    pos: 'Hậu tố lịch sự',
    detail: 'Polite verb ending.',
  },
  {
    surface: 'は',
    kind: 'particle',
    reading: 'は',
    romaji: 'wa',
    gloss: 'Trợ từ chủ đề (wa), đánh dấu phần đang nói đến.',
    pos: 'Trợ từ chủ đề',
    detail: 'Topic marker — đánh dấu chủ đề của câu.',
  },
  {
    surface: 'おはようございます',
    kind: 'greeting',
    reading: 'おはようございます',
    romaji: 'ohayou gozaimasu',
    gloss: 'Lời chào buổi sáng lịch sự.',
    pos: 'Câu chào',
    detail: 'Good morning.',
  },
  {
    surface: '私',
    kind: 'common',
    reading: 'わたし',
    romaji: 'watashi',
    gloss: 'Từ đang học: tôi.',
    pos: 'Đại từ',
    detail: 'Tôi (I, me)',
  },
  {
    surface: '学生',
    kind: 'common',
    reading: 'がくせい',
    romaji: 'gakusei',
    gloss: 'Học sinh, sinh viên.',
    pos: 'Danh từ',
    detail: 'Học sinh, sinh viên.',
  },
  {
    surface: '方',
    kind: 'common',
    reading: 'かた',
    romaji: 'kata',
    gloss: 'Vị / người (kính ngữ).',
    pos: 'Danh từ kính ngữ',
    detail: 'Person (polite)',
  },
  {
    surface: '人',
    kind: 'common',
    reading: 'ひと',
    romaji: 'hito',
    gloss: 'Người.',
    pos: 'Danh từ',
    detail: 'Person / people',
  },
  {
    surface: '誰',
    kind: 'common',
    reading: 'だれ',
    romaji: 'dare',
    gloss: 'Ai? Người nào?',
    pos: 'Đại từ nghi vấn',
    detail: 'Ai? Người nào?',
  },
  {
    surface: 'ねこ',
    kind: 'common',
    reading: 'ねこ',
    romaji: 'neko',
    gloss: 'Mèo.',
    pos: 'Danh từ',
    detail: 'Cat',
  },
  {
    surface: '木村',
    kind: 'common',
    reading: 'きむら',
    romaji: 'kimura',
    gloss: 'Họ Kimura.',
    pos: 'Tên riêng',
    detail: 'Family name: Kimura',
  },
];

function analyze(
  ja: string,
  kana: string,
  vi: string,
  focus?: { kanji?: string | null; meaning?: string | null },
) {
  return buildExampleAnalysis(ja, kana, vi, focus, ANALYSIS_META);
}

describe('buildExampleAnalysis', () => {
  it('tạo lede + cấu trúc cho 私は学生です。', () => {
    const analysis = analyze(
      '私は学生です。',
      'わたしはがくせいです。',
      'Tôi là học sinh.',
      { kanji: '学生', meaning: 'học sinh' },
    );

    expect(analysis.lede).toContain('私は学生です。');
    expect(analysis.typedRomaji).toMatch(/Wa-ta-shi wa ga-ku-sei de-su/i);
    expect(analysis.lede).toContain('Tôi là học sinh.');
    expect(analysis.kanjiChars).toEqual(expect.arrayContaining(['私', '学', '生']));
    expect(analysis.cards.map((c) => c.surface)).toEqual(['私', 'は', '学生', 'です']);

    const student = analysis.parts.find((p) => p.surface === '学生');
    expect(student?.reading).toBe('がくせい');
    expect(student?.pos).toBe('Danh từ');

    const wa = analysis.parts.find((p) => p.surface === 'は');
    expect(wa?.kind).toBe('particle');
    expect(wa?.romaji).toBe('wa');
    expect(wa?.gloss).toMatch(/chủ đề/i);
  });

  it('keeps the geminated consonant in the alternate reading にじゅっさい', () => {
    const analysis = analyze(
      '二十歳になりました。',
      'にじゅっさいに なりました。',
      'Tôi đã tròn 20 tuổi.',
    );

    expect(analysis.typedRomaji).toContain('Ni-ju-ssai');
  });

  it('phân tích được câu có khoảng trắng trong kana CSDL', () => {
    const analysis = analyze(
      'あの方は木村さんです。',
      'あの かたは きむらさん です。',
      'Vị kia là chị Kimura.',
      { kanji: '方', meaning: 'người kia (kính ngữ)' },
    );

    expect(analysis.cards.map((c) => c.surface)).toEqual(
      expect.arrayContaining(['方', 'は', '木村', 'です']),
    );
    expect(analysis.typedRomaji.toLowerCase()).toMatch(/ka-?ta/);
    expect(analysis.typedRomaji.toLowerCase()).toMatch(/ki-?mu-?ra/);
    const kata = analysis.cards.find((c) => c.surface === '方');
    expect(kata?.reading).toBe('かた');
    expect(analysis.cards.length).toBeGreaterThanOrEqual(4);
  });

  it('không coi は trong lời chào おはようございます là trợ từ chủ đề', () => {
    const analysis = analyze(
      '皆さん、おはようございます。',
      'みなさん、おはようございます。',
      'Chào buổi sáng mọi người.',
    );

    expect(analysis.cards.map((c) => c.surface)).not.toContain('は');
    expect(analysis.cards.map((c) => c.surface)).toContain('おはようございます');
    const greeting = analysis.cards.find((c) => c.surface === 'おはようございます');
    expect(greeting?.pos).toBe('Câu chào');
    expect(greeting?.romaji).toBe('ohayou gozaimasu');
    expect(analysis.typedRomaji).toContain('ohayou gozaimasu');
  });

  it('dùng nghĩa tiếng Việt cho từng kanji và ưu tiên nghĩa của từ đang học', () => {
    const analysis = analyze(
      '人は誰ですか。',
      'ひとはだれですか。',
      'Người đó là ai?',
      { kanji: '人', meaning: 'người' },
    );

    expect(analysis.cards.find((part) => part.surface === '人')?.gloss).toBe('người');
    expect(analysis.cards.find((part) => part.surface === '人')?.detail).toBe('người');
    expect(analysis.cards.find((part) => part.surface === '誰')?.reading).toBe('だれ');
    expect(analysis.cards.find((part) => part.surface === '誰')?.gloss).toBe('Ai? Người nào?');
  });

  it('dùng nghĩa và cách đọc từ dữ liệu từ vựng cho từ kana-only và câu thiếu kana', () => {
    const kanaOnly = analyze('ねこです。', '', 'Là mèo.');
    const cat = kanaOnly.cards.find((part) => part.surface === 'ねこ');
    expect(cat?.gloss).toBe('Mèo.');
    expect(cat?.reading).toBe('ねこ');

    const kanjiOnly = analyze('誰', '', 'Ai?', { kanji: null, meaning: null });
    const who = kanjiOnly.cards.find((part) => part.surface === '誰');
    expect(who?.gloss).toBe('Ai? Người nào?');
    expect(who?.reading).toBe('だれ');
  });
});
